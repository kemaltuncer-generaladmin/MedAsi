import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/rag/admin";
import { ensureOsceSchema } from "@/lib/db/schema-guard";

export const dynamic = "force-dynamic";

/* ─── GET: List scenarios with optional filters ─── */

export async function GET(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  await ensureOsceSchema();

  const status = req.nextUrl.searchParams.get("status")?.trim().toLowerCase() || "pending";
  const specialty = req.nextUrl.searchParams.get("specialty")?.trim() || null;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      status: string;
      specialty: string;
      difficulty: string;
      casePayload: unknown;
      anonymizedFields: unknown;
      createdAt: Date;
      createdBy: string | null;
      approvedAt: Date | null;
    }>
  >`
    SELECT
      s.id,
      s.status,
      s.specialty,
      s.difficulty,
      s.case_payload as "casePayload",
      s.anonymized_fields as "anonymizedFields",
      s.created_at as "createdAt",
      s.created_by as "createdBy",
      s.approved_at as "approvedAt"
    FROM public.osce_scenarios s
    WHERE s.status = ${status}
      AND (${specialty}::text IS NULL OR lower(s.specialty) = lower(${specialty}))
    ORDER BY s.created_at DESC
    LIMIT 200
  `;

  return NextResponse.json({ scenarios: rows });
}

/* ─── POST: Create a new scenario (admin-authored, directly into pool) ─── */

export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  let body: {
    casePayload?: Record<string, unknown>;
    status?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const casePayload = body.casePayload;
  if (!casePayload || typeof casePayload !== "object") {
    return NextResponse.json({ error: "casePayload gerekli." }, { status: 400 });
  }

  const specialty = String(casePayload.specialty || "").trim();
  const difficulty = String(casePayload.difficulty || "orta").trim();
  const targetStatus = body.status === "pending" ? "pending" : "approved";

  if (!specialty) {
    return NextResponse.json({ error: "Uzmanlık alanı (specialty) gerekli." }, { status: 400 });
  }

  await ensureOsceSchema();

  // Build anonymized version (no patient name)
  const anonymized = {
    ...(casePayload as Record<string, unknown>),
    patient: {
      ...(typeof casePayload.patient === "object" && casePayload.patient !== null ? casePayload.patient : {}),
      name: undefined,
    },
  };

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO public.osce_scenarios (
      status, specialty, difficulty, case_payload, anonymized_fields, created_by,
      approved_by, approved_at
    )
    VALUES (
      ${targetStatus},
      ${specialty},
      ${difficulty},
      ${casePayload as unknown as object}::jsonb,
      ${anonymized as unknown as object}::jsonb,
      ${admin.userId},
      ${targetStatus === "approved" ? admin.userId : null},
      ${targetStatus === "approved" ? new Date() : null}
    )
    RETURNING id
  `;

  return NextResponse.json({ ok: true, scenarioId: rows[0]?.id ?? null });
}

/* ─── PATCH: Update scenario status or content ─── */

export async function PATCH(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  let body: {
    scenarioId?: string;
    decision?: "approved" | "rejected";
    rejectionReason?: string;
    casePayload?: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scenarioId = (body.scenarioId || "").trim();
  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId gerekli." }, { status: 400 });
  }

  await ensureOsceSchema();

  // If casePayload is provided, update the content too
  if (body.casePayload && typeof body.casePayload === "object") {
    const casePayload = body.casePayload;
    const specialty = String(casePayload.specialty || "").trim();
    const difficulty = String(casePayload.difficulty || "orta").trim();

    const anonymized = {
      ...casePayload,
      patient: {
        ...(typeof casePayload.patient === "object" && casePayload.patient !== null ? casePayload.patient : {}),
        name: undefined,
      },
    };

    await prisma.$executeRaw`
      UPDATE public.osce_scenarios
      SET case_payload = ${casePayload as unknown as object}::jsonb,
          anonymized_fields = ${anonymized as unknown as object}::jsonb,
          specialty = ${specialty || undefined},
          difficulty = ${difficulty || undefined},
          status = ${body.decision || "approved"},
          approved_by = ${admin.userId},
          approved_at = now(),
          updated_at = now()
      WHERE id = ${scenarioId}
    `;

    return NextResponse.json({ ok: true });
  }

  // Status-only update
  const decision = body.decision;
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "decision (approved/rejected) gerekli." }, { status: 400 });
  }

  await prisma.$executeRaw`
    UPDATE public.osce_scenarios
    SET status = ${decision},
        approved_by = ${admin.userId},
        approved_at = CASE WHEN ${decision} = 'approved' THEN now() ELSE NULL END,
        rejection_reason = CASE
          WHEN ${decision} = 'rejected' THEN ${body.rejectionReason ?? null}
          ELSE NULL
        END,
        updated_at = now()
    WHERE id = ${scenarioId}
  `;

  return NextResponse.json({ ok: true });
}

/* ─── DELETE: Remove a scenario ─── */

export async function DELETE(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  let body: { scenarioId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scenarioId = (body.scenarioId || "").trim();
  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId gerekli." }, { status: 400 });
  }

  await ensureOsceSchema();

  // Delete linked materials first
  await prisma.$executeRaw`
    DELETE FROM public.osce_scenario_material_links WHERE scenario_id = ${scenarioId}
  `;

  // Delete skill gaps for sessions of this scenario
  await prisma.$executeRaw`
    DELETE FROM public.osce_skill_gaps
    WHERE session_id IN (
      SELECT id FROM public.osce_sessions WHERE case_id IN (
        SELECT (case_payload->>'caseId')::text FROM public.osce_scenarios WHERE id = ${scenarioId}
      )
    )
  `;

  // Delete the scenario
  await prisma.$executeRaw`
    DELETE FROM public.osce_scenarios WHERE id = ${scenarioId}
  `;

  return NextResponse.json({ ok: true });
}

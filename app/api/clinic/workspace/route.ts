import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type ClinicPatient = {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  complaint: string;
  diagnosis?: string;
  status: "active" | "discharged";
  createdAt: string;
  updatedAt: string;
};

type ClinicLab = {
  id: string;
  patientId: string;
  tests: string[];
  note?: string;
  priority: "low" | "normal" | "high";
  createdAt: string;
  updatedAt: string;
  userId: string;
};

type ClinicNote = {
  id: string;
  patientId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
};

type ClinicService = {
  id: string;
  patientId: string;
  type: string;
  status: "requested" | "in_progress" | "completed";
  note?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
};

function readStore<T>(key: string): T[] {
  const globalAny = globalThis as unknown as Record<string, T[]>;
  return globalAny[key] ?? [];
}

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clinicPatients = readStore<ClinicPatient>("__medasi_clinic_patients__");
  const clinicLabs = readStore<ClinicLab>("__medasi_clinic_labs__").filter(
    (item) => item.userId === user.id,
  );
  const clinicNotes = readStore<ClinicNote>("__medasi_clinic_notes__").filter(
    (item) => item.userId === user.id,
  );
  const clinicServices = readStore<ClinicService>("__medasi_clinic_services__").filter(
    (item) => item.userId === user.id,
  );

  const [cases, patientRegistry, aiSessions] = await Promise.all([
    prisma.case.findMany({
      where: { userId: user.id },
      include: { patient: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.patient.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.session.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        model: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const activePatients = clinicPatients.filter((item) => item.status === "active");
  const dischargedPatients = clinicPatients.filter((item) => item.status === "discharged");
  const urgentLabs = clinicLabs.filter((item) => item.priority === "high");
  const openServices = clinicServices.filter((item) => item.status !== "completed");

  return NextResponse.json({
    stats: {
      activePatients: activePatients.length,
      dischargedPatients: dischargedPatients.length,
      totalCases: cases.length,
      urgentLabs: urgentLabs.length,
      openServices: openServices.length,
      notes: clinicNotes.length,
      registryPatients: patientRegistry.length,
      aiSessions7d: aiSessions.length,
    },
    spotlight: {
      patient:
        activePatients[0] ?? clinicPatients[0] ?? null,
      nextAction:
        urgentLabs.length > 0
          ? "Yüksek öncelikli tetkikleri önce klinik asistana taşı."
          : openServices.length > 0
            ? "Servis üzerinde açık işleri kapatıp taburcu/receipe akışına geç."
            : "Yeni hastayı onboarding akışıyla kliniğe al ve DDx zincirini başlat.",
    },
    cases: cases.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      createdAt: item.createdAt.toISOString(),
      patientName: item.patient?.name ?? null,
    })),
    patients: clinicPatients.slice(0, 8),
    registry: patientRegistry.map((item) => ({
      id: item.id,
      name: item.name,
      noteField: item.noteField,
      createdAt: item.createdAt.toISOString(),
    })),
    services: clinicServices.slice(0, 8),
    labs: clinicLabs.slice(0, 8),
    notes: clinicNotes.slice(0, 8),
    aiSessions: aiSessions.map((item) => ({
      id: item.id,
      model: item.model,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}

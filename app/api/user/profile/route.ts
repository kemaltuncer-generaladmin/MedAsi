import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { upsertUserAcademicProfile } from "@/lib/community/service";

type AiModel = "FAST" | "EFFICIENT";
type AiLanguage = "tr" | "en" | "auto";
type AiLength = "short" | "medium" | "long";

type RequestBody = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readNullableText(value: unknown): string | null | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (value === null) return null;
  return undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readAiModel(value: unknown): AiModel | undefined {
  return value === "FAST" || value === "EFFICIENT" ? value : undefined;
}

function readAiLanguage(value: unknown): AiLanguage | undefined {
  return value === "tr" || value === "en" || value === "auto" ? value : undefined;
}

function readAiLength(value: unknown): AiLength | undefined {
  return value === "short" || value === "medium" || value === "long" ? value : undefined;
}

function toJsonObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function responseFromUser(user: {
  name: string | null;
  email: string;
  goals: Prisma.JsonValue;
  notificationPrefs: Prisma.JsonValue;
  academicProfile?: {
    universityId: string | null;
    programId: string | null;
    termId: string | null;
    specialty: string | null;
    verificationStatus: string;
    visibilityLevel: string;
    university?: { name: string } | null;
    program?: { name: string } | null;
    term?: { name: string } | null;
  } | null;
}) {
  return {
    name: user.name ?? "",
    email: user.email,
    goals: user.goals,
    notificationPrefs: user.notificationPrefs,
    academicProfile: user.academicProfile
      ? {
          universityId: user.academicProfile.universityId,
          programId: user.academicProfile.programId,
          termId: user.academicProfile.termId,
          specialty: user.academicProfile.specialty,
          verificationStatus: user.academicProfile.verificationStatus,
          visibilityLevel: user.academicProfile.visibilityLevel,
          universityName: user.academicProfile.university?.name ?? null,
          programName: user.academicProfile.program?.name ?? null,
          termName: user.academicProfile.term?.name ?? null,
        }
      : null,
  };
}

function buildProfileSource(body: RequestBody) {
  if (isRecord(body.profile)) return { ...body, ...body.profile };
  if (isRecord(body.notificationPrefs) && isRecord(body.notificationPrefs.profile)) {
    return { ...body, ...body.notificationPrefs.profile };
  }
  if (isRecord(body.goals)) return { ...body, ...body.goals };
  return body;
}

function buildNotificationSource(body: RequestBody) {
  if (isRecord(body.notificationPrefs)) return { ...body, ...body.notificationPrefs };
  return body;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      goals: true,
      notificationPrefs: true,
      academicProfile: {
        include: {
          university: { select: { name: true } },
          program: { select: { name: true } },
          term: { select: { name: true } },
        },
      },
    },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(responseFromUser(dbUser));
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RequestBody;

  try {
    const parsed = await request.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      goals: true,
      notificationPrefs: true,
      academicProfile: {
        include: {
          university: { select: { name: true } },
          program: { select: { name: true } },
          term: { select: { name: true } },
        },
      },
    },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const profileSource = buildProfileSource(body);
  const notificationSource = buildNotificationSource(body);
  const aiSource = isRecord(notificationSource.aiPrefs)
    ? { ...notificationSource, ...notificationSource.aiPrefs }
    : isRecord(body.aiPrefs)
      ? { ...body, ...body.aiPrefs }
      : notificationSource;

  const updateData: Prisma.UserUpdateInput = {};
  const existingGoals = toJsonObject(dbUser.goals);
  const existingNotificationPrefs = toJsonObject(dbUser.notificationPrefs);

  const nextName = readText(profileSource.name);
  if (nextName !== undefined) {
    updateData.name = nextName;
  }

  const profilePatch: Record<string, unknown> = {};

  const phone = readNullableText(profileSource.phone);
  if (phone !== undefined) profilePatch.phone = phone;

  const city = readNullableText(profileSource.city);
  if (city !== undefined) profilePatch.city = city;

  const role = readNullableText(profileSource.role);
  if (role !== undefined) profilePatch.role = role;

  const institution = readNullableText(profileSource.institution);
  if (institution !== undefined) profilePatch.institution = institution;

  const graduationYear = readNullableText(profileSource.graduationYear);
  if (graduationYear !== undefined) profilePatch.graduationYear = graduationYear;

  const specialty = readNullableText(profileSource.specialty);
  if (specialty !== undefined) profilePatch.specialty = specialty;

  const universityId = readNullableText(profileSource.universityId);
  const programId = readNullableText(profileSource.programId);
  const termId = readNullableText(profileSource.termId);
  const visibilityLevel = readNullableText(profileSource.visibilityLevel);
  const studentNoHash = readNullableText(profileSource.studentNoHash);

  const notificationPatch: Record<string, unknown> = {};

  const emailNotifications = readBoolean(notificationSource.emailNotifications);
  if (emailNotifications !== undefined) notificationPatch.emailNotifications = emailNotifications;

  const dailyBriefing = readBoolean(notificationSource.dailyBriefing);
  if (dailyBriefing !== undefined) notificationPatch.dailyBriefing = dailyBriefing;

  const weeklyReport = readBoolean(notificationSource.weeklyReport);
  if (weeklyReport !== undefined) notificationPatch.weeklyReport = weeklyReport;

  const aiPatch: Record<string, unknown> = {};

  const model = readAiModel(aiSource.model);
  if (model !== undefined) aiPatch.model = model;

  const language = readAiLanguage(aiSource.language);
  if (language !== undefined) aiPatch.language = language;

  const responseLength = readAiLength(aiSource.responseLength);
  if (responseLength !== undefined) aiPatch.responseLength = responseLength;

  const clinicalTerminology = readBoolean(aiSource.clinicalTerminology);
  if (clinicalTerminology !== undefined) aiPatch.clinicalTerminology = clinicalTerminology;

  const showReferences = readBoolean(aiSource.showReferences);
  if (showReferences !== undefined) aiPatch.showReferences = showReferences;

  const addDisclaimer = readBoolean(aiSource.addDisclaimer);
  if (addDisclaimer !== undefined) aiPatch.addDisclaimer = addDisclaimer;

  if (Object.keys(aiPatch).length > 0) {
    notificationPatch.aiPrefs = {
      ...toJsonObject(existingNotificationPrefs.aiPrefs),
      ...aiPatch,
    };
  }

  if (Object.keys(profilePatch).length > 0) {
    // Onboarding'den gelen goals dizisini bozmamak için profil alanlarını ayrı bir JSON altında tutuyoruz.
    if (isRecord(dbUser.goals)) {
      updateData.goals = {
        ...existingGoals,
        ...profilePatch,
      } as Prisma.InputJsonValue;
    }

    notificationPatch.profile = {
      ...toJsonObject(existingNotificationPrefs.profile),
      ...profilePatch,
    };
  }

  if (Object.keys(notificationPatch).length > 0) {
    updateData.notificationPrefs = {
      ...existingNotificationPrefs,
      ...notificationPatch,
    } as Prisma.InputJsonValue;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(responseFromUser(dbUser));
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: {
      name: true,
      email: true,
      goals: true,
      notificationPrefs: true,
      academicProfile: {
        include: {
          university: { select: { name: true } },
          program: { select: { name: true } },
          term: { select: { name: true } },
        },
      },
    },
  });

  if (
    universityId !== undefined ||
    programId !== undefined ||
    termId !== undefined ||
    specialty !== undefined ||
    studentNoHash !== undefined ||
    visibilityLevel !== undefined
  ) {
    await upsertUserAcademicProfile(user.id, {
      universityId: universityId === undefined ? updatedUser.academicProfile?.universityId : universityId,
      programId: programId === undefined ? updatedUser.academicProfile?.programId : programId,
      termId: termId === undefined ? updatedUser.academicProfile?.termId : termId,
      specialty: specialty === undefined ? updatedUser.academicProfile?.specialty : specialty,
      studentNoHash:
        studentNoHash === undefined ? updatedUser.academicProfile?.studentNoHash ?? null : studentNoHash,
      visibilityLevel:
        visibilityLevel === undefined
          ? updatedUser.academicProfile?.visibilityLevel ?? "verified_only"
          : visibilityLevel,
    });
  }

  const finalUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      goals: true,
      notificationPrefs: true,
      academicProfile: {
        include: {
          university: { select: { name: true } },
          program: { select: { name: true } },
          term: { select: { name: true } },
        },
      },
    },
  });

  if (nextName !== undefined) {
    try {
      await supabase.auth.updateUser({
        data: { name: nextName },
      });
    } catch {
      // DB kaydı başarıyla güncellendiyse, Supabase metadata senkronu best-effort kalır.
    }
  }

  return NextResponse.json(responseFromUser(finalUser ?? updatedUser));
}

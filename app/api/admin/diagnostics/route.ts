import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getDriveConfigStatus, getManagedDriveBlueprint } from "@/lib/gdrive/client";
import {
  geminiErrorToResponsePayload,
  isGeminiErrorLike,
} from "@/lib/ai/google-errors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getGeminiModuleResolutionOverview,
  getResolvedGeminiConfig,
  maskGeminiEnvName,
} from "@/lib/ai/env";
import {
  getAiModuleRegistryOverview,
  resolveAiModule,
} from "@/lib/ai/module-registry";
import { getAdminStudyOverview } from "@/lib/study/core";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  return dbUser?.role === "admin" ? user : null;
}

async function runGeminiProbe(moduleName?: string) {
  const moduleResolution = resolveAiModule(moduleName);
  const resolved = getResolvedGeminiConfig(moduleResolution.canonicalModuleId, {
    keyPreference: "server-first",
  });
  if (!resolved.apiKey) {
    return {
      ok: false,
      reason: "missing_key",
      message: `Gemini key eksik. Beklenen: ${resolved.expectedKeys.join(" / ")}`,
      module: moduleResolution.canonicalModuleId,
      resolvedKey: resolved.envName,
      resolvedKeyMasked: maskGeminiEnvName(resolved.envName),
      keySource: resolved.keySource,
    };
  }

  try {
    const model = new GoogleGenerativeAI(resolved.apiKey).getGenerativeModel({
      model: "gemini-2.5-flash",
    });
    await model.generateContent("healthcheck");
    return {
      ok: true,
      reason: null,
      message: "Gemini probe başarılı.",
      module: moduleResolution.canonicalModuleId,
      resolvedKey: resolved.envName,
      resolvedKeyMasked: maskGeminiEnvName(resolved.envName),
      keySource: resolved.keySource,
    };
  } catch (error) {
    if (isGeminiErrorLike(error)) {
      const normalized = geminiErrorToResponsePayload(error);
      return {
        ok: false,
        reason: normalized.reason,
        message: normalized.message,
        module: moduleResolution.canonicalModuleId,
        resolvedKey: resolved.envName,
        resolvedKeyMasked: maskGeminiEnvName(resolved.envName),
        keySource: resolved.keySource,
      };
    }
    return {
      ok: false,
      reason: "upstream_error",
      message: error instanceof Error ? error.message : "Bilinmeyen hata",
      module: moduleResolution.canonicalModuleId,
      resolvedKey: resolved.envName,
      resolvedKeyMasked: maskGeminiEnvName(resolved.envName),
      keySource: resolved.keySource,
    };
  }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const shouldProbeGemini = req.nextUrl.searchParams.get("probeGemini") !== "0";
  const requestedModule = req.nextUrl.searchParams.get("module") ?? undefined;
  const driveConfig = getDriveConfigStatus({
    requestUrl: req.url,
    headers: req.headers,
  });

  let tokenTableStatus: { ok: boolean; count: number | null; error: string | null } = {
    ok: true,
    count: null,
    error: null,
  };

  try {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM user_google_tokens
    `;
    tokenTableStatus.count = Number(rows[0]?.count ?? 0n);
  } catch (error) {
    tokenTableStatus = {
      ok: false,
      count: null,
      error: error instanceof Error ? error.message : "DB erişim hatası",
    };
  }

  const probeResolution = resolveAiModule(requestedModule ?? "admin-ai");
  const studyOverview = await getAdminStudyOverview().catch(() => null);
  const registryEntries = getAiModuleRegistryOverview();
  const probeResults = shouldProbeGemini
    ? await Promise.all(
        registryEntries.map(async (entry) => ({
          module: entry.module,
          probe: await runGeminiProbe(entry.module),
        })),
      )
    : [];
  const probeByModule = new Map(probeResults.map((item) => [item.module, item.probe]));
  const geminiProbe = probeByModule.get(probeResolution.canonicalModuleId) ?? null;
  const resolved = getResolvedGeminiConfig(probeResolution.canonicalModuleId, {
    keyPreference: "server-first",
  });
  const moduleResolutions = getGeminiModuleResolutionOverview().map((item) => ({
    module: item.module,
    keyFamily: item.keyFamily,
    hasKey: item.hasKey,
    resolvedKey: maskGeminiEnvName(item.resolvedKey),
    usedFallback: item.usedFallback,
    fallbackAllowed: item.fallbackAllowed,
    expectedKeys: item.expectedKeys,
    keySource: item.keySource,
  }));
  const registry = registryEntries.map((entry) => {
    const resolvedConfig = getResolvedGeminiConfig(entry.module, {
      keyPreference: "server-first",
    });
    const probe = probeByModule.get(entry.module) ?? null;
    return {
      ...entry,
      resolvedKey: maskGeminiEnvName(resolvedConfig.envName),
      hasKey: Boolean(resolvedConfig.apiKey),
      expectedKeys: resolvedConfig.expectedKeys,
      usedFallback: resolvedConfig.usedFallback,
      keySource: resolvedConfig.keySource,
      keyUsable: probe?.ok ?? null,
      probeReason: probe?.reason ?? null,
      probeMessage: probe?.message ?? null,
    };
  });

  return NextResponse.json({
    gemini: {
      hasKey: !!resolved.apiKey,
      requestedModule,
      canonicalModule: probeResolution.canonicalModuleId,
      serverSideContract: "registry-derived",
      resolvedKey: maskGeminiEnvName(resolved.envName),
      usedFallback: resolved.usedFallback,
      fallbackAllowed: resolved.fallbackAllowed,
      expectedKeys: resolved.expectedKeys,
      keySource: resolved.keySource,
      keyUsable: geminiProbe?.ok ?? null,
      modules: moduleResolutions,
      moduleProbeMatrix: registry.map((entry) => ({
        module: entry.module,
        keyFamily: entry.keyFamily,
        hasKey: entry.hasKey,
        keyUsable: entry.keyUsable,
        reason: entry.probeReason,
        message: entry.probeMessage,
        resolvedKey: entry.resolvedKey,
        keySource: entry.keySource,
      })),
      registry,
      probe: geminiProbe,
    },
    drive: {
      configured: driveConfig.configured,
      missingConfig: driveConfig.missingConfig,
      missingConfigDetails: driveConfig.missingConfigDetails,
      baseUrl: driveConfig.baseUrl,
      redirectUri: driveConfig.redirectUri,
      redirectOrigin: driveConfig.redirectOrigin,
      managedRootFolderId: driveConfig.managedRootFolderId,
      blueprint: getManagedDriveBlueprint(),
    },
    driveTokenTable: tokenTableStatus,
    studyCore: studyOverview,
    timestamp: new Date().toISOString(),
  });
}

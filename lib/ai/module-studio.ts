import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiApiKey } from "@/lib/ai/env";
import { getCentralAiSettings } from "@/lib/ai/orchestrator";
import type { ModuleAccessKey } from "@/lib/packages/policy-defaults";
import {
  moduleStudioInputSchema,
  moduleStudioSpecSchema,
  type ModuleStudioInput,
  type ModuleStudioPrimarySurface,
  type ModuleStudioSpec,
} from "@/lib/ai/module-studio-schema";

type ModuleStudioGenerationResult = {
  spec: ModuleStudioSpec;
  warnings: string[];
  rawText?: string;
};

const SURFACE_BASE_PATH: Record<ModuleStudioPrimarySurface, string> = {
  dashboard: "/dashboard",
  tools: "/dashboard/tools",
  ai: "/dashboard/ai",
  source: "/dashboard/source",
  exams: "/dashboard/exams",
};

const SURFACE_SIDEBAR_GROUP: Record<ModuleStudioPrimarySurface, string> = {
  dashboard: "Calisma Merkezi",
  tools: "Klinik Araclar",
  ai: "AI Calisma Alanlari",
  source: "Kaynak Kutuphanesi",
  exams: "Sinav Hazirliklari",
};

const SURFACE_ACCESS_KEY: Record<ModuleStudioPrimarySurface, ModuleAccessKey> = {
  dashboard: "dashboard",
  tools: "tools",
  ai: "ai",
  source: "source",
  exams: "exams",
};

const SURFACE_ICON: Record<ModuleStudioPrimarySurface, string> = {
  dashboard: "LayoutDashboard",
  tools: "Stethoscope",
  ai: "BrainCircuit",
  source: "BookOpen",
  exams: "GraduationCap",
};

const TURKISH_CHAR_MAP: Record<string, string> = {
  c: "c",
  C: "c",
  g: "g",
  G: "g",
  i: "i",
  I: "i",
  o: "o",
  O: "o",
  s: "s",
  S: "s",
  u: "u",
  U: "u",
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
};

function slugify(value: string): string {
  const normalized = value
    .split("")
    .map((char) => TURKISH_CHAR_MAP[char] ?? char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "yeni-modul";
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function deriveName(input: ModuleStudioInput): string {
  if (input.moduleName && input.moduleName.trim()) {
    return toTitleCase(input.moduleName.trim());
  }

  const sentence = input.prompt
    .split(/[.!?\n]/)
    .map((part) => part.trim())
    .find(Boolean);

  const words = (sentence ?? input.prompt)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .join(" ");

  return toTitleCase(words || "Yeni Modul");
}

function buildPaths(input: ModuleStudioInput, slug: string) {
  const appPathBase = SURFACE_BASE_PATH[input.primarySurface];
  const appPath = input.routeMode === "nested"
    ? `${appPathBase}/${slug}/workspace`
    : `${appPathBase}/${slug}`;
  const relativeDashboardPath = appPath.replace(/^\/dashboard\//, "").replace(/^\/dashboard$/, "");
  const pageFile = relativeDashboardPath
    ? `app/(dashboard)/${relativeDashboardPath}/page.tsx`
    : "app/(dashboard)/page.tsx";
  const apiBasePath = input.includeAi ? `/api/ai/${slug}` : `/api/modules/${slug}`;
  const routeFile = input.includeAi
    ? `app/api/ai/${slug}/route.ts`
    : `app/api/modules/${slug}/route.ts`;

  return {
    appPath,
    apiBasePath,
    pageFile,
    routeFile,
  };
}

function buildCapabilityList(input: ModuleStudioInput): string[] {
  const capabilities = [
    "Yapilandirilmis calisma akisi ve net durum kartlari",
    "Paket kilidi oldugunda preview + yukselme cagrisi",
  ];

  if (input.includeAi) {
    capabilities.push("Modul icinde kontrollu AI copilot ve gorev odakli cikti");
  }
  if (input.includeRag) {
    capabilities.push("RAG baglami ile materyal veya kaynaklardan destekli yanit");
  }
  if (input.includeHistory) {
    capabilities.push("Oturum gecmisi ve onceki ciktilari yeniden acma");
  }
  if (input.includeUpload) {
    capabilities.push("Materyal yukleme veya dis kaynaktan veri alma hazirligi");
  }

  return capabilities;
}

function buildFallbackSpec(input: ModuleStudioInput): ModuleStudioSpec {
  const name = deriveName(input);
  const slug = slugify(name);
  const paths = buildPaths(input, slug);
  const summary = `${name} modulu, admin brief'inden uretilen kontrollu bir uygulama spesifikasyonudur. Kod yazmadan once route, sidebar, access ve API taslagini netlestirir.`;
  const audience = input.targetPackage === "ucretsiz"
    ? "Temel kullanicilar ve deneme senaryolari"
    : input.targetPackage === "giris"
      ? "Duzenli ogrenen bireysel kullanicilar"
      : input.targetPackage === "pro"
        ? "Yuksek kullanimli klinik ve AI odakli kullanicilar"
        : "Kurum ve ekip yoneticileri";

  return {
    meta: {
      version: "module-studio/v1",
      generatedAt: new Date().toISOString(),
      source: "template",
    },
    overview: {
      name,
      slug,
      summary,
      audience,
      valueProposition: "Yeni modulu, mevcut Medasi yapisina zarar vermeden uygulanabilir ve denetlenebilir parcaciklara ayirir.",
    },
    routing: {
      primarySurface: input.primarySurface,
      routeMode: input.routeMode,
      appPath: paths.appPath,
      apiBasePath: paths.apiBasePath,
      pageFile: paths.pageFile,
      routeFile: paths.routeFile,
    },
    sidebar: {
      groupLabel: SURFACE_SIDEBAR_GROUP[input.primarySurface],
      label: name,
      icon: SURFACE_ICON[input.primarySurface],
      badge: input.includeAi ? "AI" : null,
    },
    access: {
      minimumPackage: input.targetPackage,
      suggestedModuleKey: SURFACE_ACCESS_KEY[input.primarySurface],
      upgradeBehavior: "Kullanici modulu gorebilir; olusturma, kaydetme veya AI calistirma asamasinda upgrade wall gosterilir.",
      requiresNewEntitlementKey: input.primarySurface === "ai" || input.includeUpload,
    },
    experience: {
      primaryAction: `${name} icinde kullaniciyi tek ana goreve goturen belirgin CTA`,
      emptyState: "Bos durumda ornek is akisi, kisa aciklama ve ilk adim butonu goster.",
      successState: "Basarili sonuc sonunda ozet, export/yeniden calistir secenekleri ve sonraki adim karti goster.",
      aiCapabilities: buildCapabilityList(input),
    },
    implementationFiles: [
      {
        path: paths.pageFile,
        purpose: "Modulun ana ekranini ve preview odakli bilgi mimarisini kurar.",
        scaffold: [
          "Header + ozet kartlari",
          "Ana aksiyon paneli",
          "Son oturumlar veya ciktilar bolumu",
        ],
      },
      {
        path: paths.routeFile,
        purpose: "Modulun kontrollu sunucu endpoint'ini olusturur.",
        scaffold: [
          "Admin veya kullanici auth dogrulamasi",
          "Input schema validation",
          "Rate limit ve guvenli hata donusu",
        ],
      },
      {
        path: `components/modules/${slug}/${slug}-shell.tsx`,
        purpose: "Sayfa icinde tekrar kullanilabilir layout ve durum kartlarini toplar.",
        scaffold: [
          "Summary cards",
          "Action rail",
          "Result timeline",
        ],
      },
      {
        path: "components/layout/Sidebar.tsx",
        purpose: "Kullanici menusu icine yeni modul girisini ekler.",
        scaffold: [
          `Grup: ${SURFACE_SIDEBAR_GROUP[input.primarySurface]}`,
          `Label: ${name}`,
          `Href: ${paths.appPath}`,
        ],
      },
      {
        path: "lib/access/package-access.ts",
        purpose: "Modulun paket ve preview davranisini mevcut erisim modeline baglar.",
        scaffold: [
          `Minimum paket: ${input.targetPackage}`,
          `Onerilen module key: ${SURFACE_ACCESS_KEY[input.primarySurface]}`,
          "Preview acik, kritik aksiyonlar gated",
        ],
      },
      {
        path: "constants/routes.ts",
        purpose: "Route referanslarini ve yonlendirme guvenligini tek yerde toplar.",
        scaffold: [
          `Yeni route alias: ${paths.appPath}`,
          `API base: ${paths.apiBasePath}`,
        ],
      },
    ],
    apiContract: {
      method: "POST",
      requestShape: [
        "prompt: kullanici talebi veya gorev brief'i",
        "context: secili filtreler, seans bilgisi veya kullanici modu",
        input.includeUpload ? "assets: opsiyonel materyal veya baglanti listesi" : "assets: opsiyonel destekleyici veri",
      ],
      responseShape: [
        "summary: ekranda gostermek icin kisa sonuc",
        "artifacts: kart, tablo veya export edilebilir parcaciklar",
        "telemetry: sure, token, durum ve guard bilgileri",
      ],
      safetyRules: [
        "Sunucu tarafi schema validation olmadan isleme girme",
        "Dogrudan dosya yazma veya tehlikeli komut uretme",
        "Paket yetkisi yetersizse preview don ve aksiyonu kilitle",
      ],
    },
    uiSections: [
      {
        id: "hero",
        title: "Modul Basligi ve Durum Ozeti",
        objective: "Kullanicinin modulu neden kullandigini ve su an ne durumda oldugunu ilk ekranda anlamasi.",
        uiPattern: "Baslik, alt aciklama, 2-3 ozet metriği ve tek ana CTA",
      },
      {
        id: "workspace",
        title: "Ana Calisma Yuzeyi",
        objective: "Prompt, secenekler ve sonuc bolumlerini tek akis icinde gruplamak.",
        uiPattern: "Iki sutunlu panel veya mobilde ust-orta-alt sirali akış",
      },
      {
        id: "history",
        title: "Gecmis ve Yeniden Kullan",
        objective: "Kullaniciya onceki oturumlari gorup hizli tekrar baslatma imkani vermek.",
        uiPattern: "Liste veya timeline kartlari",
      },
      {
        id: "upgrade",
        title: "Preview ve Upgrade Duvari",
        objective: "Yetkisi olmayan kullaniciyi bloklamadan degeri gostermek.",
        uiPattern: "Bulanik sonuc preview + net fayda maddeleri + upgrade CTA",
      },
    ],
    implementationChecklist: [
      {
        id: "route-contract",
        label: "Route contract'i netlestir",
        details: "Request ve response sekillerini zod ile sabitle.",
        status: "required",
      },
      {
        id: "page-layout",
        label: "Sayfa iskeletini kur",
        details: "Header, summary cards, action panel ve sonuc bolumunu grup bazli tasarla.",
        status: "required",
      },
      {
        id: "sidebar-entry",
        label: "Sidebar girisini ekle",
        details: "Dogru grup, ikon ve badge ile menude gorunur yap.",
        status: "required",
      },
      {
        id: "access-guard",
        label: "Paket preview duvarini bagla",
        details: "Sayfa acik kalsin, ancak kritik aksiyonlar upgrade wall ile kapansin.",
        status: "required",
      },
      {
        id: "telemetry",
        label: "Telemetri ve log ekle",
        details: "Basarili ve basarisiz istekleri admin log ve runtime gozlemine yaz.",
        status: "recommended",
      },
      {
        id: "empty-states",
        label: "Bos ve hata durumlari",
        details: "Ilk kullanim, limit, validation ve upstream error ekranlarini ayir.",
        status: "required",
      },
      {
        id: "history-support",
        label: "Gecmis kaydi",
        details: "Oturumlari tekrar acmaya izin veren hafif bir history modeli kur.",
        status: input.includeHistory ? "recommended" : "optional",
      },
      {
        id: "rag-guard",
        label: "RAG baglami sinirlarini belirle",
        details: "RAG kullaniliyorsa kaynak secimi ve baglam boyutunu kontrol et.",
        status: input.includeRag ? "required" : "optional",
      },
      {
        id: "upload-flow",
        label: "Yukleme veya veri ekleme akisini tanimla",
        details: "Varlik yukleme varsa tip secimi, boyut limitleri ve isleme adimlarini netlestir.",
        status: input.includeUpload ? "required" : "optional",
      },
    ],
    testingScenarios: [
      "Admin spec'i indirip JSON parse edebiliyor.",
      "Target package altindaki kullanici modulu gorup kritik aksiyonda upgrade wall aliyor.",
      "Yanlis input geldiginde route 400 ile kontrollu hata donuyor.",
      "AI acik durumda sonuc yapisi beklenen alanlari iceriyor.",
      "Bos durumda aciklayici CTA ve ornek akis gorunuyor.",
      "Sidebar girisi dogru grupta ve dogru route'a gidiyor.",
    ],
    warnings: [
      "Bu artifact kod yazmaz; uygulama icin onayli bir spec JSON uretir.",
      input.includeRag ? "RAG aciksa veri kaynagi ve gizlilik kurallari ayrica netlestirilmeli." : "RAG kapali varsayildi.",
    ],
  };
}

function buildAiPrompt(input: ModuleStudioInput, fallback: ModuleStudioSpec, systemPromptAddon: string) {
  const policyAddon = systemPromptAddon.trim()
    ? `Merkezi AI politikasi:\n${systemPromptAddon.trim()}\n`
    : "";

  return [
    "Sen Medasi icin guvenli bir Module Studio asistansin.",
    "Gorevin: otomatik kod yazmadan, uygulanabilir bir modül specification JSON'u uretmek.",
    "Yalnizca gecerli JSON don. Markdown, aciklama veya kod blogu kullanma.",
    policyAddon,
    "Kurallar:",
    "- Mevcut Next.js App Router yapisina uy.",
    "- Route, page, sidebar, access ve checklist alanlarini net doldur.",
    "- Guvenli kal: dosya yazan veya migration calistiran adimlar onermeden once insan onayi gerektigini varsay.",
    "- Paket davranisi preview + upgrade wall modeline uygun olsun.",
    "- Medasi tasarim dili: basit, gruplanmis, kart tabanli, ozet odakli.",
    "",
    `Kullanici brief'i: ${input.prompt}`,
    `Modul adi tercihi: ${input.moduleName || "otomatik uret"}`,
    `Hedef paket: ${input.targetPackage}`,
    `Ana yuzey: ${input.primarySurface}`,
    `Route modu: ${input.routeMode}`,
    `AI gerekiyor mu: ${input.includeAi ? "evet" : "hayir"}`,
    `RAG gerekiyor mu: ${input.includeRag ? "evet" : "hayir"}`,
    `History gerekiyor mu: ${input.includeHistory ? "evet" : "hayir"}`,
    `Upload gerekiyor mu: ${input.includeUpload ? "evet" : "hayir"}`,
    "",
    "Asagidaki fallback spesifikasyonu baslangic referansi olarak kullan; daha iyi ama ayni seviyede uygulanabilir bir JSON dondur:",
    JSON.stringify(fallback, null, 2),
  ].join("\n");
}

function extractJsonObject(rawText: string): unknown {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i) ?? trimmed.match(/```\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      try {
        return JSON.parse(fencedMatch[1].trim());
      } catch {
        return null;
      }
    }
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function generateModuleStudioSpec(input: unknown): Promise<ModuleStudioGenerationResult> {
  const normalizedInput = moduleStudioInputSchema.parse(input);
  const fallback = buildFallbackSpec(normalizedInput);
  const warnings = [...fallback.warnings];
  const apiKey = getGeminiApiKey("admin-ai");

  if (!apiKey) {
    warnings.push("Gemini API key tanimli olmadigi icin template fallback kullanildi.");
    return {
      spec: {
        ...fallback,
        warnings,
      },
      warnings,
    };
  }

  let systemPromptAddon = "";
  try {
    const settings = await getCentralAiSettings();
    systemPromptAddon = settings.systemPromptAddon;
  } catch {
    warnings.push("Merkezi AI ayarlari okunamadi; varsayilan policy ile devam edildi.");
  }

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(buildAiPrompt(normalizedInput, fallback, systemPromptAddon));
    const rawText = result.response.text();
    const parsed = extractJsonObject(rawText);
    const validated = moduleStudioSpecSchema.safeParse(parsed);

    if (!validated.success) {
      warnings.push("AI cikti JSON semasina uymadi; template fallback gosterildi.");
      return {
        spec: {
          ...fallback,
          warnings,
        },
        warnings,
        rawText,
      };
    }

    return {
      spec: {
        ...validated.data,
        meta: {
          ...validated.data.meta,
          version: "module-studio/v1",
          generatedAt: new Date().toISOString(),
          source: "ai",
        },
        warnings: [...warnings, ...validated.data.warnings],
      },
      warnings: [...warnings, ...validated.data.warnings],
      rawText,
    };
  } catch (error) {
    warnings.push(error instanceof Error ? `AI uretimi fallback'e dustu: ${error.message}` : "AI uretimi fallback'e dustu.");
    return {
      spec: {
        ...fallback,
        warnings,
      },
      warnings,
    };
  }
}

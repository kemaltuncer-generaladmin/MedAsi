import { z } from "zod";

export const moduleStudioPackageTierSchema = z.enum([
  "ucretsiz",
  "giris",
  "pro",
  "kurumsal",
]);

export const moduleStudioPrimarySurfaceSchema = z.enum([
  "dashboard",
  "tools",
  "ai",
  "source",
  "exams",
]);

export const moduleStudioRouteModeSchema = z.enum([
  "top-level",
  "nested",
]);

export const moduleStudioInputSchema = z.object({
  prompt: z.string().trim().min(20).max(4000),
  moduleName: z.string().trim().min(3).max(80).optional().or(z.literal("")),
  targetPackage: moduleStudioPackageTierSchema.default("pro"),
  primarySurface: moduleStudioPrimarySurfaceSchema.default("dashboard"),
  routeMode: moduleStudioRouteModeSchema.default("top-level"),
  includeAi: z.boolean().default(true),
  includeRag: z.boolean().default(false),
  includeHistory: z.boolean().default(true),
  includeUpload: z.boolean().default(false),
});

export const moduleStudioSpecSchema = z.object({
  meta: z.object({
    version: z.literal("module-studio/v1"),
    generatedAt: z.string().min(1),
    source: z.enum(["ai", "template"]),
  }),
  overview: z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    summary: z.string().min(1),
    audience: z.string().min(1),
    valueProposition: z.string().min(1),
  }),
  routing: z.object({
    primarySurface: moduleStudioPrimarySurfaceSchema,
    routeMode: moduleStudioRouteModeSchema,
    appPath: z.string().min(1),
    apiBasePath: z.string().min(1),
    pageFile: z.string().min(1),
    routeFile: z.string().min(1),
  }),
  sidebar: z.object({
    groupLabel: z.string().min(1),
    label: z.string().min(1),
    icon: z.string().min(1),
    badge: z.string().nullable().optional(),
  }),
  access: z.object({
    minimumPackage: moduleStudioPackageTierSchema,
    suggestedModuleKey: z.string().min(1),
    upgradeBehavior: z.string().min(1),
    requiresNewEntitlementKey: z.boolean(),
  }),
  experience: z.object({
    primaryAction: z.string().min(1),
    emptyState: z.string().min(1),
    successState: z.string().min(1),
    aiCapabilities: z.array(z.string().min(1)),
  }),
  implementationFiles: z.array(
    z.object({
      path: z.string().min(1),
      purpose: z.string().min(1),
      scaffold: z.array(z.string().min(1)).min(1),
    }),
  ).min(4),
  apiContract: z.object({
    method: z.string().min(1),
    requestShape: z.array(z.string().min(1)).min(1),
    responseShape: z.array(z.string().min(1)).min(1),
    safetyRules: z.array(z.string().min(1)).min(1),
  }),
  uiSections: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      objective: z.string().min(1),
      uiPattern: z.string().min(1),
    }),
  ).min(3),
  implementationChecklist: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      details: z.string().min(1),
      status: z.enum(["required", "recommended", "optional"]),
    }),
  ).min(8),
  testingScenarios: z.array(z.string().min(1)).min(5),
  warnings: z.array(z.string().min(1)).default([]),
});

export type ModuleStudioPackageTier = z.infer<typeof moduleStudioPackageTierSchema>;
export type ModuleStudioPrimarySurface = z.infer<typeof moduleStudioPrimarySurfaceSchema>;
export type ModuleStudioRouteMode = z.infer<typeof moduleStudioRouteModeSchema>;
export type ModuleStudioInput = z.infer<typeof moduleStudioInputSchema>;
export type ModuleStudioSpec = z.infer<typeof moduleStudioSpecSchema>;

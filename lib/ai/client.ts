import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiApiKey } from "@/lib/ai/env";
import { FALLBACK_MODEL_PRICING } from "@/lib/ai/pricing";

export const gemini = new GoogleGenerativeAI(
  getGeminiApiKey("ai-chat", {
    keyPreference: "server-first",
  }),
);

export const AI_MODELS = {
  FAST: "gemini-2.5-pro",
  EFFICIENT: "gemini-2.5-flash",
} as const;

export const DEFAULT_MODEL_PRICING = FALLBACK_MODEL_PRICING;

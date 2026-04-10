export type AiModelPricing = {
  model: string;
  displayName: string;
  inputPricePer1k: number;
  outputPricePer1k: number;
};

export const FALLBACK_MODEL_PRICING: readonly AiModelPricing[] = [
  {
    model: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    inputPricePer1k: 0.000075,
    outputPricePer1k: 0.0003,
  },
  {
    model: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    inputPricePer1k: 0.00125,
    outputPricePer1k: 0.005,
  },
  {
    model: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    inputPricePer1k: 0.0001,
    outputPricePer1k: 0.0004,
  },
  {
    model: "gemini-2.0-flash-exp",
    displayName: "Gemini 2.0 Flash Experimental",
    inputPricePer1k: 0.0001,
    outputPricePer1k: 0.0004,
  },
  {
    model: "claude-opus-4-6",
    displayName: "Claude Opus 4.6",
    inputPricePer1k: 0.015,
    outputPricePer1k: 0.075,
  },
  {
    model: "claude-sonnet-4-6",
    displayName: "Claude Sonnet 4.6",
    inputPricePer1k: 0.003,
    outputPricePer1k: 0.015,
  },
  {
    model: "claude-haiku-4-5-20251001",
    displayName: "Claude Haiku 4.5",
    inputPricePer1k: 0.00025,
    outputPricePer1k: 0.00125,
  },
  {
    model: "gpt-4o",
    displayName: "GPT-4o",
    inputPricePer1k: 0.005,
    outputPricePer1k: 0.015,
  },
  {
    model: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    inputPricePer1k: 0.00015,
    outputPricePer1k: 0.0006,
  },
] as const;

export function getFallbackModelPricing(model: string): AiModelPricing | null {
  return FALLBACK_MODEL_PRICING.find((item) => item.model === model) ?? null;
}

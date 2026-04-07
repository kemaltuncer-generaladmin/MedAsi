import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const AI_MODELS = {
  FAST: 'claude-3-5-sonnet-20241022',
  EFFICIENT: 'claude-3-5-haiku-20241022',
} as const

export const DEFAULT_MODEL_PRICING = [
  { model: 'claude-opus-4-6',           displayName: 'Claude Opus 4.6',    inputPricePer1k: 0.015,   outputPricePer1k: 0.075   },
  { model: 'claude-sonnet-4-6',         displayName: 'Claude Sonnet 4.6',  inputPricePer1k: 0.003,   outputPricePer1k: 0.015   },
  { model: 'claude-haiku-4-5-20251001', displayName: 'Claude Haiku 4.5',   inputPricePer1k: 0.00025, outputPricePer1k: 0.00125 },
  { model: 'gpt-4o',                    displayName: 'GPT-4o',             inputPricePer1k: 0.005,   outputPricePer1k: 0.015   },
  { model: 'gpt-4o-mini',               displayName: 'GPT-4o Mini',        inputPricePer1k: 0.00015, outputPricePer1k: 0.0006  },
] as const

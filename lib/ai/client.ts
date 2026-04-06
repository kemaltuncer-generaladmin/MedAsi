import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const AI_MODELS = {
  FAST: 'claude-3-5-sonnet-20241022',
  EFFICIENT: 'claude-3-5-haiku-20241022',
} as const

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, AI_MODELS } from '@/lib/ai/client'
import { checkAILimit, logAIUsage } from '@/lib/ai/check-limit'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const canUse = await checkAILimit(user.id)
  if (!canUse) {
    return NextResponse.json({ error: 'AI limit exceeded' }, { status: 429 })
  }

  const body = await request.json()
  const { message, model = 'FAST', caseId } = body

  const response = await anthropic.messages.create({
    model: AI_MODELS[model as keyof typeof AI_MODELS],
    max_tokens: 1024,
    messages: [{ role: 'user', content: message }]
  })

  await logAIUsage(
    user.id,
    AI_MODELS[model as keyof typeof AI_MODELS],
    response.usage.input_tokens + response.usage.output_tokens,
    caseId
  )

  return NextResponse.json({ response: response.content[0] })
}

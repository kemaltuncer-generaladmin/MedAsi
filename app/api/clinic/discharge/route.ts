import { NextResponse } from 'next/server'
import { dischargeSchema } from '@/lib/schemas/clinic/shared'

export async function POST(req: Request) {
  const parsed = dischargeSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  return NextResponse.json({
    data: {
      id: crypto.randomUUID(),
      ...parsed.data,
      createdAt: new Date().toISOString(),
    },
    success: true,
  })
}

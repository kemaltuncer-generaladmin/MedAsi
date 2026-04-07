import { NextResponse } from 'next/server'
import { labRequestSchema } from '@/lib/schemas/clinic/shared'

type Lab = {
  id: string
  patientId: string
  tests: string[]
  note?: string
  priority: 'low' | 'normal' | 'high'
  createdAt: string
  updatedAt: string
}

const key = '__medasi_clinic_labs__'
const globalAny = globalThis as unknown as Record<string, Lab[]>
if (!globalAny[key]) globalAny[key] = []

export async function GET() {
  return NextResponse.json({ data: globalAny[key] })
}

export async function POST(req: Request) {
  const parsed = labRequestSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const now = new Date().toISOString()
  const item: Lab = { ...parsed.data, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
  globalAny[key].unshift(item)
  return NextResponse.json({ data: item }, { status: 201 })
}

export async function PUT(req: Request) {
  const parsed = labRequestSchema.safeParse(await req.json())
  if (!parsed.success || !parsed.data.id) return NextResponse.json({ error: 'Geçersiz veri' }, { status: 400 })
  const i = globalAny[key].findIndex((x) => x.id === parsed.data.id)
  if (i === -1) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
  globalAny[key][i] = { ...globalAny[key][i], ...parsed.data, updatedAt: new Date().toISOString() }
  return NextResponse.json({ data: globalAny[key][i] })
}

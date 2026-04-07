import { NextResponse } from 'next/server'
import { noteSchema } from '@/lib/schemas/clinic/shared'

type Note = {
  id: string
  patientId: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

const key = '__medasi_clinic_notes__'
const globalAny = globalThis as unknown as Record<string, Note[]>
if (!globalAny[key]) globalAny[key] = []

export async function GET() {
  return NextResponse.json({ data: globalAny[key] })
}

export async function POST(req: Request) {
  const parsed = noteSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const now = new Date().toISOString()
  const item: Note = { ...parsed.data, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
  globalAny[key].unshift(item)
  return NextResponse.json({ data: item }, { status: 201 })
}

export async function PUT(req: Request) {
  const parsed = noteSchema.safeParse(await req.json())
  if (!parsed.success || !parsed.data.id) return NextResponse.json({ error: 'Geçersiz veri' }, { status: 400 })
  const i = globalAny[key].findIndex((x) => x.id === parsed.data.id)
  if (i === -1) return NextResponse.json({ error: 'Not bulunamadı' }, { status: 404 })
  globalAny[key][i] = { ...globalAny[key][i], ...parsed.data, updatedAt: new Date().toISOString() }
  return NextResponse.json({ data: globalAny[key][i] })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id zorunlu' }, { status: 400 })
  const before = globalAny[key].length
  globalAny[key] = globalAny[key].filter((n) => n.id !== id)
  if (before === globalAny[key].length) return NextResponse.json({ error: 'Not bulunamadı' }, { status: 404 })
  return NextResponse.json({ success: true })
}

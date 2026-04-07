import { NextResponse } from 'next/server'
import { prescriptionSchema } from '@/lib/schemas/clinic/shared'

type Prescription = {
  id: string
  patientId: string
  medications: { name: string; dosage: string; frequency: string; duration: string }[]
  note?: string
  createdAt: string
}

const key = '__medasi_clinic_prescriptions__'
const globalAny = globalThis as unknown as Record<string, Prescription[]>
if (!globalAny[key]) globalAny[key] = []

export async function GET() {
  return NextResponse.json({ data: globalAny[key] })
}

export async function POST(req: Request) {
  const parsed = prescriptionSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const item: Prescription = { ...parsed.data, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  globalAny[key].unshift(item)
  return NextResponse.json({ data: item }, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cases = await prisma.case.findMany({
    where: { userId: user.id },
    include: { patient: true },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(cases)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const caseRecord = await prisma.case.create({
    data: {
      userId: user.id,
      patientId: body.patientId,
      title: body.title,
      description: body.description
    }
  })

  return NextResponse.json(caseRecord)
}

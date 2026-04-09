import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function checkAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    return null
  }
  return user
}

interface QuestionItem {
  subject: string
  difficulty?: string
  questionText: string
  options: { label: string; text: string }[]
  correctAnswer: string
  explanation?: string
  tags?: string[]
  source?: string
}

interface FlashcardItem {
  subject: string
  front: string
  back: string
  tags?: string[]
  source?: string
}

export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null

  if (!file || !type) {
    return NextResponse.json({ error: 'file ve type alanları zorunludur.' }, { status: 400 })
  }

  if (type !== 'questions' && type !== 'flashcards') {
    return NextResponse.json({ error: 'type "questions" veya "flashcards" olmalıdır.' }, { status: 400 })
  }

  let parsed: unknown
  try {
    const text = await file.text()
    parsed = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON dosyası.' }, { status: 400 })
  }

  if (!Array.isArray(parsed)) {
    return NextResponse.json({ error: 'JSON dosyası bir dizi olmalıdır.' }, { status: 400 })
  }

  const batchId = `upload_${Date.now()}`
  const errors: string[] = []

  if (type === 'questions') {
    const valid: QuestionItem[] = []

    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i] as Record<string, unknown>
      if (!item.subject || typeof item.subject !== 'string') {
        errors.push(`[${i}] subject eksik veya geçersiz.`)
        continue
      }
      if (!item.questionText || typeof item.questionText !== 'string') {
        errors.push(`[${i}] questionText eksik veya geçersiz.`)
        continue
      }
      if (!Array.isArray(item.options) || item.options.length === 0) {
        errors.push(`[${i}] options eksik veya geçersiz.`)
        continue
      }
      if (!item.correctAnswer || typeof item.correctAnswer !== 'string') {
        errors.push(`[${i}] correctAnswer eksik veya geçersiz.`)
        continue
      }
      valid.push({
        subject: item.subject as string,
        difficulty: (item.difficulty as string) || 'orta',
        questionText: item.questionText as string,
        options: item.options as { label: string; text: string }[],
        correctAnswer: item.correctAnswer as string,
        explanation: item.explanation as string | undefined,
        tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
        source: (item.source as string | undefined) || batchId,
      })
    }

    if (valid.length > 0) {
      await prisma.poolQuestion.createMany({
        data: valid.map((q) => ({
          subject: q.subject,
          difficulty: q.difficulty ?? 'orta',
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation ?? null,
          tags: q.tags ?? [],
          source: q.source ?? batchId,
        })),
        skipDuplicates: false,
      })
    }

    return NextResponse.json({ inserted: valid.length, errors })
  } else {
    // flashcards
    const valid: FlashcardItem[] = []

    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i] as Record<string, unknown>
      if (!item.subject || typeof item.subject !== 'string') {
        errors.push(`[${i}] subject eksik veya geçersiz.`)
        continue
      }
      if (!item.front || typeof item.front !== 'string') {
        errors.push(`[${i}] front eksik veya geçersiz.`)
        continue
      }
      if (!item.back || typeof item.back !== 'string') {
        errors.push(`[${i}] back eksik veya geçersiz.`)
        continue
      }
      valid.push({
        subject: item.subject as string,
        front: item.front as string,
        back: item.back as string,
        tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
        source: (item.source as string | undefined) || batchId,
      })
    }

    if (valid.length > 0) {
      await prisma.poolFlashcard.createMany({
        data: valid.map((f) => ({
          subject: f.subject,
          front: f.front,
          back: f.back,
          tags: f.tags ?? [],
          source: f.source ?? batchId,
        })),
        skipDuplicates: false,
      })
    }

    return NextResponse.json({ inserted: valid.length, errors })
  }
}

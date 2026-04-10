import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function checkAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  })

  if (dbUser?.role !== 'admin') {
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

// ─── Excel Parsers ────────────────────────────────────────────────────────────

function parseExcelQuestions(
  buffer: Buffer,
  batchId: string,
): { valid: QuestionItem[]; errors: string[] } {
  const XLSX = require('xlsx') as typeof import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  })

  const valid: QuestionItem[] = []
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // 1-based + header

    const subject = String(row['subject'] ?? '').trim()
    const questionText = String(row['questionText'] ?? '').trim()
    const optionA = String(row['optionA'] ?? '').trim()
    const optionB = String(row['optionB'] ?? '').trim()
    const optionC = String(row['optionC'] ?? '').trim()
    const optionD = String(row['optionD'] ?? '').trim()
    const optionE = String(row['optionE'] ?? '').trim()
    const correctAnswer = String(row['correctAnswer'] ?? '').trim()
    const explanation = String(row['explanation'] ?? '').trim()
    const tagsRaw = String(row['tags'] ?? '').trim()
    const difficulty = String(row['difficulty'] ?? 'orta').trim() || 'orta'

    if (!subject) { errors.push(`[Satır ${rowNum}] subject eksik.`); continue }
    if (!questionText) { errors.push(`[Satır ${rowNum}] questionText eksik.`); continue }
    if (!optionA || !optionB) { errors.push(`[Satır ${rowNum}] En az optionA ve optionB gerekli.`); continue }
    if (!correctAnswer) { errors.push(`[Satır ${rowNum}] correctAnswer eksik.`); continue }

    const options: { label: string; text: string }[] = []
    if (optionA) options.push({ label: 'A', text: optionA })
    if (optionB) options.push({ label: 'B', text: optionB })
    if (optionC) options.push({ label: 'C', text: optionC })
    if (optionD) options.push({ label: 'D', text: optionD })
    if (optionE) options.push({ label: 'E', text: optionE })

    const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []

    valid.push({
      subject,
      difficulty,
      questionText,
      options,
      correctAnswer,
      explanation: explanation || undefined,
      tags,
      source: batchId,
    })
  }

  return { valid, errors }
}

function parseExcelFlashcards(
  buffer: Buffer,
  batchId: string,
): { valid: FlashcardItem[]; errors: string[] } {
  const XLSX = require('xlsx') as typeof import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  })

  const valid: FlashcardItem[] = []
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    const subject = String(row['subject'] ?? '').trim()
    const front = String(row['front'] ?? '').trim()
    const back = String(row['back'] ?? '').trim()
    const tagsRaw = String(row['tags'] ?? '').trim()

    if (!subject) { errors.push(`[Satır ${rowNum}] subject eksik.`); continue }
    if (!front) { errors.push(`[Satır ${rowNum}] front eksik.`); continue }
    if (!back) { errors.push(`[Satır ${rowNum}] back eksik.`); continue }

    const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []
    valid.push({ subject, front, back, tags, source: batchId })
  }

  return { valid, errors }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

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

  const batchId = `upload_${Date.now()}`
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

  if (type === 'questions') {
    let valid: QuestionItem[] = []
    let errors: string[] = []

    if (isExcel) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const result = parseExcelQuestions(buffer, batchId)
        valid = result.valid
        errors = result.errors
      } catch (e) {
        return NextResponse.json({ error: `Excel okunamadı: ${e instanceof Error ? e.message : String(e)}` }, { status: 400 })
      }
    } else {
      // JSON parse
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
    let valid: FlashcardItem[] = []
    let errors: string[] = []

    if (isExcel) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const result = parseExcelFlashcards(buffer, batchId)
        valid = result.valid
        errors = result.errors
      } catch (e) {
        return NextResponse.json({ error: `Excel okunamadı: ${e instanceof Error ? e.message : String(e)}` }, { status: 400 })
      }
    } else {
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

import { z } from 'zod'

export const patientSchema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalı'),
  notes: z.string().optional(),
})

export const caseSchema = z.object({
  title: z.string().min(2, 'Başlık en az 2 karakter olmalı'),
  description: z.string().optional(),
  patientId: z.string().uuid().optional(),
})

export const noteSchema = z.object({
  content: z.string().min(1, 'Not boş olamaz'),
  patientId: z.string().uuid().optional(),
})

export type PatientInput = z.infer<typeof patientSchema>
export type CaseInput = z.infer<typeof caseSchema>
export type NoteInput = z.infer<typeof noteSchema>

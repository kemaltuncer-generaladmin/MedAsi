import { z } from "zod";

export const vitalSignsSchema = z.object({
  temperature: z.number().min(30).max(45).optional(),
  pulse: z.number().min(20).max(250).optional(),
  systolic: z.number().min(50).max(260).optional(),
  diastolic: z.number().min(30).max(180).optional(),
  spo2: z.number().min(40).max(100).optional(),
  respiratoryRate: z.number().min(5).max(80).optional(),
});

export const patientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "İsim en az 2 karakter olmalı"),
  age: z.number().min(0).max(130),
  gender: z.enum(["male", "female", "other"]),
  complaint: z.string().min(3, "Şikayet zorunlu"),
  diagnosis: z.string().optional(),
  status: z.enum(["active", "discharged"]).default("active"),
  vitals: vitalSignsSchema.optional(),
});

export const labRequestSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1, "Hasta seçimi zorunlu"),
  tests: z.array(z.string()).min(1, "En az bir test seçmelisin"),
  note: z.string().optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
});

export const serviceSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1, "Hasta seçimi zorunlu"),
  type: z.string().min(2, "Hizmet tipi zorunlu"),
  status: z
    .enum(["requested", "in_progress", "completed"])
    .default("requested"),
  note: z.string().optional(),
});

export const prescriptionSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1, "Hasta seçimi zorunlu"),
  medications: z
    .array(
      z.object({
        name: z.string().min(2),
        dosage: z.string().min(1),
        frequency: z.string().min(1),
        duration: z.string().min(1),
      }),
    )
    .min(1, "En az bir ilaç eklemelisin"),
  note: z.string().optional(),
});

export const dischargeSchema = z.object({
  patientId: z.string().min(1),
  summary: z.string().min(10, "Taburcu özeti en az 10 karakter olmalı"),
  followUp: z.string().optional(),
});

export const noteSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1),
  title: z.string().min(2),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export type PatientInput = z.infer<typeof patientSchema>;
export type LabRequestInput = z.infer<typeof labRequestSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type PrescriptionInput = z.infer<typeof prescriptionSchema>;
export type DischargeInput = z.infer<typeof dischargeSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type VitalSignsInput = z.infer<typeof vitalSignsSchema>;

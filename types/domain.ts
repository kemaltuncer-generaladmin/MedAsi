export type UserRole = "user" | "admin";

export type PackageName =
  | "ucretsiz"
  | "giris"
  | "pro"
  | "kurumsal"
  | "student"
  | "clinic_pro"
  | "enterprise";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  packageId: string;
  package: Package;
  createdAt: string;
}

export interface Package {
  id: string;
  name: string;
  dailyAiLimit: number;
  price: number;
}

export interface Module {
  id: string;
  name: string;
  description: string | null;
}

export interface Patient {
  id: string;
  userId: string;
  name: string;
  noteField: string | null;
  createdAt: string;
}

export interface Case {
  id: string;
  userId: string;
  patientId: string | null;
  title: string;
  description: string | null;
  createdAt: string;
  patient?: Patient | null;
}

export interface Session {
  id: string;
  userId: string;
  caseId: string | null;
  model: string;
  tokensUsed: number;
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  patientId: string | null;
  content: string;
  createdAt: string;
}

export interface PomodoroLog {
  id: string;
  userId: string;
  duration: number;
  completedAt: string;
}

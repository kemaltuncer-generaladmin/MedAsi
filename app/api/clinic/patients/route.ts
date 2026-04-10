import { NextResponse } from "next/server";
import { patientSchema } from "@/lib/schemas/clinic/shared";

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  complaint: string;
  diagnosis?: string;
  status: "active" | "discharged";
  vitals?: {
    temperature?: number;
    pulse?: number;
    systolic?: number;
    diastolic?: number;
    spo2?: number;
    respiratoryRate?: number;
  };
  createdAt: string;
  updatedAt: string;
};

const key = "__medasi_clinic_patients__";
const globalAny = globalThis as unknown as Record<string, Patient[]>;
if (!globalAny[key]) globalAny[key] = [];

export async function GET() {
  return NextResponse.json({ data: globalAny[key] });
}

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = patientSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const now = new Date().toISOString();
  const patient: Patient = {
    ...parsed.data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  globalAny[key].unshift(patient);
  return NextResponse.json({ data: patient }, { status: 201 });
}

export async function PUT(req: Request) {
  const json = await req.json();
  const parsed = patientSchema.safeParse(json);
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }
  const index = globalAny[key].findIndex((p) => p.id === parsed.data.id);
  if (index === -1)
    return NextResponse.json({ error: "Hasta bulunamadı" }, { status: 404 });
  globalAny[key][index] = {
    ...globalAny[key][index],
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  };
  return NextResponse.json({ data: globalAny[key][index] });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 });
  const before = globalAny[key].length;
  globalAny[key] = globalAny[key].filter((p) => p.id !== id);
  if (before === globalAny[key].length)
    return NextResponse.json({ error: "Hasta bulunamadı" }, { status: 404 });
  return NextResponse.json({ success: true });
}

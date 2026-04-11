"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { NoteEditor } from "@/components/clinic";
import { ClinicHero } from "@/components/clinic/ClinicSurface";
import { Card } from "@/components/ui/Card";

type Patient = { id: string; name: string; complaint: string };

export default function ClinicalNotesPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    fetch("/api/clinic/patients")
      .then((r) => r.json())
      .then((d) => setPatients(d.patients ?? d.data ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <ClinicHero
        eyebrow="Clinical Memory"
        title="Klinik not hafızası"
        description="Hasta bazlı notlarını düzenle, etiketle ve export et; klinik hafızayı kişisel bir atlas gibi büyüt."
        icon={FileText}
      />

      <Card className="p-5">
        <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">Hasta seç</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-[var(--color-text-primary)] outline-none"
        >
          <option value="">Hasta seçin</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name} - {patient.complaint}
            </option>
          ))}
        </select>
      </Card>

      {selectedId ? <NoteEditor patientId={selectedId} /> : <Card className="p-10 text-center text-sm text-[var(--color-text-secondary)]">Not düzenlemek için önce bir hasta seç.</Card>}
    </div>
  );
}

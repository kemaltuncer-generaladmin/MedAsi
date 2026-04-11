"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { DischargeForm } from "@/components/clinic";
import { ClinicHero } from "@/components/clinic/ClinicSurface";
import { Card } from "@/components/ui/Card";

type Patient = { id: string; name: string; complaint: string };

export default function DischargedPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    fetch("/api/clinic/patients")
      .then((r) => r.json())
      .then((d) => setPatients(d.patients ?? d.data ?? []));
  }, []);

  const selected = patients.find((patient) => patient.id === selectedId);

  return (
    <div className="space-y-6">
      <ClinicHero
        eyebrow="Discharge Flow"
        title="Taburcu planı"
        description="Özet, takip ve çıktı dokümanlarını daha düzenli bir taburcu akışında hazırla."
        icon={LogOut}
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

      {selected ? <DischargeForm patientId={selected.id} /> : <Card className="p-10 text-center text-sm text-[var(--color-text-secondary)]">Taburcu özeti için önce bir hasta seç.</Card>}
    </div>
  );
}

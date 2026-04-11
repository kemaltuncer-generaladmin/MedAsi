"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { ServiceForm, ServiceBoard } from "@/components/clinic";
import { ClinicHero } from "@/components/clinic/ClinicSurface";
import { Card } from "@/components/ui/Card";

type Patient = { id: string; name: string; age: number; complaint: string };

export default function ServicePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    fetch("/api/clinic/patients")
      .then((r) => r.json())
      .then((d) => setPatients(d.patients ?? d.data ?? []));
  }, []);

  const selected = patients.find((patient) => patient.id === selectedId);

  return (
    <div className="space-y-6">
      <ClinicHero
        eyebrow="Service Flow"
        title="Servis takip yüzeyi"
        description="İstenen işleri, servis durumlarını ve ilerleme notlarını hasta bağlamıyla birlikte yönet."
        icon={Activity}
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

      {selected ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ServiceForm patientId={selected.id} onSaved={() => setRefresh((value) => value + 1)} />
          <ServiceBoard key={refresh} patientId={selected.id} />
        </div>
      ) : (
        <Card className="p-10 text-center text-sm text-[var(--color-text-secondary)]">
          Servis yönetimi için önce bir hasta seç.
        </Card>
      )}
    </div>
  );
}

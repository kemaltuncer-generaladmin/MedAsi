"use client";
import { useState, useEffect } from "react";
import { ServiceForm, ServiceBoard } from "@/components/clinic";
import { Activity } from "lucide-react";

type Patient = { id: string; name: string; age: number; complaint: string };

export default function ServicePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    fetch("/api/clinic/patients")
      .then((r) => r.json())
      .then((d) => setPatients(d.patients ?? []));
  }, []);

  const selected = patients.find((p) => p.id === selectedId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Activity size={20} className="text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Servis Takip
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Servis işlemlerini takip edin
          </p>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
          Hasta Seçin
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
        >
          <option value="">Hasta seçin</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} - {p.complaint}
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ServiceForm
            patientId={selected.id}
            onSaved={() => setRefresh((r) => r + 1)}
          />
          <ServiceBoard key={refresh} patientId={selected.id} />
        </div>
      )}
    </div>
  );
}

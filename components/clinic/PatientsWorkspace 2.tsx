"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Plus, Search, Trash2, UserRoundPen, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { ClinicHero, ClinicStat } from "@/components/clinic/ClinicSurface";

type Patient = {
  id: string;
  name: string;
  noteField?: string | null;
  createdAt: string;
};

type FormData = { name: string; noteField: string };

export function PatientsWorkspace({
  title = "Hastalarım",
  description = "Kişisel hasta listeni, kısa notlarını ve son eklenen kayıtları tek yüzeyde yönet.",
}: {
  title?: string;
  description?: string;
}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState<FormData>({ name: "", noteField: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/patients");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPatients(data.patients ?? []);
    } catch {
      toast.error("Hastalar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      patients.filter((patient) =>
        patient.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [patients, search],
  );

  const latestPatient = filtered[0] ?? patients[0] ?? null;

  async function save() {
    if (!form.name.trim()) {
      toast.error("Hasta adı zorunludur");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/patients", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? "Hasta güncellendi" : "Hasta eklendi");
      setShowForm(false);
      setEditing(null);
      setForm({ name: "", noteField: "" });
      await load();
    } catch {
      toast.error("Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    try {
      const res = await fetch("/api/patients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Hasta silindi");
      await load();
    } catch {
      toast.error("Silme başarısız");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <ClinicHero
        eyebrow="Patient Registry"
        title={title}
        description={description}
        icon={Users}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setForm({ name: "", noteField: "" });
              setShowForm(true);
            }}
          >
            <Plus size={16} />
            Yeni Hasta
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <ClinicStat
          label="Toplam Kayıt"
          value={patients.length}
          detail="Kendi havuzundaki hasta kartları"
        />
        <ClinicStat
          label="Filtre Sonucu"
          value={filtered.length}
          detail="Aramaya göre görüntülenen kayıt"
          tone="var(--color-secondary)"
        />
        <ClinicStat
          label="Son Kayıt"
          value={latestPatient?.name ?? "-"}
          detail="En yeni eklenen hasta"
          tone="var(--color-warning)"
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Kayıt Havuzu</CardTitle>
          <div className="relative w-full max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hasta adı ara..."
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white/5 py-3 pl-10 pr-4 text-sm text-[var(--color-text-primary)] outline-none"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-44 rounded-3xl border border-[var(--color-border)] bg-white/5 animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-[var(--color-border)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
              Kayıt bulunamadı.
            </div>
          ) : (
            filtered.map((patient) => (
              <div
                key={patient.id}
                className="rounded-3xl border border-[var(--color-border)] bg-white/5 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {patient.name}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                      <Calendar size={12} />
                      {new Intl.DateTimeFormat("tr-TR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(patient.createdAt))}
                    </div>
                  </div>
                </div>

                <p className="mt-4 line-clamp-3 min-h-[60px] text-sm leading-6 text-[var(--color-text-secondary)]">
                  {patient.noteField || "Bu hasta için henüz kısa not girilmedi."}
                </p>

                <div className="mt-5 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditing(patient);
                      setForm({
                        name: patient.name,
                        noteField: patient.noteField ?? "",
                      });
                      setShowForm(true);
                    }}
                  >
                    <UserRoundPen size={14} />
                    Düzenle
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 hover:text-[var(--color-destructive)]"
                    onClick={() => void remove(patient.id)}
                    disabled={deleting === patient.id}
                  >
                    <Trash2 size={14} />
                    Sil
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="glass-panel w-full max-w-xl rounded-3xl p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {editing ? "Hasta kaydını düzenle" : "Yeni hasta ekle"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-sm text-[var(--color-text-secondary)]"
              >
                Kapat
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                  Ad Soyad
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-[var(--color-border)] bg-white/5 px-4 py-3 text-[var(--color-text-primary)] outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                  Kısa Not
                </label>
                <textarea
                  value={form.noteField}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, noteField: e.target.value }))
                  }
                  className="min-h-[140px] w-full rounded-2xl border border-[var(--color-border)] bg-white/5 px-4 py-3 text-[var(--color-text-primary)] outline-none"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Vazgeç
              </Button>
              <Button onClick={() => void save()} loading={saving}>
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

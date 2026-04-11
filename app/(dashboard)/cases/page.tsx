"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Search, Trash2, UserRoundPen } from "lucide-react";
import toast from "react-hot-toast";
import { ClinicHero, ClinicStat } from "@/components/clinic/ClinicSurface";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";

type CaseItem = {
  id: string;
  title: string;
  description: string;
  patientId?: string | null;
  patient?: { id: string; name: string } | null;
  createdAt: string;
};

type Patient = { id: string; name: string };

export default function CasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CaseItem | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", patientId: "" });

  async function load() {
    setLoading(true);
    try {
      const [casesRes, patientsRes] = await Promise.all([
        fetch("/api/cases"),
        fetch("/api/patients"),
      ]);
      if (!casesRes.ok || !patientsRes.ok) throw new Error();
      const casesJson = await casesRes.json();
      const patientsJson = await patientsRes.json();
      setCases(casesJson.cases ?? []);
      setPatients(patientsJson.patients ?? []);
    } catch {
      toast.error("Vaka ekranı yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      cases.filter((item) => {
        const q = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.patient?.name ?? "").toLowerCase().includes(q)
        );
      }),
    [cases, search],
  );

  async function save() {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Başlık ve açıklama gerekli");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/cases", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { id: editing.id } : {}),
          ...form,
          patientId: form.patientId || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? "Vaka güncellendi" : "Vaka oluşturuldu");
      setShowForm(false);
      setEditing(null);
      setForm({ title: "", description: "", patientId: "" });
      await load();
    } catch {
      toast.error("Vaka kaydı başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch("/api/cases", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Vaka silindi");
      await load();
    } catch {
      toast.error("Silme başarısız");
    }
  }

  return (
    <div className="space-y-6">
      <ClinicHero
        eyebrow="Case Command"
        title="Vaka çözüm yüzeyi"
        description="Kısa vaka kartları, hasta bağlamı ve AI destekli klinik reasoning akışını aynı vaka havuzunda topla."
        icon={ClipboardList}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setForm({ title: "", description: "", patientId: "" });
              setShowForm(true);
            }}
          >
            <Plus size={16} />
            Yeni Vaka
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <ClinicStat label="Toplam Vaka" value={cases.length} detail="Kayıtlı vaka senaryoları" />
        <ClinicStat label="Filtre Sonucu" value={filtered.length} detail="Arama sonrası görünen vakalar" tone="var(--color-secondary)" />
        <ClinicStat label="Hasta Bağlı" value={cases.filter((item) => item.patientId).length} detail="Hasta ile ilişkili senaryolar" tone="var(--color-warning)" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Vaka Havuzu</CardTitle>
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Vaka veya hasta ara..."
              className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-3 pl-10 pr-4 text-sm text-[var(--color-text-primary)] outline-none"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-48 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-[var(--color-border)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
              Vaka bulunamadı.
            </div>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">{item.title}</p>
                <p className="mt-2 line-clamp-4 text-sm leading-7 text-[var(--color-text-secondary)]">{item.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                  <span className="rounded-full border border-[var(--color-border)] px-2 py-1">
                    {item.patient?.name ?? "Bağımsız vaka"}
                  </span>
                  <span>{new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(item.createdAt))}</span>
                </div>
                <div className="mt-5 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditing(item);
                      setForm({
                        title: item.title,
                        description: item.description,
                        patientId: item.patientId ?? "",
                      });
                      setShowForm(true);
                    }}
                  >
                    <UserRoundPen size={14} />
                    Düzenle
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 hover:text-[var(--color-destructive)]" onClick={() => void remove(item.id)}>
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
          <div className="glass-panel w-full max-w-2xl rounded-3xl p-6">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {editing ? "Vakayı düzenle" : "Yeni vaka oluştur"}
            </h2>
            <div className="mt-5 space-y-4">
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Vaka başlığı"
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-[var(--color-text-primary)] outline-none"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Klinik tablo, öykü, muayene ve kritik ipuçları"
                className="min-h-[180px] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-[var(--color-text-primary)] outline-none"
              />
              <select
                value={form.patientId}
                onChange={(e) => setForm((prev) => ({ ...prev, patientId: e.target.value }))}
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-[var(--color-text-primary)] outline-none"
              >
                <option value="">Hasta bağlama (opsiyonel)</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
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

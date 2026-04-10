"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Users, Plus, Search, Edit2, Trash2, X, Calendar } from "lucide-react";
import toast from "react-hot-toast";

type Patient = {
  id: string;
  name: string;
  noteField?: string | null;
  createdAt: string;
};
type FormData = { name: string; noteField: string };

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState<FormData>({ name: "", noteField: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Patient | null>(null);

  useEffect(() => {
    load();
  }, []);

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

  function openCreate() {
    setEditing(null);
    setForm({ name: "", noteField: "" });
    setShowForm(true);
  }

  function openEdit(p: Patient) {
    setEditing(p);
    setForm({ name: p.name, noteField: p.noteField ?? "" });
    setShowForm(true);
  }

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
      load();
    } catch {
      toast.error("Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function deletePatient(id: string) {
    setDeleting(id);
    try {
      const res = await fetch("/api/patients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Hasta silindi");
      setConfirmDelete(null);
      load();
    } catch {
      toast.error("Silme başarısız");
    } finally {
      setDeleting(null);
    }
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Users size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
              Hastalarım
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">
            Tüm kayıtlı hastalarınız
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} />
          Yeni Hasta
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hasta adı ara..."
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>
        <Badge variant="default" className="shrink-0">
          {filtered.length} hasta
        </Badge>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-lg bg-[var(--color-surface)] animate-pulse border border-[var(--color-border)]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
            <Users size={28} className="text-[var(--color-text-secondary)]" />
          </div>
          <div className="text-center">
            <p className="text-[var(--color-text-primary)] font-medium text-lg">
              {search ? "Sonuç bulunamadı" : "Henüz hasta kaydı yok"}
            </p>
            <p className="text-[var(--color-text-secondary)] text-sm mt-1">
              {search
                ? `"${search}" için hasta bulunamadı`
                : "İlk hastanızı ekleyin"}
            </p>
          </div>
          {!search && (
            <Button variant="primary" onClick={openCreate}>
              <Plus size={16} />
              Hasta Ekle
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((patient) => (
            <Card
              key={patient.id}
              variant="bordered"
              className="hover:border-[var(--color-primary)]/50 transition-all cursor-default group p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-black flex items-center justify-center font-bold text-sm shrink-0">
                  {getInitials(patient.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--color-text-primary)] truncate">
                    {patient.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar
                      size={11}
                      className="text-[var(--color-text-secondary)]"
                    />
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {formatDate(patient.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
              {patient.noteField && (
                <p className="text-xs text-[var(--color-text-secondary)] mt-3 line-clamp-2 leading-relaxed">
                  {patient.noteField}
                </p>
              )}
              <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--color-border)]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(patient)}
                  className="flex-1"
                >
                  <Edit2 size={13} />
                  Düzenle
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(patient)}
                  className="flex-1 hover:text-[var(--color-destructive)]"
                >
                  <Trash2 size={13} />
                  Sil
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] rounded-xl p-6 w-full max-w-md border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                {editing ? "Hastayı Düzenle" : "Yeni Hasta Ekle"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <Input
                label="Hasta Adı"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ad Soyad"
              />
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Notlar
                </label>
                <textarea
                  value={form.noteField}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, noteField: e.target.value }))
                  }
                  placeholder="Hasta hakkında notlar..."
                  rows={4}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] resize-none transition-colors"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  İptal
                </Button>
                <Button
                  variant="primary"
                  loading={saving}
                  onClick={save}
                  className="flex-1"
                >
                  Kaydet
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] rounded-xl p-6 w-full max-w-sm border border-[var(--color-border)]">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
              Hastayı Sil
            </h2>
            <p className="text-[var(--color-text-secondary)] text-sm mb-6">
              <span className="text-[var(--color-text-primary)] font-medium">
                {confirmDelete.name}
              </span>{" "}
              adlı hastayı silmek istediğinizden emin misiniz? Bu işlem geri
              alınamaz.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(null)}
                className="flex-1"
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                loading={deleting === confirmDelete.id}
                onClick={() => deletePatient(confirmDelete.id)}
                className="flex-1"
              >
                Sil
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

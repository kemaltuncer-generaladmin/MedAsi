"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bed, Edit, Trash2, Search, Filter, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button, Card, Input } from "@/components/ui";
import { serviceSchema, type ServiceInput } from "@/lib/schemas/clinic/shared";
import { ConfirmModal } from "@/components/clinic/ConfirmModal";

type ServiceItem = {
  id: string;
  patientId: string;
  type: string;
  status: "requested" | "in_progress" | "completed";
  note?: string;
  createdAt: string;
  updatedAt: string;
};

interface ServiceBoardProps {
  patientId: string;
}

export function ServiceBoard({ patientId }: ServiceBoardProps) {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    "all" | "requested" | "in_progress" | "completed"
  >("all");
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const [form, setForm] = useState<ServiceInput>({
    patientId,
    type: "",
    status: "requested",
    note: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clinic/service");
      const j = await res.json();
      setItems(
        (j?.data || []).filter((x: ServiceItem) => x.patientId === patientId),
      );
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((x) => {
      const s =
        !q ||
        x.type.toLowerCase().includes(q) ||
        (x.note || "").toLowerCase().includes(q);
      const f = status === "all" || x.status === status;
      return s && f;
    });
  }, [items, search, status]);

  const submit = async () => {
    const parsed = serviceSchema.safeParse(
      editing ? { ...form, id: editing.id } : form,
    );
    if (!parsed.success) {
      toast.error(parsed.error.flatten().formErrors[0] || "Form hatası");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/clinic/service", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j?.error || "İşlem başarısız");
        return;
      }
      toast.success(editing ? "Servis güncellendi" : "Servis eklendi");
      setEditing(null);
      setForm({ patientId, type: "", status: "requested", note: "" });
      await load();
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  const beginEdit = (item: ServiceItem) => {
    setEditing(item);
    setForm({
      patientId: item.patientId,
      type: item.type,
      status: item.status,
      note: item.note || "",
    });
  };

  const remove = async () => {
    if (!confirmId) return;
    setLoading(true);
    try {
      const idx = items.findIndex((x) => x.id === confirmId);
      if (idx === -1) {
        setConfirmId(null);
        return;
      }
      const toUpdate = { ...items[idx], status: "completed" as const };
      const res = await fetch("/api/clinic/service", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toUpdate),
      });
      if (!res.ok) {
        toast.error("Silme başarısız");
        return;
      }
      toast.success("Kayıt pasifize edildi");
      setConfirmId(null);
      await load();
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card variant="bordered" className="rounded-xl p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <Bed size={18} className="text-[var(--color-primary)]" />
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            Servis İşlemleri
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <Input
              className="h-11 pl-10"
              placeholder="Ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <select
              className="h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] pl-10 pr-3 text-[var(--color-text-primary)]"
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as
                    | "all"
                    | "requested"
                    | "in_progress"
                    | "completed",
                )
              }
            >
              <option value="all">Tümü</option>
              <option value="requested">İstendi</option>
              <option value="in_progress">Devam</option>
              <option value="completed">Tamamlandı</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            className="h-11"
            placeholder="Hizmet tipi"
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
          />
          <select
            className="h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-[var(--color-text-primary)]"
            value={form.status}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                status: e.target.value as ServiceInput["status"],
              }))
            }
          >
            <option value="requested">İstendi</option>
            <option value="in_progress">Devam</option>
            <option value="completed">Tamamlandı</option>
          </select>
          <Input
            className="h-11"
            placeholder="Not"
            value={form.note || ""}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {editing ? (
            <Button
              variant="ghost"
              className="h-11"
              onClick={() => {
                setEditing(null);
                setForm({ patientId, type: "", status: "requested", note: "" });
              }}
            >
              İptal
            </Button>
          ) : null}
          <Button
            className="h-11 rounded-xl"
            onClick={() => void submit()}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {editing ? "Güncelle" : "Ekle"}
          </Button>
        </div>

        <div className="mt-6">
          {!filtered.length ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
              Kayıt bulunamadı.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((x) => (
                <div
                  key={x.id}
                  className="rounded-xl border border-[var(--color-border)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {x.type}
                      </p>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {x.note || "-"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        className="h-9"
                        onClick={() => beginEdit(x)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9"
                        onClick={() => setConfirmId(x.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <ConfirmModal
        open={Boolean(confirmId)}
        title="Servis Kaydını Kapat"
        description="Kayıt durumunu tamamlandı olarak güncelleyecek."
        confirmText="Onayla"
        cancelText="Vazgeç"
        onCancel={() => setConfirmId(null)}
        onConfirm={() => void remove()}
        loading={loading}
      />
    </>
  );
}

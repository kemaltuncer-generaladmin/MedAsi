"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Plus,
  Tag,
  Trash2,
  ToggleLeft,
  ToggleRight,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type CouponRow = {
  id: string;
  code: string;
  packageName: string;
  durationDays: number | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  note: string | null;
  createdAt: string;
};

type PackageOption = { id: string; name: string };

/* ─── Utils ──────────────────────────────────────────────────────────────── */
function generateCode(prefix = "MEDASI") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let rand = "";
  for (let i = 0; i < 6; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${rand}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isCouponExpired(coupon: CouponRow) {
  if (!coupon.expiresAt) return false;
  return new Date(coupon.expiresAt) < new Date();
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: generateCode(),
    packageId: "",
    durationDays: "",
    maxUses: "",
    expiresAt: "",
    note: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      if (!res.ok) throw new Error("Yüklenemedi");
      const data = await res.json();
      setCoupons(data.coupons ?? []);
      setPackages(data.packages ?? []);
    } catch {
      toast.error("Kuponlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createCoupon() {
    if (!form.packageId) { toast.error("Paket seçin"); return; }
    if (!form.code.trim()) { toast.error("Kod boş olamaz"); return; }

    startTransition(async () => {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          packageId: form.packageId,
          durationDays: form.durationDays ? Number(form.durationDays) : null,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
          note: form.note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Oluşturulamadı"); return; }
      toast.success("Kupon oluşturuldu");
      setShowForm(false);
      setForm({ code: generateCode(), packageId: "", durationDays: "", maxUses: "", expiresAt: "", note: "" });
      load();
    });
  }

  async function toggleCoupon(id: string, isActive: boolean) {
    const res = await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (!res.ok) { toast.error("Güncellenemedi"); return; }
    toast.success(!isActive ? "Kupon aktif edildi" : "Kupon devre dışı bırakıldı");
    setCoupons((prev) => prev.map((c) => c.id === id ? { ...c, isActive: !isActive } : c));
  }

  async function deleteCoupon(id: string, code: string) {
    if (!confirm(`"${code}" kuponunu silmek istediğinize emin misiniz?`)) return;
    const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Silinemedi"); return; }
    toast.success("Kupon silindi");
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
    toast.success("Kod kopyalandı");
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--color-primary) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)" }}>
            <Tag size={18} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Kupon Yönetimi</h1>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Kayıt sırasında ödemeyi atlatan erişim kodları
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ background: "var(--color-primary)", color: "#000", border: "none" }}
        >
          <Plus size={15} />
          Yeni Kupon
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Yeni Kupon Oluştur</h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Kod */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)]">Kupon Kodu</label>
              <div className="flex gap-2">
                <input
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  className="flex-1 h-9 px-3 rounded-lg text-sm font-mono tracking-widest"
                  style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", outline: "none" }}
                />
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, code: generateCode() }))}
                  className="px-3 h-9 rounded-lg text-xs font-medium"
                  style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                >
                  Yenile
                </button>
              </div>
            </div>

            {/* Paket */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)]">Paket</label>
              <select
                value={form.packageId}
                onChange={(e) => setForm((p) => ({ ...p, packageId: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg text-sm"
                style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", outline: "none" }}
              >
                <option value="">Paket seçin</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                ))}
              </select>
            </div>

            {/* Süre */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)]">
                Erişim Süresi (gün) <span className="opacity-50">— boş = süresiz</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.durationDays}
                onChange={(e) => setForm((p) => ({ ...p, durationDays: e.target.value }))}
                placeholder="örn. 30"
                className="w-full h-9 px-3 rounded-lg text-sm"
                style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", outline: "none" }}
              />
            </div>

            {/* Max kullanım */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)]">
                Max Kullanım <span className="opacity-50">— boş = sınırsız</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.maxUses}
                onChange={(e) => setForm((p) => ({ ...p, maxUses: e.target.value }))}
                placeholder="örn. 100"
                className="w-full h-9 px-3 rounded-lg text-sm"
                style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", outline: "none" }}
              />
            </div>

            {/* Bitiş tarihi */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)]">
                Kodun Son Kullanma Tarihi <span className="opacity-50">— boş = süresiz</span>
              </label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg text-sm"
                style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", outline: "none" }}
              />
            </div>

            {/* Not */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)]">
                İç Not <span className="opacity-50">(opsiyonel)</span>
              </label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="örn. Tıp Fakültesi 2025 kampanyası"
                className="w-full h-9 px-3 rounded-lg text-sm"
                style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", outline: "none" }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={createCoupon}
              disabled={isPending}
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ background: "var(--color-primary)", color: "#000", border: "none" }}
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Oluştur
            </Button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Toplam Kupon", value: coupons.length },
          { label: "Aktif Kupon", value: coupons.filter((c) => c.isActive && !isCouponExpired(c)).length },
          { label: "Toplam Kullanım", value: coupons.reduce((s, c) => s + c.usedCount, 0) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-4"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <p className="text-xs text-[var(--color-text-secondary)] mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-[var(--color-text-secondary)]" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Tag size={32} className="text-[var(--color-text-secondary)] opacity-30" />
            <p className="text-sm text-[var(--color-text-secondary)]">Henüz kupon oluşturulmadı</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-elevated)" }}>
                {["Kod", "Paket", "Süre / Kullanım", "Son Kullanma", "Durum", "İşlemler"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => {
                const expired = isCouponExpired(coupon);
                const limitReached = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;
                const status = !coupon.isActive ? "disabled" : expired ? "expired" : limitReached ? "exhausted" : "active";

                return (
                  <tr key={coupon.id} style={{ borderBottom: "1px solid var(--color-border)" }}
                    className="hover:bg-[var(--color-surface-elevated)] transition-colors">
                    {/* Kod */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold tracking-widest text-[var(--color-primary)]">
                          {coupon.code}
                        </span>
                        <button
                          onClick={() => copyCode(coupon.code, coupon.id)}
                          className="p-1 rounded opacity-40 hover:opacity-100 transition-opacity"
                        >
                          {copiedId === coupon.id
                            ? <Check size={12} className="text-[var(--color-success)]" />
                            : <Copy size={12} className="text-[var(--color-text-secondary)]" />
                          }
                        </button>
                      </div>
                      {coupon.note && (
                        <p className="text-[10px] text-[var(--color-text-secondary)] opacity-60 mt-0.5 max-w-[180px] truncate">
                          {coupon.note}
                        </p>
                      )}
                    </td>

                    {/* Paket */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-[var(--color-text-primary)]">{coupon.packageName}</span>
                    </td>

                    {/* Süre / Kullanım */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-[var(--color-text-primary)]">
                        {coupon.durationDays != null ? `${coupon.durationDays} gün` : "Süresiz"}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)] opacity-60">
                        {coupon.usedCount} / {coupon.maxUses ?? "∞"} kullanım
                      </p>
                    </td>

                    {/* Son kullanma */}
                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                      {formatDate(coupon.expiresAt)}
                    </td>

                    {/* Durum */}
                    <td className="px-4 py-3">
                      {status === "active" && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "rgba(34,197,94,0.12)", color: "var(--color-success)", border: "1px solid rgba(34,197,94,0.25)" }}>
                          Aktif
                        </span>
                      )}
                      {status === "disabled" && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "rgba(100,116,139,0.12)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
                          Devre Dışı
                        </span>
                      )}
                      {status === "expired" && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
                          Süresi Dolmuş
                        </span>
                      )}
                      {status === "exhausted" && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                          Limit Doldu
                        </span>
                      )}
                    </td>

                    {/* İşlemler */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleCoupon(coupon.id, coupon.isActive)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: coupon.isActive ? "var(--color-success)" : "var(--color-text-secondary)" }}
                          title={coupon.isActive ? "Devre dışı bırak" : "Aktif et"}
                        >
                          {coupon.isActive
                            ? <ToggleRight size={18} />
                            : <ToggleLeft size={18} />
                          }
                        </button>
                        <button
                          onClick={() => deleteCoupon(coupon.id, coupon.code)}
                          className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-red-400 transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

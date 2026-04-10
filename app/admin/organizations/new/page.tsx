"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrganization } from "@/lib/actions/organizations";
import {
  ArrowLeft,
  FlaskConical,
  User,
  Calendar,
  Percent,
  DollarSign,
  StickyNote,
  Puzzle,
} from "lucide-react";
import Link from "next/link";

// Kullanılabilir modüller listesi (Module tablosundaki sabit isimler)
const AVAILABLE_MODULES = [
  { id: "ai-diagnosis", label: "AI Tanı Asistanı" },
  { id: "ai-assistant", label: "AI Asistan" },
  { id: "cases", label: "Vaka Yönetimi" },
  { id: "patients", label: "Hasta Yönetimi" },
  { id: "lab-viewing", label: "Lab & Görüntüleme" },
  { id: "notes", label: "Klinik Notlar" },
  { id: "questions", label: "Soru Bankası" },
  { id: "flashcards", label: "Flashcard Modülü" },
  { id: "tools", label: "Klinik Araçlar" },
  { id: "source", label: "Kaynaklar" },
];

export default function NewOrganizationPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    startsAt: new Date().toISOString().slice(0, 10),
    expiresAt: "",
    markupPct: 30,
    monthlyBudgetUsd: "",
    alertThresholdPct: 80,
    notes: "",
    moduleIds: [] as string[],
  });

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Org adından slug otomatik üret
    if (name === "name") {
      setForm((prev) => ({
        ...prev,
        name: value,
        slug: value
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
      }));
    }
  }

  function toggleModule(id: string) {
    setForm((prev) => ({
      ...prev,
      moduleIds: prev.moduleIds.includes(id)
        ? prev.moduleIds.filter((m) => m !== id)
        : [...prev.moduleIds, id],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.expiresAt) {
      setError("Bitiş tarihi zorunludur.");
      return;
    }
    if (form.moduleIds.length === 0) {
      setError("En az bir modül seçmelisiniz.");
      return;
    }

    startTransition(async () => {
      try {
        await createOrganization({
          name: form.name,
          slug: form.slug,
          adminEmail: form.adminEmail,
          adminName: form.adminName,
          adminPassword: form.adminPassword,
          startsAt: form.startsAt,
          expiresAt: form.expiresAt,
          markupPct: Number(form.markupPct),
          monthlyBudgetUsd: form.monthlyBudgetUsd
            ? Number(form.monthlyBudgetUsd)
            : undefined,
          alertThresholdPct: Number(form.alertThresholdPct),
          moduleIds: form.moduleIds,
          notes: form.notes || undefined,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu.");
      }
    });
  }

  const inputCls =
    "w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors";
  const inputStyle = {
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-primary)",
  };

  const labelCls =
    "block text-xs font-semibold uppercase tracking-wider mb-1.5";

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 py-2 px-1">
        <Link
          href="/admin/organizations"
          className="p-1.5 rounded-md transition-colors hover:bg-white/5"
        >
          <ArrowLeft
            size={16}
            style={{ color: "var(--color-text-secondary)" }}
          />
        </Link>
        <div>
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Yeni Araştırma Organizasyonu
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Bilimsel araştırmacı hesabı ve izinleri tanımla
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Organizasyon Bilgileri */}
        <Section icon={FlaskConical} title="Organizasyon Bilgileri">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className={labelCls}
                style={{ color: "var(--color-text-secondary)" }}
              >
                Organizasyon Adı *
              </label>
              <input
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Atatürk Üniv. Tıp Araştırmaları"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className={labelCls}
                style={{ color: "var(--color-text-secondary)" }}
              >
                Slug (URL kısa adı) *
              </label>
              <input
                name="slug"
                required
                value={form.slug}
                onChange={handleChange}
                placeholder="ataturk-univ-tip"
                className={inputCls}
                style={inputStyle}
              />
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Otomatik üretilir, değiştirebilirsiniz
              </p>
            </div>
          </div>
          <div>
            <label
              className={labelCls}
              style={{ color: "var(--color-text-secondary)" }}
            >
              Sözleşme / İç Notlar
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Sözleşme no, ödeme koşulları vb."
              className={inputCls}
              style={inputStyle}
            />
          </div>
        </Section>

        {/* Org Admin Hesabı */}
        <Section icon={User} title="Org Admin Hesabı">
          <p
            className="text-xs mb-3"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Bu kişi kendi araştırmacılarını yönetecek ve org paneline erişecek.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className={labelCls}
                style={{ color: "var(--color-text-secondary)" }}
              >
                Ad Soyad *
              </label>
              <input
                name="adminName"
                required
                value={form.adminName}
                onChange={handleChange}
                placeholder="Prof. Dr. Ahmet Yılmaz"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className={labelCls}
                style={{ color: "var(--color-text-secondary)" }}
              >
                E-Posta *
              </label>
              <input
                name="adminEmail"
                required
                type="email"
                value={form.adminEmail}
                onChange={handleChange}
                placeholder="admin@university.edu.tr"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div className="col-span-2">
              <label
                className={labelCls}
                style={{ color: "var(--color-text-secondary)" }}
              >
                Geçici Şifre *
              </label>
              <input
                name="adminPassword"
                required
                type="text"
                value={form.adminPassword}
                onChange={handleChange}
                placeholder="İlk girişte değiştirilmeli"
                className={inputCls}
                style={inputStyle}
              />
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-warning)" }}
              >
                Bu şifreyi org admin'e güvenli şekilde iletin.
              </p>
            </div>
          </div>
        </Section>

        {/* Erişim Süresi */}
        <Section icon={Calendar} title="Erişim Süresi">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className={labelCls}
                style={{ color: "var(--color-text-secondary)" }}
              >
                Başlangıç Tarihi *
              </label>
              <input
                name="startsAt"
                required
                type="date"
                value={form.startsAt}
                onChange={handleChange}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className={labelCls}
                style={{ color: "var(--color-text-secondary)" }}
              >
                Bitiş Tarihi *
              </label>
              <input
                name="expiresAt"
                required
                type="date"
                value={form.expiresAt}
                onChange={handleChange}
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>
        </Section>

        {/* Fiyatlandırma & Bütçe */}
        <Section icon={DollarSign} title="Fiyatlandırma & Bütçe">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label
                className={labelCls}
                style={{ color: "var(--color-text-secondary)" }}
              >
                <span className="flex items-center gap-1">
                  <Percent size={10} /> Kâr Marjı (%)
                </span>
              </label>
              <input
                name="markupPct"
                type="number"
                min={0}
                max={500}
                value={form.markupPct}
                onChange={handleChange}
                className={inputCls}
                style={inputStyle}
              />
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Maliyet × (1 + marj) = satış fiyatı
              </p>
            </div>
            <div>
              <label
                className={labelCls}
                style={{ color: "var(--color-text-secondary)" }}
              >
                Aylık Bütçe Tavanı (USD)
              </label>
              <input
                name="monthlyBudgetUsd"
                type="number"
                min={0}
                value={form.monthlyBudgetUsd}
                onChange={handleChange}
                placeholder="Opsiyonel"
                className={inputCls}
                style={inputStyle}
              />
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Dolunca AI erişimi bloke olur
              </p>
            </div>
            <div>
              <label
                className={labelCls}
                style={{ color: "var(--color-text-secondary)" }}
              >
                Uyarı Eşiği (%)
              </label>
              <input
                name="alertThresholdPct"
                type="number"
                min={1}
                max={100}
                value={form.alertThresholdPct}
                onChange={handleChange}
                className={inputCls}
                style={inputStyle}
              />
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Bu % dolunca admin uyarı alır
              </p>
            </div>
          </div>
        </Section>

        {/* Modüller */}
        <Section icon={Puzzle} title="Erişilebilir Modüller">
          <p
            className="text-xs mb-3"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Araştırmacılar yalnızca seçili modüllere erişebilir.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_MODULES.map((mod) => {
              const checked = form.moduleIds.includes(mod.id);
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => toggleModule(mod.id)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-all"
                  style={{
                    border: `1px solid ${checked ? "var(--color-primary)" : "var(--color-border)"}`,
                    backgroundColor: checked
                      ? "color-mix(in srgb, var(--color-primary) 10%, transparent)"
                      : "var(--color-surface)",
                    color: checked
                      ? "var(--color-primary)"
                      : "var(--color-text-secondary)",
                  }}
                >
                  <span
                    className="w-4 h-4 rounded border flex items-center justify-center shrink-0 text-xs"
                    style={{
                      borderColor: checked
                        ? "var(--color-primary)"
                        : "var(--color-border)",
                      backgroundColor: checked
                        ? "var(--color-primary)"
                        : "transparent",
                      color: "#fff",
                    }}
                  >
                    {checked && "✓"}
                  </span>
                  {mod.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Hata mesajı */}
        {error && (
          <div
            className="px-4 py-3 rounded-lg text-sm"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--color-destructive) 12%, transparent)",
              color: "var(--color-destructive)",
              border: "1px solid var(--color-destructive)",
            }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
          >
            {isPending ? "Oluşturuluyor…" : "Organizasyon Oluştur"}
          </button>
          <Link
            href="/admin/organizations"
            className="text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            İptal
          </Link>
        </div>
      </form>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        backgroundColor: "var(--color-surface-elevated)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center gap-2">
        <Icon size={15} style={{ color: "var(--color-primary)" }} />
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

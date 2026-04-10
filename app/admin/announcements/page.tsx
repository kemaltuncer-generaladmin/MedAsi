"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ShieldCheck,
  ArrowLeft,
  Bell,
  Plus,
  X,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  Info,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getAnnouncements, saveAnnouncements } from "@/lib/actions/settings";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  target: "all" | "student" | "pro" | "admin";
  active: boolean;
  createdAt: string;
  expiresAt: string | null;
}

// ---- helpers ----

function uuid() {
  return crypto.randomUUID();
}

const TYPE_CONFIG: Record<
  Announcement["type"],
  {
    label: string;
    color: string;
    borderColor: string;
    badgeVariant: "default" | "warning" | "success" | "destructive";
    Icon: LucideIcon;
  }
> = {
  info: {
    label: "Bilgi",
    color: "var(--color-primary)",
    borderColor: "var(--color-primary)",
    badgeVariant: "default",
    Icon: Info,
  },
  warning: {
    label: "Uyarı",
    color: "var(--color-warning)",
    borderColor: "var(--color-warning)",
    badgeVariant: "warning",
    Icon: AlertTriangle,
  },
  success: {
    label: "Başarı",
    color: "var(--color-success)",
    borderColor: "var(--color-success)",
    badgeVariant: "success",
    Icon: CheckCircle2,
  },
  error: {
    label: "Hata",
    color: "var(--color-destructive)",
    borderColor: "var(--color-destructive)",
    badgeVariant: "destructive",
    Icon: AlertCircle,
  },
};

const TARGET_CONFIG: Record<Announcement["target"], { label: string }> = {
  all: { label: "Tüm Kullanıcılar" },
  student: { label: "Sadece Öğrenciler" },
  pro: { label: "Sadece Pro" },
  admin: { label: "Sadece Adminler" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---- Toggle component ----

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
      style={{
        backgroundColor: checked
          ? "var(--color-success)"
          : "var(--color-border)",
      }}
    >
      <span
        className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }}
      />
    </button>
  );
}

// ---- Preview banner ----

function AnnouncementBanner({ announcement }: { announcement: Announcement }) {
  const config = TYPE_CONFIG[announcement.type];
  const { Icon } = config;
  return (
    <div
      className="flex items-start gap-3 rounded-lg px-4 py-3"
      style={{
        backgroundColor: `color-mix(in srgb, ${config.color} 12%, var(--color-surface))`,
        borderLeft: `4px solid ${config.borderColor}`,
      }}
    >
      <Icon
        size={16}
        style={{ color: config.color }}
        className="mt-0.5 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          {announcement.title}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
          {announcement.message}
        </p>
      </div>
    </div>
  );
}

// ---- Announcement card ----

function AnnouncementCard({
  announcement,
  onToggle,
  onEdit,
  onDelete,
  dimmed,
}: {
  announcement: Announcement;
  onToggle: (id: string) => void;
  onEdit: (a: Announcement) => void;
  onDelete: (id: string) => void;
  dimmed?: boolean;
}) {
  const config = TYPE_CONFIG[announcement.type];
  const { Icon } = config;

  return (
    <div
      className="bg-[var(--color-surface-elevated)] rounded-xl overflow-hidden transition-opacity duration-200"
      style={{
        borderLeft: `4px solid ${config.borderColor}`,
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon
              size={15}
              style={{ color: config.color }}
              className="shrink-0"
            />
            <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">
              {announcement.title}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Toggle
              checked={announcement.active}
              onChange={() => onToggle(announcement.id)}
            />
            <button
              type="button"
              onClick={() => onEdit(announcement)}
              className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
              title="Düzenle"
            >
              <Edit2 size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `"${announcement.title}" duyurusunu silmek istediğinizden emin misiniz?`,
                  )
                ) {
                  onDelete(announcement.id);
                }
              }}
              className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-surface)] transition-colors"
              title="Sil"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-3 line-clamp-2">
          {announcement.message}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge variant={config.badgeVariant}>{config.label}</Badge>
          <Badge variant="secondary">
            {TARGET_CONFIG[announcement.target].label}
          </Badge>
          <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
            <Clock size={10} />
            {formatDate(announcement.createdAt)}
          </span>
          <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
            <Calendar size={10} />
            {announcement.expiresAt
              ? formatDate(announcement.expiresAt)
              : "Süresiz"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---- Blank form state ----

const EMPTY_FORM = {
  title: "",
  message: "",
  type: "info" as Announcement["type"],
  target: "all" as Announcement["target"],
  expiresAt: "",
};

// ---- Main page ----

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [passiveOpen, setPassiveOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Load from database
  useEffect(() => {
    getAnnouncements()
      .then((rows) => setAnnouncements(rows))
      .catch(() => toast.error("Duyurular yüklenemedi"))
      .finally(() => setHydrated(true));
  }, []);

  const active = announcements.filter((a) => a.active);
  const inactive = announcements.filter((a) => !a.active);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setTimeout(
      () =>
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  }

  function openEdit(a: Announcement) {
    setEditingId(a.id);
    setForm({
      title: a.title,
      message: a.message,
      type: a.type,
      target: a.target,
      expiresAt: a.expiresAt ?? "",
    });
    setShowForm(true);
    setTimeout(
      () =>
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  }

  async function handleToggle(id: string) {
    const next = announcements.map((a) =>
      a.id === id ? { ...a, active: !a.active } : a,
    );
    setAnnouncements(next);
    try {
      await saveAnnouncements(next);
    } catch {
      toast.error("Duyuru güncellenemedi");
    }
  }

  async function handleDelete(id: string) {
    const next = announcements.filter((a) => a.id !== id);
    setAnnouncements(next);
    try {
      await saveAnnouncements(next);
      toast.success("Duyuru silindi");
    } catch {
      toast.error("Duyuru silinemedi");
    }
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Başlık zorunludur");
      return;
    }
    if (!form.message.trim()) {
      toast.error("Mesaj zorunludur");
      return;
    }

    let next: Announcement[];

    if (editingId) {
      next = announcements.map((a) =>
        a.id === editingId
          ? {
              ...a,
              title: form.title.trim(),
              message: form.message.trim(),
              type: form.type,
              target: form.target,
              expiresAt: form.expiresAt || null,
            }
          : a,
      );
    } else {
      const newAnnouncement: Announcement = {
        id: uuid(),
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        target: form.target,
        active: true,
        createdAt: new Date().toISOString(),
        expiresAt: form.expiresAt || null,
      };
      next = [newAnnouncement, ...announcements];
    }

    setAnnouncements(next);
    try {
      await saveAnnouncements(next);
      toast.success(editingId ? "Duyuru güncellendi" : "Duyuru oluşturuldu");
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch {
      toast.error("Duyuru kaydedilemedi");
    }
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  const previewAnnouncement: Announcement = {
    id: "preview",
    title: form.title || "Duyuru başlığı buraya gelecek",
    message:
      form.message ||
      "Duyuru mesajı buraya gelecek. Kullanıcılar bu metni görecek.",
    type: form.type,
    target: form.target,
    active: true,
    createdAt: new Date().toISOString(),
    expiresAt: form.expiresAt || null,
  };

  const firstActive = active[0];

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <ShieldCheck size={22} className="text-[var(--color-primary)]" />
          <span className="text-lg font-bold text-[var(--color-text-primary)] tracking-wide">
            MED<span className="text-[var(--color-primary)]">ASI</span>{" "}
            <span className="text-[var(--color-text-secondary)] font-normal text-sm ml-1">
              Admin Panel
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus size={14} />
            Yeni Duyuru
          </Button>
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={15} />
              Geri Dön
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Page title */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell size={22} className="text-[var(--color-primary)]" />
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Duyuru Yönetimi
            </h1>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Kullanıcılara gösterilecek duyuruları oluşturun ve yönetin.
          </p>
        </div>

        {/* Live preview banner — shows first active announcement */}
        {firstActive && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Eye size={13} className="text-[var(--color-text-secondary)]" />
              <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Kullanıcı Önizlemesi
              </span>
            </div>
            <AnnouncementBanner announcement={firstActive} />
          </div>
        )}

        {/* Create / Edit form */}
        {showForm && (
          <div
            ref={formRef}
            className="bg-[var(--color-surface-elevated)] rounded-xl overflow-hidden"
            style={{ borderTop: "3px solid var(--color-primary)" }}
          >
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                {editingId ? "Duyuruyu Düzenle" : "Yeni Duyuru Oluştur"}
              </h2>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: form fields */}
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                    Başlık{" "}
                    <span className="text-[var(--color-destructive)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    maxLength={100}
                    placeholder="Duyuru başlığını girin"
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                    Mesaj{" "}
                    <span className="text-[var(--color-destructive)]">*</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, message: e.target.value }))
                    }
                    maxLength={300}
                    rows={4}
                    placeholder="Duyuru mesajını girin (max 300 karakter)"
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 text-right">
                    {form.message.length} / 300
                  </p>
                </div>

                {/* Type + Target row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                      Tür
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          type: e.target.value as Announcement["type"],
                        }))
                      }
                      className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    >
                      {(Object.keys(TYPE_CONFIG) as Announcement["type"][]).map(
                        (t) => (
                          <option key={t} value={t}>
                            {TYPE_CONFIG[t].label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                      Hedef Kitle
                    </label>
                    <select
                      value={form.target}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          target: e.target.value as Announcement["target"],
                        }))
                      }
                      className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    >
                      {(
                        Object.keys(TARGET_CONFIG) as Announcement["target"][]
                      ).map((t) => (
                        <option key={t} value={t}>
                          {TARGET_CONFIG[t].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Expiry date */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                    Bitiş Tarihi{" "}
                    <span className="text-[var(--color-text-secondary)] font-normal">
                      (isteğe bağlı)
                    </span>
                  </label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, expiresAt: e.target.value }))
                    }
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                  {!form.expiresAt && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      Belirtilmezse süresiz gösterilir
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="primary" size="sm" onClick={handleSave}>
                    {editingId ? "Güncelle" : "Kaydet"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCancel}>
                    İptal
                  </Button>
                </div>
              </div>

              {/* Right: live preview */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Eye
                    size={13}
                    className="text-[var(--color-text-secondary)]"
                  />
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Canlı Önizleme
                  </span>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] p-4 space-y-3 bg-[var(--color-background)]">
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    Dashboard'da şöyle görünecek:
                  </p>
                  <AnnouncementBanner announcement={previewAnnouncement} />

                  <div className="pt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        Tür:
                      </span>
                      <Badge variant={TYPE_CONFIG[form.type].badgeVariant}>
                        {TYPE_CONFIG[form.type].label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users
                        size={11}
                        className="text-[var(--color-text-secondary)]"
                      />
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {TARGET_CONFIG[form.target].label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar
                        size={11}
                        className="text-[var(--color-text-secondary)]"
                      />
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {form.expiresAt
                          ? `${formatDate(form.expiresAt)} tarihinde sona erer`
                          : "Süresiz"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active announcements */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Aktif Duyurular
              </h2>
              {active.length > 0 && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--color-success) 15%, transparent)",
                    color: "var(--color-success)",
                  }}
                >
                  {active.length}
                </span>
              )}
            </div>
            {!showForm && (
              <Button variant="primary" size="sm" onClick={openCreate}>
                <Plus size={14} />
                Yeni Duyuru
              </Button>
            )}
          </div>

          {active.length === 0 ? (
            <div className="bg-[var(--color-surface-elevated)] rounded-xl p-10 text-center">
              <Bell
                size={32}
                className="text-[var(--color-text-secondary)] mx-auto mb-3 opacity-40"
              />
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                Aktif duyuru yok
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1 mb-4">
                Yeni bir duyuru oluşturun veya pasif duyurulardan birini
                aktifleştirin.
              </p>
              <Button variant="primary" size="sm" onClick={openCreate}>
                <Plus size={14} />
                İlk Duyuruyu Oluştur
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((a) => (
                <AnnouncementCard
                  key={a.id}
                  announcement={a}
                  onToggle={handleToggle}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Passive announcements (accordion) */}
        <div>
          <button
            type="button"
            onClick={() => setPassiveOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 rounded-xl bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Pasif Duyurular
              </h2>
              {inactive.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--color-border)] text-[var(--color-text-secondary)]">
                  {inactive.length}
                </span>
              )}
            </div>
            {passiveOpen ? (
              <ChevronUp
                size={16}
                className="text-[var(--color-text-secondary)]"
              />
            ) : (
              <ChevronDown
                size={16}
                className="text-[var(--color-text-secondary)]"
              />
            )}
          </button>

          {passiveOpen && (
            <div className="mt-3 space-y-3">
              {inactive.length === 0 ? (
                <div className="bg-[var(--color-surface-elevated)] rounded-xl p-8 text-center">
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Pasif duyuru yok
                  </p>
                </div>
              ) : (
                inactive.map((a) => (
                  <AnnouncementCard
                    key={a.id}
                    announcement={a}
                    onToggle={handleToggle}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    dimmed
                  />
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

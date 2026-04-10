"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Library, Plus, Search, X, Edit2, Trash2, Check, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import {
  TUS_SUBJECTS_WITH_OTHER,
  TUS_SUBJECT_COLORS,
  type TusSubjectOrOther,
} from "@/constants/tus";

const STORAGE_KEY = "medasi_textbooks_v1";

type Subject = TusSubjectOrOther;

const SUBJECTS: Subject[] = [...TUS_SUBJECTS_WITH_OTHER];

const SUBJECT_COLORS: Record<Subject, string> = TUS_SUBJECT_COLORS;

interface Book {
  id: string;
  title: string;
  author: string;
  subject: Subject;
  totalPages: number;
  readPages: number;
  edition: string;
  year: string;
  notes: string;
  addedAt: string;
}

function load(): Book[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function save(books: Book[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

const emptyForm = (): Omit<Book, "id" | "addedAt"> => ({
  title: "",
  author: "",
  subject: "Diğer",
  totalPages: 0,
  readPages: 0,
  edition: "",
  year: "",
  notes: "",
});

function getStatus(book: Book): {
  label: string;
  variant: "success" | "warning" | "secondary";
} {
  const pct = book.totalPages > 0 ? book.readPages / book.totalPages : 0;
  if (pct >= 1) return { label: "Tamamlandı", variant: "success" };
  if (pct > 0) return { label: "Devam Ediyor", variant: "warning" };
  return { label: "Başlanmadı", variant: "secondary" };
}

export default function TextbooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [editingProgressId, setEditingProgressId] = useState<string | null>(
    null,
  );
  const [progressInput, setProgressInput] = useState("");

  useEffect(() => {
    setBooks(load());
  }, []);

  const filtered = books.filter((b) => {
    const matchSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase());
    const matchSubject = subjectFilter === "all" || b.subject === subjectFilter;
    return matchSearch && matchSubject;
  });

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  }
  function openEdit(book: Book) {
    setEditingId(book.id);
    setForm({
      title: book.title,
      author: book.author,
      subject: book.subject,
      totalPages: book.totalPages,
      readPages: book.readPages,
      edition: book.edition,
      year: book.year,
      notes: book.notes,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.title.trim()) {
      toast.error("Kitap adı zorunludur");
      return;
    }
    if (!form.author.trim()) {
      toast.error("Yazar adı zorunludur");
      return;
    }
    if (form.totalPages <= 0) {
      toast.error("Sayfa sayısı 0'dan büyük olmalıdır");
      return;
    }
    if (form.readPages > form.totalPages) {
      toast.error("Okunan sayfa toplam sayfayı geçemez");
      return;
    }

    if (editingId) {
      const updated = books.map((b) =>
        b.id === editingId ? { ...b, ...form } : b,
      );
      setBooks(updated);
      save(updated);
      toast.success("Kitap güncellendi");
    } else {
      const newBook: Book = {
        id: Date.now().toString(),
        ...form,
        addedAt: new Date().toLocaleDateString("tr-TR"),
      };
      const updated = [newBook, ...books];
      setBooks(updated);
      save(updated);
      toast.success("Kitap eklendi");
    }
    setShowModal(false);
  }

  function handleDelete(id: string) {
    const updated = books.filter((b) => b.id !== id);
    setBooks(updated);
    save(updated);
    toast.success("Kitap silindi");
  }

  function saveProgress(book: Book) {
    const pages = parseInt(progressInput);
    if (isNaN(pages) || pages < 0) {
      toast.error("Geçerli bir sayı girin");
      return;
    }
    if (pages > book.totalPages) {
      toast.error("Okunan sayfa toplam sayfayı geçemez");
      return;
    }
    const updated = books.map((b) =>
      b.id === book.id ? { ...b, readPages: pages } : b,
    );
    setBooks(updated);
    save(updated);
    setEditingProgressId(null);
    toast.success("İlerleme güncellendi");
  }

  const completedCount = books.filter(
    (b) => b.totalPages > 0 && b.readPages >= b.totalPages,
  ).length;
  const inProgressCount = books.filter(
    (b) => b.readPages > 0 && b.readPages < b.totalPages,
  ).length;
  const totalPages = books.reduce((s, b) => s + b.readPages, 0);

  const inputCls =
    "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors";

  return (
    <div className="flex flex-col gap-5">
      {/* AI Uyarı Banner */}
      <div className="rounded-2xl border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-5 py-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-[var(--color-warning)] shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-[var(--color-warning)] text-sm">Yapay Zeka Bu İçerikleri Kullanamaz</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Yüklediğiniz ders kitapları telif hakkı nedeniyle AI sistemlerine aktarılamaz.
            AI Asistan bu dosyaların içeriğini doğrudan okuyamaz.
            Bunun yerine Akıllı Asistan&apos;da kendi notlarınızı kullanabilirsiniz.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Library size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
              Ders Kitapları
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">
            Kitaplığınızı ve okuma ilerlemenizi takip edin
          </p>
        </div>
        <Button variant="primary" onClick={openAdd}>
          <Plus size={15} />
          Kitap Ekle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Toplam Kitap", value: books.length },
          { label: "Tamamlandı", value: completedCount },
          { label: "Devam Ediyor", value: inProgressCount },
          { label: "Okunan Sayfa", value: totalPages.toLocaleString("tr-TR") },
        ].map((s) => (
          <Card key={s.label} variant="bordered" className="p-4">
            <p className="text-2xl font-bold text-[var(--color-primary)]">
              {s.value}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kitap veya yazar ara..."
            className={`${inputCls} pl-9`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", ...SUBJECTS].map((s) => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${subjectFilter === s ? "bg-[var(--color-primary)] text-black" : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
            >
              {s === "all" ? "Tümü" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Books Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Library size={32} className="text-[var(--color-text-secondary)]" />
          <p className="text-[var(--color-text-primary)] font-medium">
            {books.length === 0 ? "Henüz kitap eklenmedi" : "Sonuç bulunamadı"}
          </p>
          <p className="text-[var(--color-text-secondary)] text-sm">
            {books.length === 0
              ? "İlk kitabınızı ekleyerek başlayın"
              : "Arama kriterlerini değiştirin"}
          </p>
          {books.length === 0 && (
            <Button variant="primary" size="sm" onClick={openAdd}>
              <Plus size={14} />
              İlk Kitabı Ekle
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((book) => {
            const pct =
              book.totalPages > 0
                ? Math.round((book.readPages / book.totalPages) * 100)
                : 0;
            const status = getStatus(book);
            const color = SUBJECT_COLORS[book.subject] ?? "#64748b";
            return (
              <Card
                key={book.id}
                variant="bordered"
                className="p-4 hover:border-[var(--color-primary)]/30 transition-colors flex flex-col gap-3"
              >
                {/* Cover + Info */}
                <div className="flex gap-4">
                  <div
                    className="w-14 h-20 rounded-lg flex items-center justify-center text-2xl font-bold text-white shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {book.title.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--color-text-primary)] leading-tight line-clamp-2">
                      {book.title}
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                      {book.author}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {book.subject}
                      </Badge>
                      <Badge variant={status.variant} className="text-xs">
                        {status.label}
                      </Badge>
                    </div>
                    {(book.edition || book.year) && (
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        {[book.edition && `${book.edition}. Baskı`, book.year]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      Okuma İlerlemesi
                    </span>
                    {editingProgressId === book.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={book.totalPages}
                          value={progressInput}
                          onChange={(e) => setProgressInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveProgress(book);
                            if (e.key === "Escape") setEditingProgressId(null);
                          }}
                          className="w-16 bg-[var(--color-surface)] border border-[var(--color-primary)] rounded px-2 py-0.5 text-xs text-[var(--color-text-primary)] focus:outline-none"
                          autoFocus
                        />
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          / {book.totalPages}
                        </span>
                        <button
                          onClick={() => saveProgress(book)}
                          className="p-0.5 text-[var(--color-success)] hover:opacity-80"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setEditingProgressId(null)}
                          className="p-0.5 text-[var(--color-text-secondary)] hover:opacity-80"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingProgressId(book.id);
                          setProgressInput(String(book.readPages));
                        }}
                        className="text-xs font-medium text-[var(--color-primary)] hover:opacity-80 transition-opacity"
                      >
                        {book.readPages} / {book.totalPages} ({pct}%)
                      </button>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor:
                          pct >= 100
                            ? "var(--color-success)"
                            : pct > 0
                              ? "var(--color-primary)"
                              : "transparent",
                      }}
                    />
                  </div>
                </div>

                {book.notes && (
                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 border-t border-[var(--color-border)] pt-2">
                    {book.notes}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {book.addedAt}
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(book)}
                      className="p-1.5 rounded hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(book.id)}
                      className="p-1.5 rounded hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] rounded-xl p-6 w-full max-w-lg border border-[var(--color-border)] flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                {editingId ? "Kitabı Düzenle" : "Yeni Kitap Ekle"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Kitap Adı *
                </label>
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Kitap adı"
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Yazar *
                </label>
                <input
                  value={form.author}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, author: e.target.value }))
                  }
                  placeholder="Yazar adı"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Konu
                </label>
                <select
                  value={form.subject}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      subject: e.target.value as Subject,
                    }))
                  }
                  className={inputCls}
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Baskı
                </label>
                <input
                  value={form.edition}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, edition: e.target.value }))
                  }
                  placeholder="örn. 5"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Toplam Sayfa *
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.totalPages || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      totalPages: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Okunan Sayfa
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.readPages || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      readPages: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Yıl
                </label>
                <input
                  value={form.year}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, year: e.target.value }))
                  }
                  placeholder="2024"
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Notlar
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Kitap hakkında notlar..."
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                İptal
              </Button>
              <Button variant="primary" onClick={handleSave} className="flex-1">
                {editingId ? "Güncelle" : "Ekle"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

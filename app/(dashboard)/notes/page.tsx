"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StickyNote, Plus, Search, Trash2, Edit2, Save, X } from "lucide-react";
import toast from "react-hot-toast";

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "medasi_user_notes";

function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [editing, setEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Note | null>(null);

  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  function startNew() {
    setSelected(null);
    setTitle("");
    setContent("");
    setEditing(true);
    setIsNew(true);
  }

  function selectNote(note: Note) {
    setSelected(note);
    setTitle(note.title);
    setContent(note.content);
    setEditing(false);
    setIsNew(false);
  }

  function startEdit() {
    setEditing(true);
    setIsNew(false);
  }

  function cancelEdit() {
    if (isNew) {
      setSelected(null);
      setEditing(false);
      setIsNew(false);
    } else {
      if (selected) {
        setTitle(selected.title);
        setContent(selected.content);
      }
      setEditing(false);
    }
  }

  function saveNote() {
    if (!title.trim() && !content.trim()) {
      toast.error("Başlık veya içerik giriniz");
      return;
    }
    const now = new Date().toISOString();
    if (isNew || !selected) {
      const note: Note = {
        id: Date.now().toString(),
        title: title.trim() || "İsimsiz Not",
        content,
        createdAt: now,
        updatedAt: now,
      };
      const updated = [note, ...notes];
      setNotes(updated);
      saveNotes(updated);
      setSelected(note);
      setIsNew(false);
      setEditing(false);
      toast.success("Not kaydedildi");
    } else {
      const updated = notes.map((n) =>
        n.id === selected.id
          ? {
              ...n,
              title: title.trim() || "İsimsiz Not",
              content,
              updatedAt: now,
            }
          : n,
      );
      setNotes(updated);
      saveNotes(updated);
      setSelected({
        ...selected,
        title: title.trim() || "İsimsiz Not",
        content,
        updatedAt: now,
      });
      setEditing(false);
      toast.success("Not güncellendi");
    }
  }

  function deleteNote(note: Note) {
    const updated = notes.filter((n) => n.id !== note.id);
    setNotes(updated);
    saveNotes(updated);
    setConfirmDelete(null);
    if (selected?.id === note.id) {
      setSelected(null);
      setEditing(false);
      setIsNew(false);
    }
    toast.success("Not silindi");
  }

  function formatDate(s: string) {
    const d = new Date(s);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 3600000) return "Az önce";
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} saat önce`;
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  }

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
          <StickyNote size={20} className="text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Notlarım
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Kişisel notlarınız ve çalışma kayıtları
          </p>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-200px)]">
        <div className="w-72 shrink-0 flex flex-col gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={startNew}
            className="w-full"
          >
            <Plus size={14} />
            Yeni Not
          </Button>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Notlarda ara..."
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <div className="text-center py-8">
                <StickyNote
                  size={24}
                  className="text-[var(--color-text-secondary)] mx-auto mb-2"
                />
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {search
                    ? "Sonuç bulunamadı"
                    : "Notunuz yok. Yeni not oluşturun."}
                </p>
              </div>
            ) : (
              filtered.map((note) => (
                <div
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={[
                    "px-3 py-2.5 rounded-lg cursor-pointer transition-all group",
                    selected?.id === note.id
                      ? "bg-[var(--color-surface-elevated)] border-l-2 border-[var(--color-primary)]"
                      : "hover:bg-[var(--color-surface)]",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm font-medium truncate ${selected?.id === note.id ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]"}`}
                    >
                      {note.title}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">
                    {note.content.slice(0, 50)}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 opacity-60">
                    {formatDate(note.updatedAt)}
                  </p>
                </div>
              ))
            )}
          </div>
          <Badge variant="default" className="text-center">
            {notes.length} not
          </Badge>
        </div>

        <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden flex flex-col">
          {!selected && !editing ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center">
                <Edit2
                  size={24}
                  className="text-[var(--color-text-secondary)]"
                />
              </div>
              <div className="text-center">
                <p className="text-[var(--color-text-primary)] font-medium">
                  Bir not seçin
                </p>
                <p className="text-[var(--color-text-secondary)] text-sm mt-1">
                  veya yeni not oluşturun
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={startNew}>
                <Plus size={14} />
                Yeni Not
              </Button>
            </div>
          ) : editing ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {isNew ? "Yeni Not" : "Düzenleniyor"}
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelEdit}>
                    <X size={14} />
                    İptal
                  </Button>
                  <Button variant="primary" size="sm" onClick={saveNote}>
                    <Save size={14} />
                    Kaydet
                  </Button>
                </div>
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Başlık..."
                className="w-full bg-transparent border-b border-[var(--color-border)] px-5 py-3 text-xl font-bold text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="İçerik yazın..."
                className="flex-1 w-full bg-transparent px-5 py-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none resize-none leading-relaxed"
                autoFocus
              />
              <div className="px-5 py-2 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {content.length} karakter
                </p>
              </div>
            </div>
          ) : selected ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Son güncelleme: {formatDate(selected.updatedAt)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(selected)}
                  >
                    <Trash2 size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={startEdit}>
                    <Edit2 size={14} />
                    Düzenle
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
                  {selected.title}
                </h2>
                <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                  {selected.content}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] rounded-xl p-6 w-full max-w-sm border border-[var(--color-border)]">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
              Notu Sil
            </h2>
            <p className="text-[var(--color-text-secondary)] text-sm mb-6">
              <span className="text-[var(--color-text-primary)] font-medium">
                &ldquo;{confirmDelete.title}&rdquo;
              </span>{" "}
              notunu silmek istediğinizden emin misiniz?
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
                onClick={() => deleteNote(confirmDelete)}
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

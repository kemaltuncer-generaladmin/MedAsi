"use client";

import { useState, useEffect } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Stethoscope,
  Plus,
  Trash2,
  Star,
  CheckCircle2,
  Circle,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

const STORAGE_KEY = "medasi_intern_planner_v1";

type RotationStatus = "upcoming" | "active" | "completed";

type Skill = {
  id: string;
  label: string;
  done: boolean;
};

type Rotation = {
  id: string;
  department: string;
  hospital: string;
  supervisor: string;
  startDate: string;
  endDate: string;
  status: RotationStatus;
  rating: number;
  notes: string;
  skills: Skill[];
};

const STATUS_LABELS: Record<RotationStatus, string> = {
  upcoming: "Yaklaşan",
  active: "Aktif",
  completed: "Tamamlandı",
};

const STATUS_BADGE: Record<
  RotationStatus,
  "secondary" | "warning" | "success"
> = {
  upcoming: "secondary",
  active: "warning",
  completed: "success",
};

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function diffDays(start: string, end: string) {
  if (!start || !end) return 0;
  return Math.max(
    0,
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000),
  );
}

const EMPTY_FORM = {
  department: "",
  hospital: "",
  supervisor: "",
  startDate: "",
  endDate: "",
  status: "upcoming" as RotationStatus,
  notes: "",
};

export default function InternPlannerPage() {
  const [rotations, setRotations] = useState<Rotation[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newSkillText, setNewSkillText] = useState<Record<string, string>>({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rotations));
  }, [rotations]);

  const sorted = [...rotations].sort((a, b) =>
    (a.startDate || "").localeCompare(b.startDate || ""),
  );
  const totalDays = rotations.reduce(
    (s, r) => s + diffDays(r.startDate, r.endDate),
    0,
  );
  const completedCount = rotations.filter(
    (r) => r.status === "completed",
  ).length;
  const activeRotation = rotations.find((r) => r.status === "active");

  function addRotation() {
    if (!form.department.trim()) {
      toast.error("Bölüm adı giriniz");
      return;
    }
    const rotation: Rotation = {
      id: newId(),
      ...form,
      rating: 0,
      skills: [],
    };
    setRotations((prev) => [...prev, rotation]);
    setForm(EMPTY_FORM);
    setShowModal(false);
    toast.success("Rotasyon eklendi");
  }

  function deleteRotation(id: string) {
    setRotations((prev) => prev.filter((r) => r.id !== id));
    toast.success("Rotasyon silindi");
  }

  function setRating(id: string, rating: number) {
    setRotations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, rating } : r)),
    );
  }

  function updateNotes(id: string, notes: string) {
    setRotations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, notes } : r)),
    );
  }

  function addSkill(rotationId: string) {
    const text = (newSkillText[rotationId] || "").trim();
    if (!text) return;
    const skill: Skill = { id: newId(), label: text, done: false };
    setRotations((prev) =>
      prev.map((r) =>
        r.id === rotationId ? { ...r, skills: [...r.skills, skill] } : r,
      ),
    );
    setNewSkillText((prev) => ({ ...prev, [rotationId]: "" }));
  }

  function toggleSkill(rotationId: string, skillId: string) {
    setRotations((prev) =>
      prev.map((r) =>
        r.id === rotationId
          ? {
              ...r,
              skills: r.skills.map((s) =>
                s.id === skillId ? { ...s, done: !s.done } : s,
              ),
            }
          : r,
      ),
    );
  }

  function deleteSkill(rotationId: string, skillId: string) {
    setRotations((prev) =>
      prev.map((r) =>
        r.id === rotationId
          ? { ...r, skills: r.skills.filter((s) => s.id !== skillId) }
          : r,
      ),
    );
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-success)]/10 flex items-center justify-center">
            <Stethoscope size={20} className="text-[var(--color-success)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
              İntern Planlayıcı
            </h1>
            <p className="text-[var(--color-text-secondary)] text-sm">
              İnternlük dönemi rotasyon takibi
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Rotasyon Ekle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">
            Toplam Gün
          </p>
          <p className="text-2xl font-bold text-[var(--color-primary)]">
            {totalDays}
          </p>
        </Card>
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">
            Tamamlanan
          </p>
          <p className="text-2xl font-bold text-[var(--color-success)]">
            {completedCount}/{rotations.length}
          </p>
        </Card>
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">
            Aktif Rotasyon
          </p>
          <p className="text-sm font-bold text-[var(--color-warning)] truncate">
            {activeRotation ? activeRotation.department : "—"}
          </p>
        </Card>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card variant="elevated" className="w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Rotasyon Ekle</CardTitle>
              <button onClick={() => setShowModal(false)}>
                <X size={18} className="text-[var(--color-text-secondary)]" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                {
                  label: "Bölüm",
                  key: "department",
                  placeholder: "Dahiliye...",
                },
                {
                  label: "Hastane",
                  key: "hospital",
                  placeholder: "Hastane adı...",
                },
                {
                  label: "Sorumlu Hekim",
                  key: "supervisor",
                  placeholder: "Dr. Ad Soyad...",
                },
              ].map((f) => (
                <div
                  key={f.key}
                  className={f.key === "department" ? "col-span-2" : ""}
                >
                  <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">
                    {f.label}
                  </label>
                  <input
                    value={(form as Record<string, string>)[f.key]}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                    placeholder={f.placeholder}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">
                  Başlangıç
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">
                  Bitiş
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">
                  Durum
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as RotationStatus,
                    }))
                  }
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="upcoming">Yaklaşan</option>
                  <option value="active">Aktif</option>
                  <option value="completed">Tamamlandı</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addRotation}>
                <Plus size={14} /> Ekle
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowModal(false)}
              >
                İptal
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Rotation Timeline */}
      {sorted.length === 0 ? (
        <Card variant="bordered" className="p-8 text-center">
          <p className="text-[var(--color-text-secondary)]">
            Henüz rotasyon eklenmedi
          </p>
          <Button size="sm" className="mt-3" onClick={() => setShowModal(true)}>
            <Plus size={14} /> İlk Rotasyonu Ekle
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((rot, idx) => {
            const days = diffDays(rot.startDate, rot.endDate);
            const isOpen = expanded[rot.id];
            const skillsDone = rot.skills.filter((s) => s.done).length;
            const isActive = rot.status === "active";
            return (
              <Card
                key={rot.id}
                variant={isActive ? "elevated" : "bordered"}
                className={`p-0 overflow-hidden ${isActive ? "ring-1 ring-[var(--color-warning)]/40" : ""}`}
              >
                {/* Timeline line */}
                <div className="flex">
                  <div className="flex flex-col items-center px-4 pt-4 pb-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        background: isActive
                          ? "var(--color-warning)"
                          : rot.status === "completed"
                            ? "var(--color-success)"
                            : "var(--color-border)",
                      }}
                    />
                    {idx < sorted.length - 1 && (
                      <div
                        className="w-0.5 flex-1 mt-1"
                        style={{
                          background: "var(--color-border)",
                          minHeight: 20,
                        }}
                      />
                    )}
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-[var(--color-text-primary)]">
                            {rot.department}
                          </p>
                          <Badge variant={STATUS_BADGE[rot.status]}>
                            {STATUS_LABELS[rot.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                          {rot.hospital}
                          {rot.supervisor ? ` · Dr. ${rot.supervisor}` : ""}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {rot.startDate || "?"} — {rot.endDate || "?"} ({days}{" "}
                          gün)
                        </p>
                        {rot.status === "completed" && (
                          <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setRating(rot.id, star)}
                              >
                                <Star
                                  size={14}
                                  fill={
                                    star <= rot.rating
                                      ? "var(--color-warning)"
                                      : "transparent"
                                  }
                                  style={{
                                    color:
                                      star <= rot.rating
                                        ? "var(--color-warning)"
                                        : "var(--color-border)",
                                  }}
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {rot.skills.length > 0 && (
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            {skillsDone}/{rot.skills.length} beceri
                          </span>
                        )}
                        <button onClick={() => toggleExpanded(rot.id)}>
                          {isOpen ? (
                            <ChevronDown
                              size={16}
                              className="text-[var(--color-text-secondary)]"
                            />
                          ) : (
                            <ChevronRight
                              size={16}
                              className="text-[var(--color-text-secondary)]"
                            />
                          )}
                        </button>
                        <button onClick={() => deleteRotation(rot.id)}>
                          <Trash2
                            size={14}
                            className="text-[var(--color-destructive)] opacity-50 hover:opacity-100"
                          />
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-3 space-y-3 border-t border-[var(--color-border)] pt-3">
                        {/* Notes */}
                        <div>
                          <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                            Notlar
                          </p>
                          <textarea
                            value={rot.notes}
                            onChange={(e) =>
                              updateNotes(rot.id, e.target.value)
                            }
                            rows={2}
                            placeholder="Rotasyon notlarınız..."
                            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] resize-none"
                          />
                        </div>
                        {/* Skills */}
                        <div>
                          <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">
                            Beceri Listesi
                          </p>
                          <div className="space-y-1.5 mb-2">
                            {rot.skills.map((sk) => (
                              <div
                                key={sk.id}
                                className="flex items-center gap-2"
                              >
                                <button
                                  onClick={() => toggleSkill(rot.id, sk.id)}
                                >
                                  {sk.done ? (
                                    <CheckCircle2
                                      size={14}
                                      style={{ color: "var(--color-success)" }}
                                    />
                                  ) : (
                                    <Circle
                                      size={14}
                                      className="text-[var(--color-text-secondary)]"
                                    />
                                  )}
                                </button>
                                <span
                                  className={`text-sm flex-1 ${sk.done ? "line-through text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]"}`}
                                >
                                  {sk.label}
                                </span>
                                <button
                                  onClick={() => deleteSkill(rot.id, sk.id)}
                                >
                                  <X
                                    size={11}
                                    className="text-[var(--color-destructive)] opacity-40 hover:opacity-100"
                                  />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              value={newSkillText[rot.id] || ""}
                              onChange={(e) =>
                                setNewSkillText((prev) => ({
                                  ...prev,
                                  [rot.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" && addSkill(rot.id)
                              }
                              placeholder="Yeni beceri ekle..."
                              className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                            />
                            <Button size="sm" onClick={() => addSkill(rot.id)}>
                              <Plus size={12} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

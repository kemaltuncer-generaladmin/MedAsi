"use client";

import { useState, useEffect } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BookMarked, RotateCcw, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";

const STORAGE_KEY = "medasi_preklinik_planner_v1";
const PASS_GRADE = 60;

type Course = {
  name: string;
  credits: number;
};

type TermCourses = {
  term: string;
  courses: Course[];
};

const TERMS: TermCourses[] = [
  {
    term: "1. Yarıyıl",
    courses: [
      { name: "Anatomi", credits: 9 },
      { name: "Histoloji-Embriyoloji", credits: 5 },
      { name: "Tıbbi Biyoloji ve Genetik", credits: 4 },
      { name: "Tıbbi Biyokimya", credits: 5 },
      { name: "Davranış Bilimleri", credits: 2 },
      { name: "Biyoistatistik", credits: 3 },
    ],
  },
  {
    term: "2. Yarıyıl",
    courses: [
      { name: "Anatomi", credits: 9 },
      { name: "Histoloji-Embriyoloji", credits: 5 },
      { name: "Fizyoloji - Histoloji - Embriyoloji", credits: 6 },
      { name: "Tıbbi Biyokimya", credits: 5 },
      { name: "Tıbbi Mikrobiyoloji", credits: 3 },
      { name: "Biyoistatistik", credits: 2 },
    ],
  },
  {
    term: "3. Yarıyıl",
    courses: [
      { name: "Fizyoloji - Histoloji - Embriyoloji", credits: 7 },
      { name: "Tıbbi Patoloji", credits: 6 },
      { name: "Tıbbi Farmakoloji", credits: 6 },
      { name: "Tıbbi Mikrobiyoloji", credits: 4 },
      { name: "Davranış Bilimleri", credits: 2 },
      { name: "Biyoistatistik", credits: 2 },
    ],
  },
  {
    term: "4. Yarıyıl",
    courses: [
      { name: "Tıbbi Patoloji", credits: 7 },
      { name: "Tıbbi Farmakoloji", credits: 6 },
      { name: "Tıbbi Mikrobiyoloji", credits: 4 },
      { name: "Fizyoloji - Histoloji - Embriyoloji", credits: 4 },
      { name: "Davranış Bilimleri", credits: 2 },
      { name: "Biyoistatistik", credits: 2 },
    ],
  },
];

type GradeMap = Record<string, string>; // key: `${termIdx}::${courseName}`, value: grade string

function courseKey(termIdx: number, courseName: string) {
  return `${termIdx}::${courseName}`;
}

function calcGPA(grades: GradeMap): number {
  let totalPoints = 0;
  let totalCredits = 0;
  TERMS.forEach((term, tIdx) => {
    term.courses.forEach((course) => {
      const raw = grades[courseKey(tIdx, course.name)];
      if (raw !== undefined && raw !== "") {
        const g = parseFloat(raw);
        if (!isNaN(g)) {
          totalPoints += g * course.credits;
          totalCredits += course.credits;
        }
      }
    });
  });
  if (totalCredits === 0) return 0;
  return totalPoints / totalCredits;
}

function termGPA(grades: GradeMap, termIdx: number, courses: Course[]): number {
  let totalPoints = 0;
  let totalCredits = 0;
  courses.forEach((course) => {
    const raw = grades[courseKey(termIdx, course.name)];
    if (raw !== undefined && raw !== "") {
      const g = parseFloat(raw);
      if (!isNaN(g)) {
        totalPoints += g * course.credits;
        totalCredits += course.credits;
      }
    }
  });
  if (totalCredits === 0) return 0;
  return totalPoints / totalCredits;
}

export default function PreklinikPlannerPage() {
  const [activeTermIdx, setActiveTermIdx] = useState(0);
  const [grades, setGrades] = useState<GradeMap>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grades));
  }, [grades]);

  function setGrade(termIdx: number, courseName: string, value: string) {
    const num = parseFloat(value);
    if (value !== "" && (isNaN(num) || num < 0 || num > 100)) {
      toast.error("Not 0-100 arasında olmalıdır");
      return;
    }
    setGrades((prev) => ({ ...prev, [courseKey(termIdx, courseName)]: value }));
  }

  function clearTerm(termIdx: number) {
    const newGrades = { ...grades };
    TERMS[termIdx].courses.forEach(
      (c) => delete newGrades[courseKey(termIdx, c.name)],
    );
    setGrades(newGrades);
    toast.success(`${TERMS[termIdx].term} notları temizlendi`);
  }

  function clearAll() {
    setGrades({});
    toast.success("Tüm notlar temizlendi");
  }

  const overallGPA = calcGPA(grades);
  const activeTerm = TERMS[activeTermIdx];
  const activeTermGPA = termGPA(grades, activeTermIdx, activeTerm.courses);

  // Count passed/failed/empty
  const allEntries: {
    termIdx: number;
    course: Course;
    grade: number | null;
  }[] = TERMS.flatMap((term, tIdx) =>
    term.courses.map((course) => {
      const raw = grades[courseKey(tIdx, course.name)];
      const g = raw !== undefined && raw !== "" ? parseFloat(raw) : null;
      return { termIdx: tIdx, course, grade: isNaN(g as number) ? null : g };
    }),
  );
  const totalCourses = allEntries.length;
  const enteredCourses = allEntries.filter((e) => e.grade !== null).length;
  const passedCourses = allEntries.filter(
    (e) => e.grade !== null && (e.grade as number) >= PASS_GRADE,
  ).length;
  const failedCourses = allEntries.filter(
    (e) => e.grade !== null && (e.grade as number) < PASS_GRADE,
  ).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
            <BookMarked size={20} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
              Preklinik Planlayıcı
            </h1>
            <p className="text-[var(--color-text-secondary)] text-sm">
              Dönem bazlı not takibi ve GPA hesaplama
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <RotateCcw size={14} /> Tümünü Temizle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="elevated" className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} style={{ color: "var(--color-primary)" }} />
            <p className="text-xs text-[var(--color-text-secondary)]">
              Genel GPA
            </p>
          </div>
          <p
            className="text-3xl font-bold"
            style={{
              color:
                overallGPA >= PASS_GRADE
                  ? "var(--color-success)"
                  : overallGPA > 0
                    ? "var(--color-destructive)"
                    : "var(--color-text-secondary)",
            }}
          >
            {overallGPA > 0 ? overallGPA.toFixed(1) : "—"}
          </p>
          <p
            className="text-xs mt-1"
            style={{
              color:
                overallGPA >= PASS_GRADE
                  ? "var(--color-success)"
                  : "var(--color-text-secondary)",
            }}
          >
            {overallGPA >= PASS_GRADE
              ? "Geçer"
              : overallGPA > 0
                ? "Kalır"
                : "Henüz not girilmedi"}
          </p>
        </Card>
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">
            Girilen Ders
          </p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            {enteredCourses}/{totalCourses}
          </p>
        </Card>
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">
            Geçilen
          </p>
          <p className="text-2xl font-bold text-[var(--color-success)]">
            {passedCourses}
          </p>
        </Card>
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">
            Kalan
          </p>
          <p className="text-2xl font-bold text-[var(--color-destructive)]">
            {failedCourses}
          </p>
        </Card>
      </div>

      {/* Pass threshold notice */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: "var(--color-warning)" }}
        />
        <p className="text-sm text-[var(--color-text-secondary)]">
          Geçer not sınırı:{" "}
          <span className="font-semibold text-[var(--color-text-primary)]">
            {PASS_GRADE}
          </span>{" "}
          — Bu değerin altındaki notlar kırmızıyla işaretlenir
        </p>
      </div>

      {/* Term Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TERMS.map((term, idx) => {
          const tGPA = termGPA(grades, idx, term.courses);
          const isActive = idx === activeTermIdx;
          return (
            <button
              key={idx}
              onClick={() => setActiveTermIdx(idx)}
              className={[
                "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                isActive
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/30"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/30",
              ].join(" ")}
            >
              {term.term}
              {tGPA > 0 && (
                <span
                  className={`ml-1.5 text-xs font-normal ${tGPA >= PASS_GRADE ? "text-[var(--color-success)]" : "text-[var(--color-destructive)]"}`}
                >
                  {tGPA.toFixed(1)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Term Content */}
      <Card variant="elevated" className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle>{activeTerm.term}</CardTitle>
            {activeTermGPA > 0 && (
              <p
                className="text-sm mt-0.5"
                style={{
                  color:
                    activeTermGPA >= PASS_GRADE
                      ? "var(--color-success)"
                      : "var(--color-destructive)",
                }}
              >
                Dönem GPA:{" "}
                <span className="font-bold">{activeTermGPA.toFixed(1)}</span>
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearTerm(activeTermIdx)}
          >
            <RotateCcw size={12} /> Dönemi Temizle
          </Button>
        </div>

        <div className="space-y-2">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-3 pb-1">
            <p className="col-span-5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
              Ders Adı
            </p>
            <p className="col-span-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide text-center">
              Kredi
            </p>
            <p className="col-span-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide text-center">
              Not (0-100)
            </p>
            <p className="col-span-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide text-center">
              Durum
            </p>
          </div>

          {activeTerm.courses.map((course) => {
            const key = courseKey(activeTermIdx, course.name);
            const rawVal = grades[key] || "";
            const numVal = rawVal !== "" ? parseFloat(rawVal) : null;
            const passed =
              numVal !== null && !isNaN(numVal) && numVal >= PASS_GRADE;
            const failed =
              numVal !== null && !isNaN(numVal) && numVal < PASS_GRADE;
            return (
              <div
                key={course.name}
                className={[
                  "grid grid-cols-12 gap-3 items-center px-3 py-2.5 rounded-lg border transition-colors",
                  failed
                    ? "border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5"
                    : passed
                      ? "border-[var(--color-success)]/20 bg-[var(--color-success)]/5"
                      : "border-[var(--color-border)] hover:border-[var(--color-primary)]/30",
                ].join(" ")}
              >
                <div className="col-span-5">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {course.name}
                  </p>
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {course.credits} kr
                  </span>
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={rawVal}
                    onChange={(e) =>
                      setGrade(activeTermIdx, course.name, e.target.value)
                    }
                    placeholder="—"
                    className={[
                      "w-full rounded-md border px-3 py-1.5 text-sm text-center focus:outline-none transition-colors",
                      failed
                        ? "border-[var(--color-destructive)]/50 bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] focus:border-[var(--color-destructive)]"
                        : passed
                          ? "border-[var(--color-success)]/50 bg-[var(--color-success)]/10 text-[var(--color-success)] focus:border-[var(--color-success)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-primary)]",
                    ].join(" ")}
                  />
                </div>
                <div className="col-span-2 flex justify-center">
                  {numVal !== null && !isNaN(numVal) ? (
                    <Badge variant={passed ? "success" : "destructive"}>
                      {passed ? "Geçti" : "Kaldı"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">—</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Term summary */}
        {activeTermGPA > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {activeTerm.term} ağırlıklı ortalaması
            </p>
            <p
              className="text-lg font-bold"
              style={{
                color:
                  activeTermGPA >= PASS_GRADE
                    ? "var(--color-success)"
                    : "var(--color-destructive)",
              }}
            >
              {activeTermGPA.toFixed(2)}
            </p>
          </div>
        )}
      </Card>

      {/* All terms summary */}
      {enteredCourses > 0 && (
        <Card variant="bordered" className="p-4">
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">
            Dönem Özeti
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TERMS.map((term, idx) => {
              const tGPA = termGPA(grades, idx, term.courses);
              const enteredCount = term.courses.filter((c) => {
                const raw = grades[courseKey(idx, c.name)];
                return raw !== undefined && raw !== "";
              }).length;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveTermIdx(idx)}
                  className="p-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-colors text-left"
                >
                  <p className="text-xs font-medium text-[var(--color-text-primary)]">
                    {term.term}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {enteredCount}/{term.courses.length} ders
                  </p>
                  {tGPA > 0 ? (
                    <p
                      className="text-base font-bold mt-1"
                      style={{
                        color:
                          tGPA >= PASS_GRADE
                            ? "var(--color-success)"
                            : "var(--color-destructive)",
                      }}
                    >
                      {tGPA.toFixed(1)}
                    </p>
                  ) : (
                    <p className="text-base font-bold mt-1 text-[var(--color-text-secondary)]">
                      —
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

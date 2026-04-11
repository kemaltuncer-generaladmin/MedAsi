"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Building2,
  LifeBuoy,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCommunityDate, formatRelativeTime, getInitials } from "./community-helpers";

type Overview = {
  metrics: {
    totalSpaces: number;
    totalThreads: number;
    totalResources: number;
    totalChats: number;
    openReports: number;
    pendingVerifications: number;
  };
  recentThreads: Array<{
    id: string;
    title: string;
    createdAt: string;
    author: { name: string | null; email: string };
    space: { title: string } | null;
  }>;
  recentResources: Array<{
    id: string;
    title: string;
    createdAt: string;
    author: { name: string | null; email: string };
    course: { name: string } | null;
  }>;
  reportQueue: Array<{
    id: string;
    targetId?: string;
    createdAt: string;
    targetType: string;
    status: string;
    reporterUser: { name: string | null; email: string };
    reason: { label: string } | null;
    assignedModerator?: { name: string | null; email: string } | null;
  }>;
  roleAssignments: Array<{
    id: string;
    role: string;
    user: { name: string | null; email: string };
    university: { name: string } | null;
    course: { name: string } | null;
  }>;
  moderationActions?: Array<{
    id: string;
    actionType: string;
    targetType: string;
    createdAt: string;
    actorUser: { name: string | null; email: string };
  }>;
  topUniversities: Array<{ id: string; name: string; count: number }>;
  topCourses: Array<{ id: string; name: string; count: number }>;
};

type Taxonomy = {
  universities: Array<{ id: string; name: string }>;
  programs: Array<{ id: string; name: string; universityId: string }>;
  terms: Array<{ id: string; name: string; programId: string }>;
  courses: Array<{ id: string; name: string; programId: string; termId?: string | null }>;
};

type UserRow = { id: string; name: string | null; email: string };

const INPUT_CLASS =
  "w-full rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_88%,transparent)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-disabled)] focus:border-[color-mix(in_srgb,var(--color-primary)_55%,transparent)]";

export function CommunityAdminClient() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleForm, setRoleForm] = useState({
    userId: "",
    role: "campus_moderator",
    universityId: "",
    courseId: "",
    termId: "",
    programId: "",
  });
  const [taxonomyForms, setTaxonomyForms] = useState({
    university: { name: "", city: "" },
    program: { name: "", universityId: "" },
    term: { name: "", code: "", programId: "" },
    course: { name: "", programId: "", termId: "" },
  });

  async function loadData() {
    setLoading(true);
    try {
      const [overviewRes, taxonomyRes, usersRes] = await Promise.all([
        fetch("/api/admin/community/overview", { cache: "no-store" }),
        fetch("/api/admin/community/taxonomy/universities", { cache: "no-store" }),
        fetch("/api/admin/users", { cache: "no-store" }),
      ]);

      if (!overviewRes.ok || !taxonomyRes.ok || !usersRes.ok) {
        throw new Error("Admin topluluk verileri yuklenemedi");
      }

      const [overviewData, taxonomyData, userData] = await Promise.all([
        overviewRes.json(),
        taxonomyRes.json(),
        usersRes.json(),
      ]);

      setOverview(overviewData);
      setTaxonomy(taxonomyData);
      setUsers(userData);
      setRoleForm((prev) => ({
        ...prev,
        userId: prev.userId || userData[0]?.id || "",
        universityId: prev.universityId || taxonomyData.universities[0]?.id || "",
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Admin ekran yuklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredPrograms = useMemo(
    () =>
      taxonomy?.programs.filter((program) =>
        !roleForm.universityId || program.universityId === roleForm.universityId,
      ) ?? [],
    [taxonomy, roleForm.universityId],
  );

  const filteredTerms = useMemo(
    () =>
      taxonomy?.terms.filter((term) => !roleForm.programId || term.programId === roleForm.programId) ??
      [],
    [taxonomy, roleForm.programId],
  );

  const filteredCourses = useMemo(
    () =>
      taxonomy?.courses.filter(
        (course) =>
          (!roleForm.programId || course.programId === roleForm.programId) &&
          (!roleForm.termId || course.termId === roleForm.termId),
      ) ?? [],
    [taxonomy, roleForm.programId, roleForm.termId],
  );

  async function createTaxonomy(entity: string, payload: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/admin/community/taxonomy/${entity}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Taksonomi kaydi olusturulamadi");
      toast.success("Taksonomi kaydi olusturuldu");
      await loadData();
    } catch {
      toast.error("Taksonomi kaydi olusturulamadi");
    }
  }

  async function assignRole() {
    try {
      const res = await fetch("/api/admin/community/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleForm),
      });
      if (!res.ok) throw new Error("Rol atanamadi");
      toast.success("Topluluk rolu atandi");
      await loadData();
    } catch {
      toast.error("Rol atanamadi");
    }
  }

  async function moderateReport(reportId: string, targetId: string | undefined, targetType: string) {
    if (!targetId) {
      toast.error("Bu raporda hedef kayit bulunamadi");
      return;
    }

    try {
      const res = await fetch("/api/community/moderation/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          actionType: "hide",
          reason: `Admin panelinden rapor ${reportId} icin gizlendi`,
        }),
      });
      if (!res.ok) throw new Error("Moderasyon islemi basarisiz");
      toast.success("Icerik gizlendi ve log kaydi olustu");
      await loadData();
    } catch {
      toast.error("Moderasyon islemi basarisiz");
    }
  }

  if (loading || !overview || !taxonomy) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-40 animate-pulse rounded-3xl bg-[var(--color-surface-elevated)]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section
        className="overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))] px-5 py-6 sm:px-6 lg:px-8 lg:py-8"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--color-warning) 18%, transparent), transparent 28%), linear-gradient(135deg, color-mix(in srgb, var(--color-surface) 92%, #07111b) 0%, color-mix(in srgb, var(--color-surface-elevated) 95%, #081524) 100%)",
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <Badge variant="outline">Admin Community Center</Badge>
            <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] sm:text-4xl">
              Moderasyon, taxonomy ve operasyon ritmi tek ekranda.
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-[var(--color-text-secondary)]">
              Topluluk artik bir yan modul degil; kendi yonetim merkezi olan bir urun yuzu. Bu panel,
              campus agi, rapor kuyrugu, yeni roller ve kaynak ivmesini ayni anda izletiyor.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Space", value: overview.metrics.totalSpaces, icon: Building2 },
              { label: "30 gun thread", value: overview.metrics.totalThreads, icon: Sparkles },
              { label: "30 gun kaynak", value: overview.metrics.totalResources, icon: BookOpen },
              { label: "30 gun sohbet", value: overview.metrics.totalChats, icon: Users },
              { label: "Acik rapor", value: overview.metrics.openReports, icon: AlertTriangle },
              { label: "Bekleyen dogrulama", value: overview.metrics.pendingVerifications, icon: Shield },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_84%,transparent)] p-4"
              >
                <metric.icon size={18} className="text-[var(--color-primary)]" />
                <p className="mt-4 text-2xl font-semibold text-[var(--color-text-primary)]">{metric.value}</p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="space-y-6">
          <Card variant="bordered" className="rounded-3xl p-0">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface)),transparent)] p-6">
              <CardHeader className="mb-6">
                <CardTitle className="flex items-center gap-2">
                  <Building2 size={18} />
                  Taxonomy forge
                </CardTitle>
                <CardDescription>
                  Universite, program, donem ve ders tanimlandiginda ilgili community space otomatik kuruluyor.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Universite ekle</p>
                  <div className="mt-3 space-y-3">
                    <input
                      value={taxonomyForms.university.name}
                      onChange={(event) =>
                        setTaxonomyForms((prev) => ({
                          ...prev,
                          university: { ...prev.university, name: event.target.value },
                        }))
                      }
                      placeholder="Universite adi"
                      className={INPUT_CLASS}
                    />
                    <input
                      value={taxonomyForms.university.city}
                      onChange={(event) =>
                        setTaxonomyForms((prev) => ({
                          ...prev,
                          university: { ...prev.university, city: event.target.value },
                        }))
                      }
                      placeholder="Sehir"
                      className={INPUT_CLASS}
                    />
                    <Button size="sm" onClick={() => createTaxonomy("universities", taxonomyForms.university)}>
                      Universiteyi olustur
                    </Button>
                  </div>
                </div>

                <div className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Program ekle</p>
                  <div className="mt-3 space-y-3">
                    <select
                      value={taxonomyForms.program.universityId}
                      onChange={(event) =>
                        setTaxonomyForms((prev) => ({
                          ...prev,
                          program: { ...prev.program, universityId: event.target.value },
                        }))
                      }
                      className={INPUT_CLASS}
                    >
                      <option value="">Universite sec</option>
                      {taxonomy.universities.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={taxonomyForms.program.name}
                      onChange={(event) =>
                        setTaxonomyForms((prev) => ({
                          ...prev,
                          program: { ...prev.program, name: event.target.value },
                        }))
                      }
                      placeholder="Tip fakultesi / program adi"
                      className={INPUT_CLASS}
                    />
                    <Button size="sm" onClick={() => createTaxonomy("programs", taxonomyForms.program)}>
                      Programi olustur
                    </Button>
                  </div>
                </div>

                <div className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Donem ekle</p>
                  <div className="mt-3 space-y-3">
                    <select
                      value={taxonomyForms.term.programId}
                      onChange={(event) =>
                        setTaxonomyForms((prev) => ({
                          ...prev,
                          term: { ...prev.term, programId: event.target.value },
                        }))
                      }
                      className={INPUT_CLASS}
                    >
                      <option value="">Program sec</option>
                      {taxonomy.programs.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={taxonomyForms.term.name}
                      onChange={(event) =>
                        setTaxonomyForms((prev) => ({
                          ...prev,
                          term: { ...prev.term, name: event.target.value },
                        }))
                      }
                      placeholder="Donem adi"
                      className={INPUT_CLASS}
                    />
                    <input
                      value={taxonomyForms.term.code}
                      onChange={(event) =>
                        setTaxonomyForms((prev) => ({
                          ...prev,
                          term: { ...prev.term, code: event.target.value },
                        }))
                      }
                      placeholder="Kod"
                      className={INPUT_CLASS}
                    />
                    <Button size="sm" onClick={() => createTaxonomy("terms", taxonomyForms.term)}>
                      Donemi olustur
                    </Button>
                  </div>
                </div>

                <div className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Ders ekle</p>
                  <div className="mt-3 space-y-3">
                    <select
                      value={taxonomyForms.course.programId}
                      onChange={(event) =>
                        setTaxonomyForms((prev) => ({
                          ...prev,
                          course: { ...prev.course, programId: event.target.value },
                        }))
                      }
                      className={INPUT_CLASS}
                    >
                      <option value="">Program sec</option>
                      {taxonomy.programs.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={taxonomyForms.course.termId}
                      onChange={(event) =>
                        setTaxonomyForms((prev) => ({
                          ...prev,
                          course: { ...prev.course, termId: event.target.value },
                        }))
                      }
                      className={INPUT_CLASS}
                    >
                      <option value="">Donem sec</option>
                      {taxonomy.terms.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={taxonomyForms.course.name}
                      onChange={(event) =>
                        setTaxonomyForms((prev) => ({
                          ...prev,
                          course: { ...prev.course, name: event.target.value },
                        }))
                      }
                      placeholder="Ders / staj adi"
                      className={INPUT_CLASS}
                    />
                    <Button size="sm" onClick={() => createTaxonomy("courses", taxonomyForms.course)}>
                      Dersi olustur
                    </Button>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card variant="bordered" className="rounded-3xl p-0">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_90%,transparent)] p-6">
              <CardHeader className="mb-6">
                <CardTitle className="flex items-center gap-2">
                  <Shield size={18} />
                  Moderasyon istasyonu
                </CardTitle>
                <CardDescription>
                  Acik raporlar, hedef tipleri ve tek tik moderasyon aksiyonlari.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.reportQueue.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="warning">{report.targetType}</Badge>
                      <Badge variant="outline">{report.status}</Badge>
                      {report.reason?.label && <Badge variant="secondary">{report.reason.label}</Badge>}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
                      {report.reporterUser.name ?? report.reporterUser.email}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {formatCommunityDate(report.createdAt)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="xs"
                        variant="destructive"
                        onClick={() => moderateReport(report.id, report.targetId, report.targetType)}
                      >
                        Gizle
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card variant="bordered" className="rounded-3xl p-0">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-success)_8%,var(--color-surface)),transparent)] p-6">
              <CardHeader className="mb-6">
                <CardTitle className="flex items-center gap-2">
                  <Users size={18} />
                  Rol atama
                </CardTitle>
                <CardDescription>Campus veya ders bazli moderatorleri hizla ata.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  value={roleForm.userId}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, userId: event.target.value }))}
                  className={INPUT_CLASS}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name ?? user.email}
                    </option>
                  ))}
                </select>
                <select
                  value={roleForm.role}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, role: event.target.value }))}
                  className={INPUT_CLASS}
                >
                  <option value="community_admin">Community admin</option>
                  <option value="campus_moderator">Campus moderator</option>
                  <option value="course_moderator">Course moderator</option>
                </select>
                <select
                  value={roleForm.universityId}
                  onChange={(event) =>
                    setRoleForm((prev) => ({
                      ...prev,
                      universityId: event.target.value,
                      programId: "",
                      termId: "",
                      courseId: "",
                    }))
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Universite sec</option>
                  {taxonomy.universities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select
                  value={roleForm.programId}
                  onChange={(event) =>
                    setRoleForm((prev) => ({
                      ...prev,
                      programId: event.target.value,
                      termId: "",
                      courseId: "",
                    }))
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Program sec</option>
                  {filteredPrograms.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select
                  value={roleForm.termId}
                  onChange={(event) =>
                    setRoleForm((prev) => ({ ...prev, termId: event.target.value, courseId: "" }))
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Donem sec</option>
                  {filteredTerms.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select
                  value={roleForm.courseId}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, courseId: event.target.value }))}
                  className={INPUT_CLASS}
                >
                  <option value="">Ders sec</option>
                  {filteredCourses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <Button size="sm" onClick={assignRole}>
                  Rolu ata
                </Button>
              </CardContent>
            </div>
          </Card>

          <Card variant="bordered" className="rounded-3xl p-0">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_90%,transparent)] p-6">
              <CardHeader className="mb-6">
                <CardTitle className="flex items-center gap-2">
                  <LifeBuoy size={18} />
                  Ritim panosu
                </CardTitle>
                <CardDescription>Toplulugun nereye yogunlastigini hizla oku.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-disabled)]">
                    One cikan universiteler
                  </p>
                  <div className="mt-3 space-y-2">
                    {overview.topUniversities.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] px-4 py-3"
                      >
                        <span className="text-sm text-[var(--color-text-primary)]">{item.name}</span>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-disabled)]">
                    One cikan dersler
                  </p>
                  <div className="mt-3 space-y-2">
                    {overview.topCourses.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] px-4 py-3"
                      >
                        <span className="text-sm text-[var(--color-text-primary)]">{item.name}</span>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card variant="bordered" className="rounded-3xl p-0">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_90%,transparent)] p-6">
              <CardHeader className="mb-6">
                <CardTitle>Son hareketler</CardTitle>
                <CardDescription>Yeni threadler, kaynaklar ve son rol atamalari.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {overview.recentThreads.slice(0, 4).map((thread) => (
                  <div key={thread.id} className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-4">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{thread.title}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {thread.space?.title ?? "Genel alan"} · {formatRelativeTime(thread.createdAt)}
                    </p>
                  </div>
                ))}

                {overview.recentResources.slice(0, 3).map((resource) => (
                  <div key={resource.id} className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-4">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{resource.title}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {resource.course?.name ?? "Genel"} · {formatRelativeTime(resource.createdAt)}
                    </p>
                  </div>
                ))}

                {overview.roleAssignments.slice(0, 4).map((assignment) => (
                  <div key={assignment.id} className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] text-[11px] font-semibold text-[var(--color-primary)]">
                        {getInitials(assignment.user.name ?? assignment.user.email)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {assignment.user.name ?? assignment.user.email}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {assignment.role} {assignment.university?.name ? `· ${assignment.university.name}` : ""}
                          {assignment.course?.name ? ` · ${assignment.course.name}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

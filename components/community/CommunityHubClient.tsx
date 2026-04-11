"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Compass,
  FileStack,
  Flame,
  GraduationCap,
  MessageCircleMore,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  cn,
  CONTENT_TYPE_OPTIONS,
  formatRelativeTime,
  getContentTypeLabel,
  getContentTypeTone,
  getInitials,
  getSpaceTypeLabel,
} from "./community-helpers";

type Option = { id: string; name: string; slug?: string; city?: string | null };
type Taxonomy = {
  universities: Option[];
  programs: Array<Option & { universityId: string }>;
  terms: Array<Option & { programId: string; code: string }>;
  courses: Array<Option & { programId: string; termId?: string | null }>;
  spaces: Array<{ id: string; title: string; slug: string; type: string }>;
};

type FeedPayload = {
  profile?: {
    verificationStatus?: string;
    university?: { name: string } | null;
    term?: { name: string } | null;
  } | null;
  threads: Array<{
    id: string;
    title: string;
    description: string | null;
    contentType: string;
    visibilityScope: string;
    postCount: number;
    createdAt: string;
    lastActivityAt: string;
    containsSpoiler: boolean;
    author: { id: string; name: string | null; email: string };
    space: { title: string; slug: string; type: string };
    posts: Array<{
      id: string;
      body: string;
      createdAt: string;
      author: { name: string | null; email: string };
    }>;
  }>;
  resources: Array<{
    id: string;
    title: string;
    description: string | null;
    resourceType: string;
    visibilityScope: string;
    qualityScore: number;
    url: string | null;
    linkedMaterialId: string | null;
    author: { name: string | null; email: string };
    course?: { name: string } | null;
    space?: { slug: string; title: string } | null;
  }>;
  spaces: Array<{
    id: string;
    title: string;
    slug: string;
    type: string;
    _count: { threads: number; resources: number; chats: number };
  }>;
  topContributors: Array<{
    id: string;
    name: string;
    university: string | null;
    term: string | null;
    contributionCount: number;
  }>;
};

type Filters = {
  universityId: string;
  programId: string;
  termId: string;
  courseId: string;
  contentType: string;
  q: string;
};

const INPUT_CLASS =
  "w-full rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_88%,transparent)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-disabled)] focus:border-[color-mix(in_srgb,var(--color-primary)_55%,transparent)]";

const PANEL_CLASS =
  "rounded-3xl border border-[var(--color-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-surface)_94%,transparent),color-mix(in_srgb,var(--color-surface-elevated)_96%,transparent))] shadow-[var(--shadow-md)] backdrop-blur-xl";

export function CommunityHubClient() {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [feed, setFeed] = useState<FeedPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resourceSubmitting, setResourceSubmitting] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    universityId: "",
    programId: "",
    termId: "",
    courseId: "",
    contentType: "",
    q: "",
  });
  const deferredSearch = useDeferredValue(filters.q);
  const requestFilters = useMemo(
    () => ({
      universityId: filters.universityId,
      programId: filters.programId,
      termId: filters.termId,
      courseId: filters.courseId,
      contentType: filters.contentType,
      q: deferredSearch,
    }),
    [
      filters.universityId,
      filters.programId,
      filters.termId,
      filters.courseId,
      filters.contentType,
      deferredSearch,
    ],
  );
  const [threadForm, setThreadForm] = useState({
    spaceId: "",
    title: "",
    description: "",
    contentType: "discussion",
    visibilityScope: "global",
    initialPostBody: "",
    containsSpoiler: false,
  });
  const [resourceForm, setResourceForm] = useState({
    spaceId: "",
    title: "",
    description: "",
    resourceType: "file",
    visibilityScope: "global",
    url: "",
    linkedMaterialId: "",
    courseId: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        Object.entries(requestFilters).forEach(([key, value]) => {
          if (value) query.set(key, value);
        });

        const [feedRes, taxonomyRes] = await Promise.all([
          fetch(`/api/community/feed?${query.toString()}`, { cache: "no-store" }),
          fetch("/api/community/taxonomy", { cache: "no-store" }),
        ]);

        if (!feedRes.ok || !taxonomyRes.ok) {
          throw new Error("Topluluk verisi yuklenemedi");
        }

        const [feedData, taxonomyData] = await Promise.all([feedRes.json(), taxonomyRes.json()]);
        if (cancelled) return;

        setFeed(feedData);
        setTaxonomy(taxonomyData);
        setThreadForm((prev) => ({
          ...prev,
          spaceId: prev.spaceId || taxonomyData.spaces[0]?.id || "",
        }));
        setResourceForm((prev) => ({
          ...prev,
          spaceId: prev.spaceId || taxonomyData.spaces[0]?.id || "",
        }));
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Topluluk yuklenemedi");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [
    requestFilters,
  ]);

  const filteredPrograms = useMemo(
    () =>
      taxonomy?.programs.filter((program) =>
        !filters.universityId || program.universityId === filters.universityId,
      ) ?? [],
    [taxonomy, filters.universityId],
  );

  const filteredTerms = useMemo(
    () =>
      taxonomy?.terms.filter((term) => !filters.programId || term.programId === filters.programId) ??
      [],
    [taxonomy, filters.programId],
  );

  const filteredCourses = useMemo(
    () =>
      taxonomy?.courses.filter(
        (course) =>
          (!filters.programId || course.programId === filters.programId) &&
          (!filters.termId || course.termId === filters.termId),
      ) ?? [],
    [taxonomy, filters.programId, filters.termId],
  );

  const pulseMetrics = useMemo(() => {
    if (!feed) return [];

    const discussionCount = feed.threads.filter((thread) => thread.contentType === "discussion").length;
    const questionCount = feed.threads.filter((thread) => thread.contentType === "question").length;
    const studyCallCount = feed.threads.filter((thread) => thread.contentType === "study_call").length;

    return [
      { label: "Akista thread", value: feed.threads.length, hint: `${questionCount} soru aktif`, icon: Flame },
      { label: "Paylasilan kaynak", value: feed.resources.length, hint: "Yuksek skorlu ders materyalleri", icon: FileStack },
      { label: "Canli alan", value: feed.spaces.length, hint: `${studyCallCount} calisma cagrisi`, icon: Compass },
      { label: "Katki lideri", value: feed.topContributors.length, hint: `${discussionCount} tartisma one cikti`, icon: Users },
    ];
  }, [feed]);

  const trendingThreads = useMemo(
    () =>
      [...(feed?.threads ?? [])]
        .sort((a, b) => b.postCount - a.postCount || +new Date(b.lastActivityAt) - +new Date(a.lastActivityAt))
        .slice(0, 3),
    [feed],
  );

  const featuredResources = useMemo(
    () => [...(feed?.resources ?? [])].sort((a, b) => b.qualityScore - a.qualityScore).slice(0, 4),
    [feed],
  );

  const fastLanes = useMemo(() => {
    if (!feed) return [];

    return [
      {
        title: "Soru sor ve hizli cevap al",
        body: "Staj, farmakoloji, OSCE ve cikmis soru odakli thread ac.",
        href: "#community-composer",
        icon: Sparkles,
      },
      {
        title: "Kampus ya da ders alanina gir",
        body: "Dogru alanda dogru insana ulas; daginik akisi temizle.",
        href: feed.spaces[0] ? `/community/spaces/${feed.spaces[0].slug}` : "/community",
        icon: Building2,
      },
      {
        title: "Mesaj merkezi ile ekip topla",
        body: "Study group, DM ve kucuk koordinasyon odalari tek yerde.",
        href: "/community/messages",
        icon: MessageCircleMore,
      },
    ];
  }, [feed]);

  async function submitThread() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/community/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(threadForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gonderi olusturulamadi");
      toast.success("Topluluk gonderisi acildi");
      setThreadForm((prev) => ({
        ...prev,
        title: "",
        description: "",
        initialPostBody: "",
        containsSpoiler: false,
      }));
      startTransition(() => {
        setFilters((prev) => ({ ...prev }));
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gonderi acilamadi");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitResource() {
    setResourceSubmitting(true);
    try {
      const res = await fetch("/api/community/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resourceForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kaynak paylasilamadi");
      toast.success("Kaynak topluluga eklendi");
      setResourceForm((prev) => ({
        ...prev,
        title: "",
        description: "",
        url: "",
        linkedMaterialId: "",
      }));
      startTransition(() => {
        setFilters((prev) => ({ ...prev }));
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kaynak eklenemedi");
    } finally {
      setResourceSubmitting(false);
    }
  }

  async function reportTarget(targetType: string, targetId: string) {
    try {
      const res = await fetch("/api/community/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          details: "Kullanici tarafindan community arayuzunden raporlandi.",
        }),
      });
      if (!res.ok) throw new Error("Rapor gonderilemedi");
      toast.success("Icerik moderator kuyruguna eklendi");
    } catch {
      toast.error("Rapor gonderilemedi");
    }
  }

  if (loading || !taxonomy || !feed) {
    return (
      <div className="space-y-5">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-40 animate-pulse rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <section
        className="relative overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))] px-5 py-6 sm:px-6 lg:px-8 lg:py-8"
        style={{
          background:
            "radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--color-primary) 26%, transparent), transparent 32%), radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--color-success) 18%, transparent), transparent 26%), linear-gradient(135deg, color-mix(in srgb, var(--color-surface) 90%, #07111b) 0%, color-mix(in srgb, var(--color-surface-elevated) 92%, #081524) 100%)",
        }}
      >
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--color-primary)_16%,transparent),transparent_62%)]" />
        <div className="relative grid gap-8 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">Community OS</Badge>
              <Badge variant={feed.profile?.verificationStatus === "verified" ? "success" : "warning"}>
                {feed.profile?.verificationStatus === "verified"
                  ? "Dogrulanmis ogrenci"
                  : "Dogrulama aksiyonu bekliyor"}
              </Badge>
              {feed.profile?.university?.name && (
                <Badge variant="secondary">{feed.profile.university.name}</Badge>
              )}
              {feed.profile?.term?.name && <Badge variant="secondary">{feed.profile.term.name}</Badge>}
            </div>

            <div className="max-w-3xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">
                Tip ogrencileri icin hizli, guvenli ve gercekten kullanisli sosyal alan
              </p>
              <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-[var(--color-text-primary)] sm:text-4xl xl:text-5xl">
                Reddit&apos;in kesfini, Discord&apos;un hizini, Figure 1&apos;in klinik odagini tek
                akista topladik.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                Kampus, donem ve ders bazli yapilar korunuyor; ama aradigin soru, not, vaka ipucu ve
                calisma ekibi daginik menuler yerine tek operasyon ekraninda toplaniyor.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {fastLanes.map((lane) => (
                <Link
                  key={lane.title}
                  href={lane.href}
                  className="group rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_84%,transparent)] p-4 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] p-2 text-[var(--color-primary)]">
                      <lane.icon size={18} />
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{lane.title}</p>
                      <ArrowRight
                        size={14}
                        className="shrink-0 text-[var(--color-text-secondary)] transition-transform group-hover:translate-x-0.5"
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">{lane.body}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {pulseMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_84%,transparent)] p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="rounded-2xl bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] p-2 text-[var(--color-primary)]">
                    <metric.icon size={18} />
                  </div>
                  <span className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-disabled)]">
                    live
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold text-[var(--color-text-primary)]">{metric.value}</p>
                <p className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">{metric.label}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">{metric.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.92fr]">
        <div className="space-y-6">
          <section className={cn(PANEL_CLASS, "p-5 sm:p-6")}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-disabled)]">
                  Kesif paneli
                </p>
                <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                  Dakikalar icinde dogru alana dus.
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                  Reddit tarzli akisi koruduk, ama filtreleri ders ve kampus mantigi ile klinik olarak
                  anlamli hale getirdik.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    startTransition(() =>
                      setFilters({
                        universityId: "",
                        programId: "",
                        termId: "",
                        courseId: "",
                        contentType: "",
                        q: "",
                      }),
                    )
                  }
                >
                  Filtreleri temizle
                </Button>
                <Link href="/community/messages">
                  <Button size="sm" variant="secondary">
                    <MessageCircleMore size={14} />
                    Mesaj merkezi
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <label className="xl:col-span-2">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-[var(--color-text-disabled)]">
                  Arama
                </span>
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-disabled)]"
                  />
                  <input
                    value={filters.q}
                    onChange={(event) =>
                      startTransition(() =>
                        setFilters((prev) => ({ ...prev, q: event.target.value })),
                      )
                    }
                    placeholder="Farmakoloji tekrar notu, noroloji vaka, anatomi..."
                    className={cn(INPUT_CLASS, "pl-10")}
                  />
                </div>
              </label>

              <label>
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-[var(--color-text-disabled)]">
                  Universite
                </span>
                <select
                  value={filters.universityId}
                  onChange={(event) =>
                    startTransition(() =>
                      setFilters((prev) => ({
                        ...prev,
                        universityId: event.target.value,
                        programId: "",
                        termId: "",
                        courseId: "",
                      })),
                    )
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Tum kampusler</option>
                  {taxonomy.universities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-[var(--color-text-disabled)]">
                  Program
                </span>
                <select
                  value={filters.programId}
                  onChange={(event) =>
                    startTransition(() =>
                      setFilters((prev) => ({
                        ...prev,
                        programId: event.target.value,
                        termId: "",
                        courseId: "",
                      })),
                    )
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Tum programlar</option>
                  {filteredPrograms.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-[var(--color-text-disabled)]">
                  Donem
                </span>
                <select
                  value={filters.termId}
                  onChange={(event) =>
                    startTransition(() =>
                      setFilters((prev) => ({
                        ...prev,
                        termId: event.target.value,
                        courseId: "",
                      })),
                    )
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Tum donemler</option>
                  {filteredTerms.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-[var(--color-text-disabled)]">
                  Ders / Staj
                </span>
                <select
                  value={filters.courseId}
                  onChange={(event) =>
                    startTransition(() =>
                      setFilters((prev) => ({ ...prev, courseId: event.target.value })),
                    )
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Tum dersler</option>
                  {filteredCourses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-[var(--color-text-disabled)]">
                  Icerik tipi
                </span>
                <select
                  value={filters.contentType}
                  onChange={(event) =>
                    startTransition(() =>
                      setFilters((prev) => ({ ...prev, contentType: event.target.value })),
                    )
                  }
                  className={INPUT_CLASS}
                >
                  {CONTENT_TYPE_OPTIONS.map((item) => (
                    <option key={item.label} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section id="community-composer" className="grid gap-6 lg:grid-cols-2">
            <Card variant="bordered" className="rounded-3xl p-0">
              <div className="rounded-3xl border border-[var(--color-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_9%,var(--color-surface)),transparent)] p-6">
                <CardHeader className="mb-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-[var(--color-primary)]" />
                    <CardTitle>Thread komuta paneli</CardTitle>
                  </div>
                  <CardDescription>
                    Soru, tartisma veya study-call ac. Baslik, baglam ve ilk mesaji ayni akista ver.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <select
                    value={threadForm.spaceId}
                    onChange={(event) =>
                      setThreadForm((prev) => ({ ...prev, spaceId: event.target.value }))
                    }
                    className={INPUT_CLASS}
                  >
                    {taxonomy.spaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.title}
                      </option>
                    ))}
                  </select>
                  <select
                    value={threadForm.contentType}
                    onChange={(event) =>
                      setThreadForm((prev) => ({ ...prev, contentType: event.target.value }))
                    }
                    className={INPUT_CLASS}
                  >
                    {CONTENT_TYPE_OPTIONS.filter((item) => item.value).map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={threadForm.title}
                    onChange={(event) =>
                      setThreadForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Orn: 4. sinif pediatri stajinda hangi kaynaklar gercekten ise yariyor?"
                    className={INPUT_CLASS}
                  />
                  <textarea
                    value={threadForm.description}
                    onChange={(event) =>
                      setThreadForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Kisa baglam: hedef sinif, sinav tipi, staj ya da ihtiyac..."
                    rows={3}
                    className={INPUT_CLASS}
                  />
                  <textarea
                    value={threadForm.initialPostBody}
                    onChange={(event) =>
                      setThreadForm((prev) => ({ ...prev, initialPostBody: event.target.value }))
                    }
                    placeholder="Ilk mesaji yaz. Net sor, gerekirse vaka baglami ver, topluluktan ne bekledigini acikca belirt."
                    rows={6}
                    className={INPUT_CLASS}
                  />

                  <label className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_80%,transparent)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                    <input
                      type="checkbox"
                      checked={threadForm.containsSpoiler}
                      onChange={(event) =>
                        setThreadForm((prev) => ({ ...prev, containsSpoiler: event.target.checked }))
                      }
                    />
                    Sinav sonrasi icerik, ezber anahtari veya spoiler uyarisi ekle.
                  </label>

                  <Button size="sm" loading={submitting} onClick={submitThread}>
                    <Send size={14} />
                    Thread ac
                  </Button>
                </CardContent>
              </div>
            </Card>

            <Card variant="bordered" className="rounded-3xl p-0">
              <div className="rounded-3xl border border-[var(--color-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-success)_10%,var(--color-surface)),transparent)] p-6">
                <CardHeader className="mb-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen size={18} className="text-[var(--color-success)]" />
                    <CardTitle>Kaynak istasyonu</CardTitle>
                  </div>
                  <CardDescription>
                    Drive linki, PDF, ozet not ya da mevcut materyal ID baglayarak hizli paylas.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <select
                    value={resourceForm.spaceId}
                    onChange={(event) =>
                      setResourceForm((prev) => ({ ...prev, spaceId: event.target.value }))
                    }
                    className={INPUT_CLASS}
                  >
                    {taxonomy.spaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.title}
                      </option>
                    ))}
                  </select>
                  <select
                    value={resourceForm.courseId}
                    onChange={(event) =>
                      setResourceForm((prev) => ({ ...prev, courseId: event.target.value }))
                    }
                    className={INPUT_CLASS}
                  >
                    <option value="">Ders bagla (opsiyonel)</option>
                    {taxonomy.courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={resourceForm.title}
                    onChange={(event) =>
                      setResourceForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Orn: Kisa farmakoloji tekrar semasi"
                    className={INPUT_CLASS}
                  />
                  <textarea
                    value={resourceForm.description}
                    onChange={(event) =>
                      setResourceForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Neyi kapsiyor, hangi sinif icin, neden faydali?"
                    rows={4}
                    className={INPUT_CLASS}
                  />
                  <input
                    value={resourceForm.url}
                    onChange={(event) =>
                      setResourceForm((prev) => ({ ...prev, url: event.target.value }))
                    }
                    placeholder="Drive, PDF veya dis baglanti"
                    className={INPUT_CLASS}
                  />
                  <input
                    value={resourceForm.linkedMaterialId}
                    onChange={(event) =>
                      setResourceForm((prev) => ({ ...prev, linkedMaterialId: event.target.value }))
                    }
                    placeholder="Bagli materials ID (opsiyonel)"
                    className={INPUT_CLASS}
                  />

                  <Button size="sm" variant="secondary" loading={resourceSubmitting} onClick={submitResource}>
                    <Send size={14} />
                    Kaynagi yayinla
                  </Button>
                </CardContent>
              </div>
            </Card>
          </section>

          <section className={cn(PANEL_CLASS, "overflow-hidden")}>
            <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-disabled)]">
                  Ana akis
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
                  Yuksek sinyalli tip ogrencisi feed&apos;i
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                  En aktif threadler, kisa onizleme ve direkt alana gecis ile. Daha az bosluk, daha cok is.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{feed.threads.length} gonderi</Badge>
                <Badge variant="outline">{feed.resources.length} kaynak eslik ediyor</Badge>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              {feed.threads.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[var(--color-border-strong)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_86%,transparent)] p-8 text-center">
                  <p className="text-base font-medium text-[var(--color-text-primary)]">
                    Bu filtrelerle gorunen thread yok.
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                    İlk tartismayi, vaka sorusunu veya study-call thread&apos;ini sen baslat.
                  </p>
                </div>
              ) : (
                feed.threads.map((thread) => (
                  <article
                    key={thread.id}
                    className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_88%,transparent)] p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getContentTypeTone(thread.contentType)}>
                        {getContentTypeLabel(thread.contentType)}
                      </Badge>
                      <Badge variant="secondary">{thread.space.title}</Badge>
                      <Badge variant="outline">{getSpaceTypeLabel(thread.space.type)}</Badge>
                      {thread.containsSpoiler && <Badge variant="warning">Spoiler</Badge>}
                    </div>

                    <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                          {thread.title}
                        </h3>
                        {thread.description && (
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">
                            {thread.description}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/community/spaces/${thread.space.slug}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]"
                      >
                        Alana git
                        <ArrowRight size={14} />
                      </Link>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] text-[11px] font-semibold text-[var(--color-primary)]">
                          {getInitials(thread.author.name ?? thread.author.email)}
                        </div>
                        <span>{thread.author.name ?? thread.author.email}</span>
                      </div>
                      <span>{thread.postCount} mesaj</span>
                      <span>Son hareket {formatRelativeTime(thread.lastActivityAt)}</span>
                    </div>

                    {thread.posts.length > 0 && (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {thread.posts.map((post, index) => (
                          <div
                            key={post.id}
                            className={cn(
                              "rounded-2xl border border-[var(--color-border)] p-4",
                              index === 0
                                ? "bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface))]"
                                : "bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)]",
                            )}
                          >
                            <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-text-secondary)]">
                              <span>{post.author.name ?? post.author.email}</span>
                              <span>{formatRelativeTime(post.createdAt)}</span>
                            </div>
                            <p className="mt-3 line-clamp-4 text-sm leading-6 text-[var(--color-text-primary)]">
                              {post.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link href={`/community/spaces/${thread.space.slug}`}>
                        <Button size="xs">Cevapla</Button>
                      </Link>
                      <Link href="/community/messages">
                        <Button size="xs" variant="ghost">
                          Mesaj akisini ac
                        </Button>
                      </Link>
                      <Button size="xs" variant="ghost" onClick={() => reportTarget("thread", thread.id)}>
                        Raporla
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className={cn(PANEL_CLASS, "p-5 sm:p-6")}>
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-[var(--color-primary)]" />
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Bugunun nabzi</h2>
            </div>
            <div className="mt-4 space-y-3">
              {trendingThreads.map((thread, index) => (
                <Link
                  key={thread.id}
                  href={`/community/spaces/${thread.space.slug}`}
                  className="block rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_88%,transparent)] p-4 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-text-disabled)]">
                        #{index + 1} one cikan thread
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-primary)]">
                        {thread.title}
                      </p>
                    </div>
                    <Badge variant="warning">{thread.postCount} cevap</Badge>
                  </div>
                  <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
                    {thread.space.title} · {formatRelativeTime(thread.lastActivityAt)}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section className={cn(PANEL_CLASS, "p-5 sm:p-6")}>
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-[var(--color-primary)]" />
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Space agi</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              Discord kanal mantigini koruyoruz; ama her alan akademik baglamla etiketli.
            </p>
            <div className="mt-4 space-y-3">
              {feed.spaces.map((space) => (
                <Link
                  key={space.id}
                  href={`/community/spaces/${space.slug}`}
                  className="block rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_88%,transparent)] p-4 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{space.title}</p>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        {getSpaceTypeLabel(space.type)} · {space._count.threads} thread · {space._count.resources} kaynak
                      </p>
                    </div>
                    <Badge variant="secondary">{space._count.chats} sohbet</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className={cn(PANEL_CLASS, "p-5 sm:p-6")}>
            <div className="flex items-center gap-2">
              <GraduationCap size={18} className="text-[var(--color-primary)]" />
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Katki liderleri</h2>
            </div>
            <div className="mt-4 space-y-3">
              {feed.topContributors.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between gap-3 rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_88%,transparent)] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] text-xs font-semibold text-[var(--color-primary)]">
                      {getInitials(person.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{person.name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {person.university ?? "Kampus bilgisi yok"}
                        {person.term ? ` · ${person.term}` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">{person.contributionCount} katki</Badge>
                </div>
              ))}
            </div>
          </section>

          <section className={cn(PANEL_CLASS, "p-5 sm:p-6")}>
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-[var(--color-success)]" />
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Secilmis kaynaklar</h2>
            </div>
            <div className="mt-4 space-y-3">
              {featuredResources.map((resource) => (
                <div
                  key={resource.id}
                  className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_88%,transparent)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{resource.title}</p>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        {resource.course?.name ?? resource.space?.title ?? "Genel akis"}
                      </p>
                    </div>
                    <Badge variant="warning">Skor {resource.qualityScore}</Badge>
                  </div>
                  {resource.description && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                      {resource.description}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {resource.url && (
                      <a href={resource.url} target="_blank" rel="noreferrer">
                        <Button size="xs" variant="ghost">
                          Baglantiyi ac
                        </Button>
                      </a>
                    )}
                    {resource.linkedMaterialId && <Badge variant="secondary">Materyal bagli</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={cn(PANEL_CLASS, "p-5 sm:p-6")}>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[var(--color-success)]" />
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Sistem notu</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
              Kurguyu Reddit, Discord, Figure 1 ve AMBOSS&apos;un en iyi yonlerinden esinlenerek
              tasarladim: kesif + hizli mesaj + klinik baglam + guvenli, moderasyonlu paylasim.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

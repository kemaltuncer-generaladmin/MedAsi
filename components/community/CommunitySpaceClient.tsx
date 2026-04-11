"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Building2,
  MessageCircleMore,
  Pin,
  Send,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  cn,
  formatCommunityDate,
  formatRelativeTime,
  getContentTypeLabel,
  getContentTypeTone,
  getInitials,
  getSpaceTypeLabel,
} from "./community-helpers";

type SpacePayload = {
  space: {
    id: string;
    title: string;
    slug: string;
    type: string;
    accessType: string;
    description: string | null;
    _count: { threads: number; resources: number; chats: number };
    university?: { name: string } | null;
    term?: { name: string } | null;
    course?: { name: string } | null;
  };
  threads: Array<{
    id: string;
    title: string;
    description: string | null;
    contentType: string;
    isPinned: boolean;
    containsSpoiler: boolean;
    postCount: number;
    lastActivityAt: string | Date;
    createdAt: string | Date;
    author: { id: string; name: string | null; email: string };
    posts: Array<{
      id: string;
      body: string;
      createdAt: string | Date;
      isBestAnswer?: boolean;
      author: { name: string | null; email: string };
    }>;
  }>;
  resources: Array<{
    id: string;
    title: string;
    description: string | null;
    qualityScore: number;
    createdAt: string | Date;
    url?: string | null;
    author: { name: string | null; email: string };
  }>;
  chats: Array<{
    id: string;
    title: string;
    isDirectMessage: boolean;
    updatedAt: string | Date;
    members: Array<{ user: { id: string; name: string | null; email: string } }>;
  }>;
};

interface CommunitySpaceClientProps {
  initialData: SpacePayload;
}

const INPUT_CLASS =
  "w-full rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_88%,transparent)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-disabled)] focus:border-[color-mix(in_srgb,var(--color-primary)_55%,transparent)]";

export function CommunitySpaceClient({ initialData }: CommunitySpaceClientProps) {
  const [data, setData] = useState(initialData);
  const [activeThreadId, setActiveThreadId] = useState(initialData.threads[0]?.id ?? "");
  const [replyBody, setReplyBody] = useState("");
  const [threadForm, setThreadForm] = useState({
    title: "",
    description: "",
    contentType: "question",
    initialPostBody: "",
  });
  const [replying, setReplying] = useState(false);
  const [creatingThread, setCreatingThread] = useState(false);

  const activeThread = useMemo(
    () => data.threads.find((thread) => thread.id === activeThreadId) ?? data.threads[0] ?? null,
    [data.threads, activeThreadId],
  );

  async function postReply() {
    if (!activeThread || !replyBody.trim()) return;

    setReplying(true);
    try {
      const res = await fetch(`/api/community/threads/${activeThread.id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Yanit gonderilemedi");

      const nextPost = payload.post;
      setData((current) => ({
        ...current,
        threads: current.threads.map((thread) =>
          thread.id === activeThread.id
            ? {
                ...thread,
                postCount: thread.postCount + 1,
                lastActivityAt: nextPost.createdAt,
                posts: [...thread.posts, nextPost],
              }
            : thread,
        ),
      }));
      setReplyBody("");
      toast.success("Yanit eklendi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Yanit gonderilemedi");
    } finally {
      setReplying(false);
    }
  }

  async function createThread() {
    if (!threadForm.title.trim() || !threadForm.initialPostBody.trim()) return;

    setCreatingThread(true);
    try {
      const res = await fetch("/api/community/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId: data.space.id,
          title: threadForm.title,
          description: threadForm.description,
          contentType: threadForm.contentType,
          initialPostBody: threadForm.initialPostBody,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Thread acilamadi");

      const createdThread = payload.thread;
      setData((current) => ({
        ...current,
        threads: [
          {
            ...createdThread,
            postCount: threadForm.initialPostBody.trim() ? 1 : 0,
            posts: threadForm.initialPostBody.trim()
              ? [
                  {
                    id: `local-${createdThread.id}`,
                    body: threadForm.initialPostBody,
                    createdAt: new Date().toISOString(),
                    author: createdThread.author,
                  },
                ]
              : [],
          },
          ...current.threads,
        ],
      }));
      setThreadForm({ title: "", description: "", contentType: "question", initialPostBody: "" });
      setActiveThreadId(createdThread.id);
      toast.success("Yeni thread acildi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Thread acilamadi");
    } finally {
      setCreatingThread(false);
    }
  }

  return (
    <div className="space-y-6">
      <section
        className="relative overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))] px-5 py-6 sm:px-6 lg:px-8 lg:py-8"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent 34%), linear-gradient(135deg, color-mix(in srgb, var(--color-surface) 92%, #07111b) 0%, color-mix(in srgb, var(--color-surface-elevated) 95%, #081524) 100%)",
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{getSpaceTypeLabel(data.space.type)}</Badge>
              <Badge variant="secondary">{data.space.accessType}</Badge>
              {data.space.university?.name && <Badge variant="secondary">{data.space.university.name}</Badge>}
              {data.space.term?.name && <Badge variant="secondary">{data.space.term.name}</Badge>}
              {data.space.course?.name && <Badge variant="secondary">{data.space.course.name}</Badge>}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-disabled)]">
                Space workspace
              </p>
              <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] sm:text-4xl">
                {data.space.title}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-[var(--color-text-secondary)]">
                {data.space.description ?? "Bu alan, paylasim, soru-cevap ve ders odakli koordinasyon icin ayrildi."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/community/messages">
                <Button size="sm">
                  <MessageCircleMore size={14} />
                  Sohbetleri ac
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
                Akisi yenile
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Thread", value: data.space._count.threads, icon: Sparkles },
              { label: "Kaynak", value: data.space._count.resources, icon: BookOpen },
              { label: "Sohbet", value: data.space._count.chats, icon: Users },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_84%,transparent)] p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <item.icon size={18} className="text-[var(--color-primary)]" />
                  <span className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-disabled)]">
                    aktif
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold text-[var(--color-text-primary)]">{item.value}</p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.35fr_0.9fr]">
        <Card variant="bordered" className="rounded-3xl p-0">
          <div className="h-full rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_90%,transparent)] p-5">
            <CardHeader className="mb-5">
              <CardTitle className="flex items-center gap-2">
                <Building2 size={18} />
                Aktif thread listesi
              </CardTitle>
              <CardDescription>Alan icindeki tartismalar. En aktif olana tek tikla gec.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {data.threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={cn(
                    "w-full rounded-3xl border p-4 text-left transition-transform duration-200 hover:-translate-y-0.5",
                    activeThread?.id === thread.id
                      ? "border-[color-mix(in_srgb,var(--color-primary)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))]"
                      : "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)]",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getContentTypeTone(thread.contentType)}>
                      {getContentTypeLabel(thread.contentType)}
                    </Badge>
                    {thread.isPinned && (
                      <Badge variant="warning">
                        <Pin size={12} className="mr-1" />
                        Sabit
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-text-primary)]">
                    {thread.title}
                  </p>
                  <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                    {thread.postCount} mesaj · {formatRelativeTime(thread.lastActivityAt)}
                  </p>
                </button>
              ))}
            </CardContent>
          </div>
        </Card>

        <Card variant="bordered" className="rounded-3xl p-0">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface)),transparent)] p-5">
            {activeThread ? (
              <>
                <CardHeader className="mb-5 border-b border-[var(--color-border)] pb-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getContentTypeTone(activeThread.contentType)}>
                      {getContentTypeLabel(activeThread.contentType)}
                    </Badge>
                    {activeThread.containsSpoiler && <Badge variant="warning">Spoiler</Badge>}
                  </div>
                  <CardTitle className="mt-3 text-2xl">{activeThread.title}</CardTitle>
                  {activeThread.description && (
                    <CardDescription className="mt-2 leading-6">{activeThread.description}</CardDescription>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                    <span>{activeThread.author.name ?? activeThread.author.email}</span>
                    <span>{formatCommunityDate(activeThread.createdAt)}</span>
                    <span>{activeThread.postCount} mesaj</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                    {activeThread.posts.map((post, index) => (
                      <div
                        key={post.id}
                        className={cn(
                          "rounded-3xl border p-4",
                          index === 0
                            ? "border-[color-mix(in_srgb,var(--color-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface))]"
                            : "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)]",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-text-secondary)]">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] text-[11px] font-semibold text-[var(--color-primary)]">
                              {getInitials(post.author.name ?? post.author.email)}
                            </div>
                            <span>{post.author.name ?? post.author.email}</span>
                          </div>
                          <span>{formatCommunityDate(post.createdAt)}</span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-[var(--color-text-primary)]">{post.body}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-4">
                    <p className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">Hizli cevap</p>
                    <textarea
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                      rows={5}
                      placeholder="Soruyu netlestir, deneyimini yaz veya kaynak oner."
                      className={INPUT_CLASS}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" loading={replying} onClick={postReply}>
                        <Send size={14} />
                        Cevabi gonder
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex h-full min-h-[460px] items-center justify-center rounded-3xl p-8 text-center text-sm text-[var(--color-text-secondary)]">
                Bu alanda henuz thread yok. Ilk tartismayi baslat.
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card variant="bordered" className="rounded-3xl p-0">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-success)_8%,var(--color-surface)),transparent)] p-5">
              <CardHeader className="mb-5">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles size={18} />
                  Yeni thread baslat
                </CardTitle>
                <CardDescription>Bu alana ozel soru, duyuru veya study-call ac.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  value={threadForm.contentType}
                  onChange={(event) =>
                    setThreadForm((prev) => ({ ...prev, contentType: event.target.value }))
                  }
                  className={INPUT_CLASS}
                >
                  <option value="question">Soru-Cevap</option>
                  <option value="discussion">Tartisma</option>
                  <option value="study_call">Calisma Cagrisi</option>
                  <option value="announcement">Duyuru</option>
                </select>
                <input
                  value={threadForm.title}
                  onChange={(event) => setThreadForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Baslik"
                  className={INPUT_CLASS}
                />
                <textarea
                  value={threadForm.description}
                  onChange={(event) =>
                    setThreadForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  rows={3}
                  placeholder="Kisa baglam"
                  className={INPUT_CLASS}
                />
                <textarea
                  value={threadForm.initialPostBody}
                  onChange={(event) =>
                    setThreadForm((prev) => ({ ...prev, initialPostBody: event.target.value }))
                  }
                  rows={5}
                  placeholder="Ilk mesaj"
                  className={INPUT_CLASS}
                />
                <Button size="sm" loading={creatingThread} onClick={createThread}>
                  <Send size={14} />
                  Thread olustur
                </Button>
              </CardContent>
            </div>
          </Card>

          <Card variant="bordered" className="rounded-3xl p-0">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_90%,transparent)] p-5">
              <CardHeader className="mb-5">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen size={18} />
                  Kaynaklar
                </CardTitle>
                <CardDescription>Bu alandaki not, PDF ve faydali baglantilar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{resource.title}</p>
                      <Badge variant="warning">Skor {resource.qualityScore}</Badge>
                    </div>
                    {resource.description && (
                      <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                        {resource.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                      <span>{resource.author.name ?? resource.author.email}</span>
                      <span>{formatCommunityDate(resource.createdAt)}</span>
                    </div>
                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]"
                      >
                        Kaynagi ac
                        <ArrowRight size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </CardContent>
            </div>
          </Card>

          <Card variant="bordered" className="rounded-3xl p-0">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_90%,transparent)] p-5">
              <CardHeader className="mb-5">
                <CardTitle className="flex items-center gap-2">
                  <Users size={18} />
                  Bagli sohbet odalari
                </CardTitle>
                <CardDescription>Kucuk ekipler ve hizli koordinasyon alanlari.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.chats.map((chat) => (
                  <div
                    key={chat.id}
                    className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{chat.title}</p>
                        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                          {chat.members.length} uye · son guncelleme {formatRelativeTime(chat.updatedAt)}
                        </p>
                      </div>
                      <Badge variant={chat.isDirectMessage ? "default" : "secondary"}>
                        {chat.isDirectMessage ? "DM" : "Grup"}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Link href="/community/messages">
                  <Button size="sm" variant="secondary">
                    <MessageCircleMore size={14} />
                    Mesajlari yonet
                  </Button>
                </Link>
              </CardContent>
            </div>
          </Card>

          <div className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-warning)_8%,var(--color-surface))] p-5">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-[var(--color-warning)]" />
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Moderasyon notu</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
              Space yapisini daha islevsel hale getirmek icin thread listesi, detay workspace&apos;i,
              hizli cevap ve bagli kaynaklar ayni ekrana toplandi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

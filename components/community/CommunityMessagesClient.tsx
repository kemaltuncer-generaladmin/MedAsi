"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock3,
  MessageCircleMore,
  Plus,
  Search,
  Send,
  UserPlus,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn, formatCommunityDate, formatRelativeTime, getInitials } from "./community-helpers";

type FeedPeer = {
  id: string;
  name: string;
  university: string | null;
  term: string | null;
};

type ChatPayload = {
  id: string;
  title: string;
  isDirectMessage: boolean;
  updatedAt: string;
  lastMessageAt: string | null;
  members: Array<{
    user: {
      id: string;
      name: string | null;
      email: string;
      academicProfile?: {
        university?: { name: string } | null;
        term?: { name: string } | null;
      } | null;
    };
  }>;
  messages: Array<{
    id: string;
    body: string;
    createdAt: string;
    authorUser: { id: string; name: string | null; email: string };
  }>;
  space?: { title: string } | null;
};

const INPUT_CLASS =
  "w-full rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_88%,transparent)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-disabled)] focus:border-[color-mix(in_srgb,var(--color-primary)_55%,transparent)]";

export function CommunityMessagesClient() {
  const [chats, setChats] = useState<ChatPayload[]>([]);
  const [peers, setPeers] = useState<FeedPeer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string>("");
  const [messageBody, setMessageBody] = useState("");
  const [dmTargetUserId, setDmTargetUserId] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async (preferFirstChat = false) => {
    setLoading(true);
    try {
      const [chatRes, feedRes] = await Promise.all([
        fetch("/api/community/messages/groups", { cache: "no-store" }),
        fetch("/api/community/feed", { cache: "no-store" }),
      ]);
      if (!chatRes.ok || !feedRes.ok) {
        throw new Error("Mesaj verileri yuklenemedi");
      }
      const [{ chats: nextChats }, feed] = await Promise.all([chatRes.json(), feedRes.json()]);
      setChats(nextChats);
      setPeers(feed.topContributors ?? []);

      const nextSelection =
        preferFirstChat || !selectedChatId
          ? nextChats[0]?.id ?? ""
          : nextChats.some((chat: ChatPayload) => chat.id === selectedChatId)
            ? selectedChatId
            : nextChats[0]?.id ?? "";
      setSelectedChatId(nextSelection);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mesajlar yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, [selectedChatId]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("community-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_chat_messages" },
        async () => {
          await loadData(false);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? null,
    [chats, selectedChatId],
  );

  const filteredChats = useMemo(() => {
    if (!query.trim()) return chats;
    const term = query.toLowerCase();
    return chats.filter((chat) => {
      const memberNames = chat.members
        .map((member) => member.user.name ?? member.user.email)
        .join(" ")
        .toLowerCase();
      return chat.title.toLowerCase().includes(term) || memberNames.includes(term);
    });
  }, [chats, query]);

  async function sendMessage() {
    if (!messageBody.trim() || !selectedChat) return;
    setSending(true);
    try {
      const res = await fetch("/api/community/messages/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: selectedChat.id, body: messageBody }),
      });
      if (!res.ok) throw new Error("Mesaj gonderilemedi");
      setMessageBody("");
      await loadData(false);
    } catch {
      toast.error("Mesaj gonderilemedi");
    } finally {
      setSending(false);
    }
  }

  async function startDirectMessage() {
    if (!dmTargetUserId || !messageBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/community/messages/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: dmTargetUserId, body: messageBody }),
      });
      if (!res.ok) throw new Error("DM baslatilamadi");
      setMessageBody("");
      setDmTargetUserId("");
      await loadData(true);
      toast.success("Yeni DM acildi");
    } catch {
      toast.error("DM baslatilamadi");
    } finally {
      setSending(false);
    }
  }

  async function createGroupChat() {
    if (!groupTitle.trim() || groupMemberIds.length === 0 || !messageBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/community/messages/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: groupTitle,
          memberIds: groupMemberIds,
          body: messageBody,
        }),
      });
      if (!res.ok) throw new Error("Grup olusturulamadi");
      setGroupTitle("");
      setGroupMemberIds([]);
      setMessageBody("");
      await loadData(true);
      toast.success("Calisma grubu olusturuldu");
    } catch {
      toast.error("Grup olusturulamadi");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_340px]">
        <div className="h-[720px] animate-pulse rounded-3xl bg-[var(--color-surface-elevated)]" />
        <div className="h-[720px] animate-pulse rounded-3xl bg-[var(--color-surface-elevated)]" />
        <div className="hidden h-[720px] animate-pulse rounded-3xl bg-[var(--color-surface-elevated)] xl:block" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section
        className="overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))] px-5 py-6 sm:px-6 lg:px-8 lg:py-8"
        style={{
          background:
            "radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent 30%), linear-gradient(135deg, color-mix(in srgb, var(--color-surface) 92%, #07111b) 0%, color-mix(in srgb, var(--color-surface-elevated) 95%, #081524) 100%)",
        }}
      >
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="space-y-4">
            <Badge variant="outline">Realtime coordination</Badge>
            <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] sm:text-4xl">
              DM, study group ve hizli koordinasyon ayni merkezde.
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-[var(--color-text-secondary)]">
              Discord&apos;un hizini koruduk; ama goruntuyu daha sakin, ders baglamini daha net ve
              mesaj baslatmayi daha verimli hale getirdik.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Aktif sohbet", value: chats.length, icon: MessageCircleMore },
              { label: "Muhtemel eslesme", value: peers.length, icon: Users },
              { label: "Son hareket", value: selectedChat?.lastMessageAt ? "Canli" : "Yeni", icon: Clock3 },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_84%,transparent)] p-4"
              >
                <item.icon size={18} className="text-[var(--color-primary)]" />
                <p className="mt-4 text-2xl font-semibold text-[var(--color-text-primary)]">{item.value}</p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_340px]">
        <Card variant="bordered" className="rounded-3xl p-0">
          <div className="h-full rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_90%,transparent)] p-5">
            <CardHeader className="mb-5">
              <CardTitle className="flex items-center gap-2">
                <Users size={18} />
                Sohbet gezgini
              </CardTitle>
              <CardDescription>DM ve grup odalarini tek listede kesfet.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-disabled)]"
                />
                <input
                  value={query}
                  onChange={(event) =>
                    startTransition(() => setQuery(event.target.value))
                  }
                  placeholder="Kisi ya da sohbet ara"
                  className={cn(INPUT_CLASS, "pl-10")}
                />
              </div>

              <div className="max-h-[590px] space-y-3 overflow-y-auto pr-1">
                {filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={cn(
                      "w-full rounded-3xl border p-4 text-left transition-transform duration-200 hover:-translate-y-0.5",
                      selectedChatId === chat.id
                        ? "border-[color-mix(in_srgb,var(--color-primary)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))]"
                        : "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{chat.title}</p>
                      <Badge variant={chat.isDirectMessage ? "default" : "secondary"}>
                        {chat.isDirectMessage ? "DM" : "Grup"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                      {chat.members.length} uye
                      {chat.space?.title ? ` · ${chat.space.title}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {chat.lastMessageAt ? formatRelativeTime(chat.lastMessageAt) : "Mesaj yok"}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </div>
        </Card>

        <Card variant="bordered" className="rounded-3xl p-0">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface)),transparent)] p-5">
            <CardHeader className="mb-5 border-b border-[var(--color-border)] pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={selectedChat?.isDirectMessage ? "default" : "secondary"}>
                  {selectedChat?.isDirectMessage ? "DM kanali" : "Calisma grubu"}
                </Badge>
                {selectedChat?.space?.title && <Badge variant="outline">{selectedChat.space.title}</Badge>}
              </div>
              <CardTitle className="mt-3 text-2xl">
                {selectedChat?.title ?? "Bir sohbet sec"}
              </CardTitle>
              <CardDescription className="mt-2">
                Realtime dinleme acik. Yeni mesajlar otomatik yansitilir.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {selectedChat ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {selectedChat.members.map((member) => (
                      <Badge key={member.user.id} variant="secondary">
                        {member.user.name ?? member.user.email}
                      </Badge>
                    ))}
                  </div>

                  <div className="max-h-[520px] min-h-[420px] space-y-3 overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_84%,transparent)] p-4">
                    {selectedChat.messages.map((message, index) => {
                      const isAccent = index % 3 === 0;
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "max-w-[90%] rounded-3xl border p-4",
                            isAccent
                              ? "ml-auto border-[color-mix(in_srgb,var(--color-primary)_36%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))]"
                              : "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)]",
                          )}
                        >
                          <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] text-[11px] font-semibold text-[var(--color-primary)]">
                              {getInitials(message.authorUser.name ?? message.authorUser.email)}
                            </div>
                            <span>{message.authorUser.name ?? message.authorUser.email}</span>
                            <span>{formatCommunityDate(message.createdAt)}</span>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-[var(--color-text-primary)]">
                            {message.body}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex min-h-[480px] items-center justify-center rounded-3xl border border-dashed border-[var(--color-border-strong)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_84%,transparent)] text-center text-sm text-[var(--color-text-secondary)]">
                  Sol panelden bir sohbet sec ya da sagdaki hizli aksiyonlarla yeni kanal ac.
                </div>
              )}

              <div className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-4">
                <textarea
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                  rows={5}
                  placeholder={
                    dmTargetUserId && !selectedChat
                      ? "Bu mesaj yeni DM'i baslatacak"
                      : groupMemberIds.length > 0 && !selectedChat
                        ? "Bu mesaj yeni study group kanalinin ilk mesaji olacak"
                        : "Mesajini yaz..."
                  }
                  className={INPUT_CLASS}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedChat && (
                    <Button size="sm" loading={sending} onClick={sendMessage}>
                      <Send size={14} />
                      Mesaj gonder
                    </Button>
                  )}
                  {dmTargetUserId && !selectedChat && (
                    <Button size="sm" variant="secondary" loading={sending} onClick={startDirectMessage}>
                      <UserPlus size={14} />
                      DM baslat
                    </Button>
                  )}
                  {groupMemberIds.length > 0 && !selectedChat && (
                    <Button size="sm" variant="secondary" loading={sending} onClick={createGroupChat}>
                      <Plus size={14} />
                      Grup kur
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        <div className="space-y-6">
          <Card variant="bordered" className="rounded-3xl p-0">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_90%,transparent)] p-5">
              <CardHeader className="mb-5">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus size={18} />
                  Yeni DM
                </CardTitle>
                <CardDescription>Katki liderlerinden biriyle hizli iletisim baslat.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  value={dmTargetUserId}
                  onChange={(event) => {
                    setSelectedChatId("");
                    setGroupMemberIds([]);
                    setDmTargetUserId(event.target.value);
                  }}
                  className={INPUT_CLASS}
                >
                  <option value="">Katilimci sec</option>
                  {peers.map((peer) => (
                    <option key={peer.id} value={peer.id}>
                      {peer.name}
                      {peer.university ? ` · ${peer.university}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
                  DM baslatmak icin kisi sec ve ortadaki editore ilk mesaji yaz.
                </p>
              </CardContent>
            </div>
          </Card>

          <Card variant="bordered" className="rounded-3xl p-0">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_90%,transparent)] p-5">
              <CardHeader className="mb-5">
                <CardTitle className="flex items-center gap-2">
                  <Plus size={18} />
                  Study group kur
                </CardTitle>
                <CardDescription>Kucuk bir ekip topla, ilk mesaji gonder ve akisi ac.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  value={groupTitle}
                  onChange={(event) => {
                    setSelectedChatId("");
                    setDmTargetUserId("");
                    setGroupTitle(event.target.value);
                  }}
                  placeholder="Orn: Pediatri staj tekrar grubu"
                  className={INPUT_CLASS}
                />

                <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                  {peers.map((peer) => {
                    const checked = groupMemberIds.includes(peer.id);
                    return (
                      <label
                        key={peer.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] px-4 py-3 text-sm"
                      >
                        <span>
                          {peer.name}
                          <span className="block text-xs text-[var(--color-text-secondary)]">
                            {peer.university ?? "Kampus bilgisi yok"}
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            setSelectedChatId("");
                            setDmTargetUserId("");
                            setGroupMemberIds((current) =>
                              event.target.checked
                                ? [...current, peer.id]
                                : current.filter((value) => value !== peer.id),
                            );
                          }}
                        />
                      </label>
                    );
                  })}
                </div>

                <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
                  Grup kurmak icin baslik ver, katilimcilari sec ve ortadaki editore ilk mesajini yaz.
                </p>
              </CardContent>
            </div>
          </Card>

          <div className="rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface))] p-5">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Neden bu duzen?</p>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
              Sol panel kesif, orta panel aktif sohbet, sag panel ise yeni aksiyonlar icin ayrildi.
              Boylece mesajlasma ekrani gercek bir operasyon merkezi gibi calisiyor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

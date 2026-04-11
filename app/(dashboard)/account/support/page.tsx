"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { LifeBuoy, MessageSquare, Send } from "lucide-react";
import toast from "react-hot-toast";
import {
  createSupportTicket,
  getMySupportTickets,
  replyToMySupportTicket,
  SUPPORT_PRIORITIES,
} from "@/lib/actions/support";
import { AccountSubpageShell } from "@/components/account/AccountSubpageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type Ticket = Awaited<ReturnType<typeof getMySupportTickets>>[number];

const CATEGORY_OPTIONS = ["teknik", "ödeme", "paket", "erişim", "içerik", "diğer"] as const;

function statusLabel(status: string): string {
  if (status === "open") return "Açık";
  if (status === "triaged") return "Ön İnceleme";
  if (status === "in_progress") return "İşlemde";
  if (status === "waiting_user") return "Yanıt Bekliyor";
  if (status === "resolved") return "Çözüldü";
  if (status === "closed") return "Kapalı";
  return status;
}

function statusVariant(status: string): "default" | "secondary" | "warning" | "success" {
  if (status === "resolved") return "success";
  if (status === "waiting_user") return "warning";
  if (status === "in_progress") return "default";
  return "secondary";
}

function priorityLabel(priority: string): string {
  if (priority === "low") return "Düşük";
  if (priority === "high") return "Yüksek";
  if (priority === "urgent") return "Acil";
  return "Normal";
}

export default function AccountSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string>("teknik");
  const [priority, setPriority] = useState<string>("normal");
  const [message, setMessage] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  async function load() {
    try {
      setTickets(await getMySupportTickets());
    } catch {
      toast.error("Destek talepleri yüklenemedi");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const openTicketCount = useMemo(
    () => tickets.filter((ticket) => ticket.status !== "resolved" && ticket.status !== "closed").length,
    [tickets],
  );

  function createTicket() {
    if (!subject.trim() || !message.trim()) {
      toast.error("Konu ve mesaj alanı zorunludur.");
      return;
    }

    startTransition(async () => {
      try {
        await createSupportTicket({
          subject: subject.trim(),
          category,
          priority,
          message: message.trim(),
        });
        setSubject("");
        setMessage("");
        setPriority("normal");
        setCategory("teknik");
        toast.success("Destek talebiniz oluşturuldu");
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Talep oluşturulamadı");
      }
    });
  }

  function reply(ticketId: string) {
    const draft = replyDrafts[ticketId]?.trim() ?? "";
    if (!draft) {
      toast.error("Yanıt mesajı boş olamaz");
      return;
    }

    startTransition(async () => {
      try {
        await replyToMySupportTicket(ticketId, draft);
        setReplyDrafts((prev) => ({ ...prev, [ticketId]: "" }));
        toast.success("Yanıt gönderildi");
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Yanıt gönderilemedi");
      }
    });
  }

  return (
    <AccountSubpageShell
      icon={LifeBuoy}
      title="Destek"
      description="Teknik sorun, erişim, ödeme veya içerik taleplerinizi takip edin."
      stats={[
        { label: "Toplam talep", value: String(tickets.length) },
        { label: "Açık talep", value: String(openTicketCount) },
        {
          label: "Son güncelleme",
          value: tickets[0] ? new Date(tickets[0].updatedAt).toLocaleDateString("tr-TR") : "-",
        },
        { label: "Durum", value: openTicketCount > 0 ? "Takipte" : "Stabil" },
      ]}
    >
      <Card variant="bordered" className="rounded-3xl">
        <CardHeader>
          <CardTitle>Yeni talep oluştur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1.3fr_0.8fr_0.8fr]">
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Konu başlığı"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm"
            >
              {SUPPORT_PRIORITIES.map((option) => (
                <option key={option} value={option}>
                  {priorityLabel(option)}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            placeholder="Sorununuzu kısa adımlarla anlatın: ne yaptınız, nerede takıldınız, ne bekliyordunuz?"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm"
          />

          <Button onClick={createTicket} loading={isPending}>
            <Send size={14} />
            Talep oluştur
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {tickets.length === 0 ? (
          <Card variant="bordered" className="rounded-3xl">
            <CardContent className="flex items-center gap-3 py-8 text-sm text-[var(--color-text-secondary)]">
              <MessageSquare size={16} />
              Henüz destek talebiniz bulunmuyor.
            </CardContent>
          </Card>
        ) : (
          tickets.map((ticket) => {
            const canReply = ticket.status !== "closed";
            return (
              <Card key={ticket.id} variant="bordered" className="rounded-3xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-[var(--color-text-primary)]">{ticket.subject}</h2>
                      <Badge variant={statusVariant(ticket.status)}>{statusLabel(ticket.status)}</Badge>
                      <Badge variant="outline">{priorityLabel(ticket.priority)}</Badge>
                      {ticket.isOverdue && ticket.status !== "closed" ? (
                        <Badge variant="warning">Gecikmiş</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {ticket.category ?? "genel"} · {new Date(ticket.createdAt).toLocaleString("tr-TR")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {ticket.messages.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-xl border px-4 py-3 ${
                        entry.isAdmin
                          ? "border-sky-500/30 bg-sky-500/10"
                          : "border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
                      }`}
                    >
                      <p className="mb-1 text-xs text-[var(--color-text-secondary)]">
                        {entry.isAdmin ? "Destek Ekibi" : "Siz"} · {new Date(entry.createdAt).toLocaleString("tr-TR")}
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{entry.body}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-3 md:flex-row">
                  <textarea
                    value={replyDrafts[ticket.id] ?? ""}
                    onChange={(event) =>
                      setReplyDrafts((prev) => ({ ...prev, [ticket.id]: event.target.value }))
                    }
                    rows={3}
                    disabled={!canReply}
                    className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm disabled:opacity-60"
                    placeholder={canReply ? "Talebe yanıt yazın" : "Kapalı taleplere yanıt eklenemez"}
                  />
                  <Button onClick={() => reply(ticket.id)} loading={isPending} disabled={!canReply}>
                    Yanıtla
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </AccountSubpageShell>
  );
}

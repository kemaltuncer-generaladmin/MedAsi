"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  createSupportTicket,
  getMySupportTickets,
  replyToMySupportTicket,
  SUPPORT_PRIORITIES,
} from "@/lib/actions/support";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type Ticket = Awaited<ReturnType<typeof getMySupportTickets>>[number];

const CATEGORY_OPTIONS = [
  "teknik",
  "ödeme",
  "paket",
  "erişim",
  "içerik",
  "diğer",
] as const;

function statusLabel(status: string) {
  switch (status) {
    case "open":
      return "Açık";
    case "triaged":
      return "Ön İncelemede";
    case "in_progress":
      return "İşlemde";
    case "waiting_user":
      return "Sizden Yanıt Bekleniyor";
    case "resolved":
      return "Çözüldü";
    case "closed":
      return "Kapalı";
    default:
      return status;
  }
}

function statusVariant(status: string): "default" | "secondary" | "warning" | "success" | "destructive" {
  switch (status) {
    case "resolved":
      return "success";
    case "closed":
      return "secondary";
    case "waiting_user":
      return "warning";
    case "in_progress":
      return "default";
    default:
      return "secondary";
  }
}

function priorityLabel(priority: string) {
  switch (priority) {
    case "low":
      return "Düşük";
    case "normal":
      return "Normal";
    case "high":
      return "Yüksek";
    case "urgent":
      return "Acil";
    default:
      return priority;
  }
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
      toast.error("Destek talepleri yüklenemedi.");
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
    startTransition(async () => {
      try {
        await createSupportTicket({ subject, category, priority, message });
        setSubject("");
        setMessage("");
        setPriority("normal");
        setCategory("teknik");
        toast.success("Destek talebiniz oluşturuldu.");
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Talep oluşturulamadı.");
      }
    });
  }

  function reply(ticketId: string) {
    const draft = replyDrafts[ticketId]?.trim() ?? "";
    if (!draft) return;
    startTransition(async () => {
      try {
        await replyToMySupportTicket(ticketId, draft);
        setReplyDrafts((prev) => ({ ...prev, [ticketId]: "" }));
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Yanıt gönderilemedi.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Destek Talepleri</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Ürün, erişim veya ödeme tarafında takıldığınız her konuda bize buradan yazabilirsiniz.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">Açık Talep</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">{openTicketCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Konu"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
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
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Sorununuzu detaylıca yazın"
          rows={5}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
        />
        <Button onClick={createTicket} loading={isPending}>
          Talep Oluştur
        </Button>
      </div>

      <div className="space-y-4">
        {tickets.map((ticket) => {
          const canReply = ticket.status !== "closed";
          return (
            <div
              key={ticket.id}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
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
                    {ticket.assignedAdmin ? ` · Atanan: ${ticket.assignedAdmin.name ?? ticket.assignedAdmin.email}` : " · Henüz atama yapılmadı"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {ticket.messages.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-xl px-4 py-3 ${
                      entry.isAdmin
                        ? "border border-sky-500/25 bg-sky-500/10"
                        : "border border-[var(--color-border)] bg-[var(--color-background)]"
                    }`}
                  >
                    <p className="mb-1 text-xs text-[var(--color-text-secondary)]">
                      {entry.isAdmin ? "Destek Ekibi" : "Siz"} · {new Date(entry.createdAt).toLocaleString("tr-TR")}
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{entry.body}</p>
                  </div>
                ))}
              </div>

              {ticket.audits.length > 0 ? (
                <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
                    Son İşlem Akışı
                  </p>
                  <div className="mt-3 space-y-2">
                    {ticket.audits.map((audit) => (
                      <div key={audit.id} className="text-xs text-[var(--color-text-secondary)]">
                        {new Date(audit.createdAt).toLocaleString("tr-TR")} · {audit.action.replaceAll("_", " ")}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex gap-3">
                <textarea
                  value={replyDrafts[ticket.id] ?? ""}
                  onChange={(e) =>
                    setReplyDrafts((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                  }
                  rows={3}
                  disabled={!canReply}
                  className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 disabled:opacity-60"
                  placeholder={canReply ? "Bu talebe yanıt yazın" : "Kapalı taleplere yanıt eklenemez"}
                />
                <Button onClick={() => reply(ticket.id)} loading={isPending} disabled={!canReply}>
                  Yanıtla
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

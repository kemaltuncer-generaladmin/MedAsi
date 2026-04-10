"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  addSupportTicketInternalNote,
  getAdminSupportTickets,
  getSupportAdmins,
  replyToSupportTicketAsAdmin,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  updateSupportTicketAdmin,
} from "@/lib/actions/support";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type Ticket = Awaited<ReturnType<typeof getAdminSupportTickets>>[number];
type AdminUser = Awaited<ReturnType<typeof getSupportAdmins>>[number];

type QueueFilter = "all" | "unassigned" | "overdue" | "waiting_user";

function statusLabel(status: string) {
  switch (status) {
    case "open":
      return "Açık";
    case "triaged":
      return "Ön İncelemede";
    case "in_progress":
      return "İşlemde";
    case "waiting_user":
      return "Kullanıcı Bekleniyor";
    case "resolved":
      return "Çözüldü";
    case "closed":
      return "Kapalı";
    default:
      return status;
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

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [closeReasons, setCloseReasons] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [isPending, startTransition] = useTransition();

  async function load() {
    try {
      const [ticketRows, adminRows] = await Promise.all([
        getAdminSupportTickets(),
        getSupportAdmins(),
      ]);
      setTickets(ticketRows);
      setAdmins(adminRows);
    } catch {
      toast.error("Destek talepleri yüklenemedi.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredTickets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesSearch =
        !normalizedSearch ||
        ticket.subject.toLowerCase().includes(normalizedSearch) ||
        (ticket.user.name ?? ticket.user.email).toLowerCase().includes(normalizedSearch) ||
        ticket.user.email.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
      const matchesQueue =
        queueFilter === "all" ||
        (queueFilter === "unassigned" && !ticket.assignedAdminUserId) ||
        (queueFilter === "overdue" && ticket.isOverdue) ||
        (queueFilter === "waiting_user" && ticket.status === "waiting_user");

      return matchesSearch && matchesStatus && matchesPriority && matchesQueue;
    });
  }, [priorityFilter, queueFilter, search, statusFilter, tickets]);

  const queueStats = useMemo(
    () => ({
      total: tickets.length,
      unassigned: tickets.filter((ticket) => !ticket.assignedAdminUserId).length,
      overdue: tickets.filter((ticket) => ticket.isOverdue).length,
      waitingUser: tickets.filter((ticket) => ticket.status === "waiting_user").length,
    }),
    [tickets],
  );

  function mutateTicket(ticketId: string, payload: Parameters<typeof updateSupportTicketAdmin>[0]) {
    startTransition(async () => {
      try {
        await updateSupportTicketAdmin(payload);
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Talep güncellenemedi.");
      }
    });
  }

  function reply(ticketId: string) {
    const draft = replyDrafts[ticketId]?.trim() ?? "";
    if (!draft) return;
    startTransition(async () => {
      try {
        await replyToSupportTicketAsAdmin(ticketId, draft);
        setReplyDrafts((prev) => ({ ...prev, [ticketId]: "" }));
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Yanıt gönderilemedi.");
      }
    });
  }

  function saveInternalNote(ticketId: string) {
    const draft = noteDrafts[ticketId]?.trim() ?? "";
    if (!draft) return;
    startTransition(async () => {
      try {
        await addSupportTicketInternalNote(ticketId, draft);
        setNoteDrafts((prev) => ({ ...prev, [ticketId]: "" }));
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "İç not kaydedilemedi.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Destek Kuyruğu</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Talepleri önceliklendir, atama yap, iç not ekle ve kullanıcı yanıtlarını yönet.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Toplam Talep", value: queueStats.total },
          { label: "Atanmamış", value: queueStats.unassigned },
          { label: "SLA Gecikmiş", value: queueStats.overdue },
          { label: "Kullanıcı Bekleniyor", value: queueStats.waitingUser },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--color-text-primary)]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Konu, kullanıcı veya e-posta ara"
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
        />
        <select
          value={queueFilter}
          onChange={(e) => setQueueFilter(e.target.value as QueueFilter)}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
        >
          <option value="all">Tüm Kuyruk</option>
          <option value="unassigned">Atanmamış</option>
          <option value="overdue">SLA Gecikmiş</option>
          <option value="waiting_user">Kullanıcı Bekleniyor</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
        >
          <option value="all">Tüm Durumlar</option>
          {SUPPORT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
        >
          <option value="all">Tüm Öncelikler</option>
          {SUPPORT_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priorityLabel(priority)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {filteredTickets.map((ticket) => (
          <div key={ticket.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-[var(--color-text-primary)]">{ticket.subject}</h2>
                  <Badge variant={statusVariant(ticket.status)}>{statusLabel(ticket.status)}</Badge>
                  <Badge variant="outline">{priorityLabel(ticket.priority)}</Badge>
                  {ticket.isOverdue ? <Badge variant="warning">SLA Gecikmiş</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {ticket.user.name ?? ticket.user.email} · {ticket.user.email} · {ticket.category ?? "genel"}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Açılış: {new Date(ticket.createdAt).toLocaleString("tr-TR")}
                  {ticket.firstResponseAt ? ` · İlk yanıt: ${new Date(ticket.firstResponseAt).toLocaleString("tr-TR")}` : " · İlk yanıt henüz yok"}
                  {ticket.lastResponseAt ? ` · Son yanıt: ${new Date(ticket.lastResponseAt).toLocaleString("tr-TR")}` : ""}
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <select
                  value={ticket.assignedAdminUserId ?? ""}
                  onChange={(e) =>
                    mutateTicket(ticket.id, {
                      ticketId: ticket.id,
                      status: ticket.status,
                      priority: ticket.priority,
                      assignedAdminUserId: e.target.value || null,
                      closeReason: closeReasons[ticket.id] ?? ticket.closeReason ?? "",
                    })
                  }
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                >
                  <option value="">Atama yok</option>
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name ?? admin.email}
                    </option>
                  ))}
                </select>
                <select
                  value={ticket.status}
                  onChange={(e) =>
                    mutateTicket(ticket.id, {
                      ticketId: ticket.id,
                      status: e.target.value,
                      priority: ticket.priority,
                      assignedAdminUserId: ticket.assignedAdminUserId,
                      closeReason: closeReasons[ticket.id] ?? ticket.closeReason ?? "",
                    })
                  }
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                >
                  {SUPPORT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
                <select
                  value={ticket.priority}
                  onChange={(e) =>
                    mutateTicket(ticket.id, {
                      ticketId: ticket.id,
                      status: ticket.status,
                      priority: e.target.value,
                      assignedAdminUserId: ticket.assignedAdminUserId,
                      closeReason: closeReasons[ticket.id] ?? ticket.closeReason ?? "",
                    })
                  }
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                >
                  {SUPPORT_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priorityLabel(priority)}
                    </option>
                  ))}
                </select>
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
                    {entry.authorUser.name ?? entry.authorUser.email} · {new Date(entry.createdAt).toLocaleString("tr-TR")}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{entry.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="space-y-3">
                <textarea
                  value={replyDrafts[ticket.id] ?? ""}
                  onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  placeholder="Kullanıcıya yanıt yazın"
                />
                <div className="flex gap-3">
                  <Button onClick={() => reply(ticket.id)} loading={isPending}>
                    Yanıt Gönder
                  </Button>
                  {ticket.status === "closed" ? (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        mutateTicket(ticket.id, {
                          ticketId: ticket.id,
                          status: "open",
                          priority: ticket.priority,
                          assignedAdminUserId: ticket.assignedAdminUserId,
                          closeReason: "",
                        })
                      }
                      loading={isPending}
                    >
                      Yeniden Aç
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <textarea
                  value={noteDrafts[ticket.id] ?? ""}
                  onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  placeholder="İç not ekle"
                />
                <textarea
                  value={closeReasons[ticket.id] ?? ticket.closeReason ?? ""}
                  onChange={(e) => setCloseReasons((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  placeholder="Kapatma nedeni"
                />
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => saveInternalNote(ticket.id)} loading={isPending}>
                    İç Not Kaydet
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      mutateTicket(ticket.id, {
                        ticketId: ticket.id,
                        status: "closed",
                        priority: ticket.priority,
                        assignedAdminUserId: ticket.assignedAdminUserId,
                        closeReason: closeReasons[ticket.id] ?? ticket.closeReason ?? "",
                      })
                    }
                    loading={isPending}
                  >
                    Kapat
                  </Button>
                </div>
              </div>
            </div>

            {ticket.notes.length > 0 ? (
              <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">İç Notlar</p>
                <div className="mt-3 space-y-2">
                  {ticket.notes.map((note) => (
                    <div key={note.id} className="rounded-lg border border-[var(--color-border)] px-3 py-2">
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {note.authorUser.name ?? note.authorUser.email} · {new Date(note.createdAt).toLocaleString("tr-TR")}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{note.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {ticket.audits.length > 0 ? (
              <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">Audit İzleri</p>
                <div className="mt-3 space-y-2">
                  {ticket.audits.map((audit) => (
                    <div key={audit.id} className="text-xs text-[var(--color-text-secondary)]">
                      {new Date(audit.createdAt).toLocaleString("tr-TR")} · {(audit.actorUser?.name ?? audit.actorUser?.email ?? "sistem")} · {audit.action.replaceAll("_", " ")}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

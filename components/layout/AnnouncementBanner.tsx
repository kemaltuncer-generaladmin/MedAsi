"use client";

import { useState, useEffect } from "react";
import { X, Info, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import type { AdminAnnouncement } from "@/lib/system-settings";

const DISMISSED_KEY = "medasi_dismissed_announcements";

function getDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function addDismissed(id: string): void {
  try {
    const current = getDismissed();
    if (!current.includes(id)) {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...current, id]));
    }
  } catch {}
}

const typeConfig = {
  info: {
    bg: "bg-blue-500/10 border-blue-500/30",
    text: "text-blue-400",
    icon: Info,
  },
  warning: {
    bg: "bg-yellow-500/10 border-yellow-500/30",
    text: "text-yellow-400",
    icon: AlertTriangle,
  },
  success: {
    bg: "bg-green-500/10 border-green-500/30",
    text: "text-green-400",
    icon: CheckCircle,
  },
  error: {
    bg: "bg-red-500/10 border-red-500/30",
    text: "text-red-400",
    icon: AlertCircle,
  },
} as const;

interface Props {
  announcements: AdminAnnouncement[];
}

export function AnnouncementBanner({ announcements }: Props) {
  const [visible, setVisible] = useState<AdminAnnouncement[]>([]);

  useEffect(() => {
    const dismissed = getDismissed();
    const now = new Date();
    setVisible(
      announcements.filter((a) => {
        if (!a.active) return false;
        if (dismissed.includes(a.id)) return false;
        if (a.expiresAt && new Date(a.expiresAt) < now) return false;
        return true;
      }),
    );
  }, [announcements]);

  function dismiss(id: string) {
    addDismissed(id);
    setVisible((prev) => prev.filter((a) => a.id !== id));
  }

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5">
      {visible.map((announcement) => {
        const config = typeConfig[announcement.type] ?? typeConfig.info;
        const Icon = config.icon;
        return (
          <div
            key={announcement.id}
            className={`flex items-center gap-3 px-4 py-2 border-b text-sm ${config.bg}`}
          >
            <Icon size={14} className={`shrink-0 ${config.text}`} />
            <span className={`font-medium ${config.text} shrink-0`}>
              {announcement.title}
            </span>
            <span className="text-[var(--color-text-secondary)] flex-1 truncate">
              {announcement.message}
            </span>
            <button
              onClick={() => dismiss(announcement.id)}
              className={`shrink-0 p-0.5 rounded hover:opacity-70 transition-opacity ${config.text}`}
              aria-label="Kapat"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

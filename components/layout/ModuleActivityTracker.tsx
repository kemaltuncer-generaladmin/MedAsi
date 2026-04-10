"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const TRACKING_WINDOW_MS = 60_000;

export function ModuleActivityTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const storageKey = `medasi:activity:${pathname}`;
    const lastTrackedAt = Number(window.sessionStorage.getItem(storageKey) ?? "0");
    if (Date.now() - lastTrackedAt < TRACKING_WINDOW_MS) {
      return;
    }

    window.sessionStorage.setItem(storageKey, String(Date.now()));

    void fetch("/api/telemetry/module-activity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: pathname,
        action: "page_view",
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}


"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const TRACKING_WINDOW_MS = 5 * 60_000;
const TRACKING_IDLE_DELAY_MS = 800;

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

    const body = JSON.stringify({
      path: pathname,
      action: "page_view",
    });

    const timer = window.setTimeout(() => {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon("/api/telemetry/module-activity", blob);
        return;
      }

      void fetch("/api/telemetry/module-activity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
        keepalive: true,
      }).catch(() => {});
    }, TRACKING_IDLE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}

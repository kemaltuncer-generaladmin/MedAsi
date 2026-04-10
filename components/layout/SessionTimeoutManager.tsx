"use client";

import { useEffect, useRef } from "react";

type SessionTimeoutManagerProps = {
  timeoutMinutes: number;
};

export function SessionTimeoutManager({
  timeoutMinutes,
}: SessionTimeoutManagerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutMs = Math.max(1, timeoutMinutes) * 60 * 1000;

  useEffect(() => {
    async function handleTimeout() {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          keepalive: true,
        });
      } finally {
        window.location.replace("/login?reason=session_timeout");
      }
    }

    function armTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void handleTimeout();
      }, timeoutMs);
    }

    const events: Array<keyof WindowEventMap> = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
      "focus",
    ];

    const onActivity = () => armTimer();
    armTimer();

    events.forEach((eventName) => {
      window.addEventListener(eventName, onActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((eventName) => {
        window.removeEventListener(eventName, onActivity);
      });
    };
  }, [timeoutMs]);

  return null;
}


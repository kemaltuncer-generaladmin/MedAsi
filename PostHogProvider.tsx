"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { PostHogProvider as Provider } from "posthog-js/react";
import posthog from "posthog-js";
import { useEffect } from "react";

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    // Oturum kaydını etkinleştir
    capture_pageview: false, // Sayfa görüntülemelerini aşağıda manuel olarak yakalayacağız
    session_recording: {},
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) posthog.capture("$pageview");
  }, [pathname, searchParams]);

  return <Provider client={posthog}>{children}</Provider>;
}

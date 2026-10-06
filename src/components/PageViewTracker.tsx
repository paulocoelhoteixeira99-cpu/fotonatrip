"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getSessionId() {
  let id = sessionStorage.getItem("fnt_sid");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("fnt_sid", id);
  }
  return id;
}

export default function PageViewTracker() {
  const pathname = usePathname();
  const lastPath = useRef("");

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    // Skip admin/dashboard pages from tracking
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) return;

    // Extract event_id from /eventos/[uuid] paths
    const eventMatch = pathname.match(/^\/eventos\/([0-9a-f-]{36})$/);
    const event_id = eventMatch ? eventMatch[1] : undefined;

    try {
      const sessionId = getSessionId();
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname,
          event_id,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
          session_id: sessionId,
        }),
      }).catch(() => {});
    } catch {
      // Silently fail
    }
  }, [pathname]);

  return null;
}

"use client";

import { useEffect } from "react";
import { API_BASE_URL } from "@/lib/api-config";

/**
 * Counts one read per browser session. Fires from the client (not the page
 * fetch) so crawlers, prefetches and cached renders do not inflate the number.
 * Fire-and-forget: a failure never affects the reader.
 */
export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `kampmax_blog_viewed:${slug}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* storage unavailable: count anyway */
    }
    void fetch(`${API_BASE_URL}/api/v1/blog/articles/slug/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      keepalive: true,
    }).catch(() => undefined);
  }, [slug]);

  return null;
}

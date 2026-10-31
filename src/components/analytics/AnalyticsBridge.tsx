"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { identifyUser, resetAnalytics, trackPageview } from "@/lib/analytics";

/**
 * Connects the app to analytics: a page view on every route change, and the
 * signed-in user's id (never their name or email) so the funnel can follow someone
 * from sign-up through to submitting. Signing out forgets the user.
 */
export function AnalyticsBridge() {
  const { user } = useAuth();
  const pathname = usePathname();
  const userId = user?.id ?? null;
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    trackPageview();
  }, [pathname]);

  useEffect(() => {
    if (userId) {
      identifyUser(userId);
    } else if (previousUserId.current) {
      resetAnalytics();
    }
    previousUserId.current = userId;
  }, [userId]);

  return null;
}

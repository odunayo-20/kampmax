"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { notificationKeys } from "@/lib/query-keys";

/**
 * Scrubs the notification cache when the signed-in user changes, so one account's
 * notifications can never show up for the next. The feed itself is live and polled.
 */
export function NotificationSyncBridge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const signedInUserRef = useRef<string | null>(userId);

  // Scrub the previous user's notification cache the moment the session
  // changes so data can never leak across accounts.
  useEffect(() => {
    const previous = signedInUserRef.current;
    signedInUserRef.current = userId;
    if (previous !== userId) {
      queryClient.removeQueries({ queryKey: notificationKeys.all });
    }
  }, [userId, queryClient]);

  return null;
}
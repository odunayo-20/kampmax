"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { subscribeToNotificationChanges } from "@/data/notifications";
import { adminKeys, notificationKeys, supportKeys } from "@/lib/query-keys";
import { syncEventNotifications } from "@/services/event-notification-sync";

/**
 * Bridges the authoritative in-memory notification store to the TanStack
 * Query cache. When notifications are pushed, read, or deleted, this invalidates
 * both customer and admin notification query trees, along with support ticket threads,
 * so bell badges, dropdowns, and message feeds update immediately in real-time.
 */
export function NotificationSyncBridge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const signedInUserRef = useRef<string | null>(userId);

  useEffect(() => {
    return subscribeToNotificationChanges(() => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: supportKeys.all });
    });
  }, [queryClient]);

  // Mirror real event notifications (tickets, reminders, organizer decisions)
  // from the backend into the store: once on sign-in, then every minute.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const pull = () => {
      syncEventNotifications(userId).catch(() => {
        // Offline or signed out: the feed simply keeps what it has.
      });
    };
    pull();
    const timer = window.setInterval(() => {
      if (!cancelled && document.visibilityState === "visible") pull();
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [userId]);

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
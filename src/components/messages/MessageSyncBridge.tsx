"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { messageKeys } from "@/lib/query-keys";

/**
 * Scrubs the messaging cache when the session user changes. Freshness comes
 * from polling in the hooks (no push channel yet).
 *
 * Renders null; mounted once at the app root.
 */
export function MessageSyncBridge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const signedInUserRef = useRef<string | null>(userId);

  // Scrub the previous user's messaging cache the moment the session
  // changes so private conversations and drafts can never leak across
  // accounts.
  useEffect(() => {
    const previous = signedInUserRef.current;
    signedInUserRef.current = userId;
    if (previous !== userId) {
      queryClient.removeQueries({ queryKey: messageKeys.all });
    }
  }, [userId, queryClient]);

  return null;
}
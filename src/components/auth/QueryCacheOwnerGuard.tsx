"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";

/**
 * Empties the query cache whenever the signed-in user changes (sign-out, or a
 * different account signing in), so one person's data is never shown to the next.
 * The saved copy follows: the cache is persisted from memory, so clearing it also
 * replaces what is saved.
 *
 * Going from "nobody yet" to a user (the session being restored) is not a change.
 */
export function QueryCacheOwnerGuard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ownerId = user?.id ?? null;
  const previousOwnerId = useRef<string | null>(null);

  useEffect(() => {
    if (previousOwnerId.current && previousOwnerId.current !== ownerId) {
      queryClient.clear();
    }
    previousOwnerId.current = ownerId;
  }, [ownerId, queryClient]);

  return null;
}

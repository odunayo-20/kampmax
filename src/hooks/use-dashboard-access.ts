"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";

/** How long dashboard access is trusted before a navigation triggers a quiet refresh. */
export const DASHBOARD_ACCESS_STALE_MS = 60_000;

/**
 * Backend-authoritative access check for a role's dashboard shell.
 *
 * One cached request shared by the layout and every page under it, so the shell
 * stays mounted while access is revalidated in the background and the skeleton
 * only shows on the very first load. A failed check isn't retried: the layout
 * falls back to the gate screen and the user can retry from there.
 *
 * `revalidateKey` is the role's key prefix. Navigating inside the dashboard
 * re-checks access, but only refetches when the cached copy is stale.
 */
export function useDashboardAccess<T>({
  queryKey,
  revalidateKey,
  queryFn,
  enabled = true,
}: {
  queryKey: QueryKey;
  revalidateKey: QueryKey;
  queryFn: () => Promise<T>;
  enabled?: boolean;
}) {
  const { status } = useAuth();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const active = enabled && status === "authenticated";

  const query = useQuery({
    queryKey,
    queryFn,
    enabled: active,
    staleTime: DASHBOARD_ACCESS_STALE_MS,
    retry: false,
  });

  useEffect(() => {
    if (!active) return;
    void queryClient.refetchQueries({ queryKey: revalidateKey, stale: true });
  }, [active, pathname, queryClient, revalidateKey]);

  return query;
}

/** A query to warm before the page that reads it mounts. */
export interface PrefetchQuery {
  queryKey: QueryKey;
  queryFn: () => Promise<unknown>;
}

/**
 * Starts a dashboard's first-screen queries as soon as the user is signed in.
 *
 * The layout holds the page back until the access check passes, so without this
 * the page's own requests would only start after that check. With it they run
 * side by side, and the page's hooks pick up the requests already in flight.
 * Pass `enabled: false` on pages that don't show these queries.
 *
 * `queries` must be a module-level function (stable identity); it receives the
 * signed-in user id so the keys match the page's own hooks.
 */
export function usePrefetchDashboardQueries({
  enabled,
  queries,
}: {
  enabled: boolean;
  queries: (userId: string | undefined) => PrefetchQuery[];
}) {
  const { status, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!enabled || status !== "authenticated") return;
    for (const { queryKey, queryFn } of queries(userId)) {
      void queryClient.prefetchQuery({ queryKey, queryFn });
    }
  }, [enabled, status, userId, queries, queryClient]);
}

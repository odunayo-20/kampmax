"use client";

import type { QueryKey } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { PersistQueryClientProviderProps } from "@tanstack/react-query-persist-client";
import { QUERY_CACHE_KEY } from "@/lib/auth-storage";
import { getCurrentAuthUser } from "@/lib/current-user-store";

/**
 * Saves the dashboards' first-screen data in the browser, so a page refresh shows
 * the last data straight away and refreshes it quietly (stale-while-revalidate).
 *
 * What is saved is deliberately narrow, because it is private data in browser
 * storage:
 *  - only the dashboard queries listed in `PERSISTED_ROOTS`;
 *  - only queries whose key contains the signed-in user's id, so the saved data is
 *    always one user's own. A new dashboard's keys must carry the user id to be saved
 *    (the vendor low-stock query is keyed by vendor id, so it is not);
 *  - nothing at all when nobody is signed in;
 *  - for `QUERY_CACHE_MAX_AGE_MS` at most;
 *  - in sessionStorage, so it disappears when the tab or browser is closed.
 * It is removed together with the auth tokens (see `clearAuthTokens`), and
 * `QueryCacheOwnerGuard` empties the cache whenever the signed-in user changes.
 */

/** Query-key roots that may be saved. Add a role's dashboard root here to opt it in. */
const PERSISTED_ROOTS: ReadonlySet<unknown> = new Set([
  "freelancer-dashboard",
  "employer-dashboard",
  "service-provider-dashboard",
  "vendor-dashboard",
  "dashboard-access",
]);

/** Saved data older than this is discarded instead of shown. */
export const QUERY_CACHE_MAX_AGE_MS = 30 * 60_000;

/** True when a query with this key and status may be saved for `userId`. */
export function isPersistableQuery(
  queryKey: QueryKey,
  status: string,
  userId: string | undefined
): boolean {
  return (
    status === "success" &&
    !!userId &&
    PERSISTED_ROOTS.has(queryKey[0]) &&
    queryKey.includes(userId)
  );
}

/** `persistOptions` for `PersistQueryClientProvider`. Saves nothing on the server. */
export function createQueryPersistOptions(): PersistQueryClientProviderProps["persistOptions"] {
  const persister = createAsyncStoragePersister({
    // sessionStorage, not localStorage: a refresh keeps the data (the point of this cache),
    // but closing the tab or browser discards it. On a shared lab or library computer a
    // student who forgets to sign out must not leave their dashboard figures behind.
    storage: typeof window === "undefined" ? undefined : window.sessionStorage,
    key: QUERY_CACHE_KEY,
  });

  return {
    persister,
    maxAge: QUERY_CACHE_MAX_AGE_MS,
    dehydrateOptions: {
      // Read when each snapshot is taken, so the user is the one signed in right now.
      shouldDehydrateQuery: (query) =>
        isPersistableQuery(query.queryKey, query.state.status, getCurrentAuthUser()?.id),
    },
  };
}

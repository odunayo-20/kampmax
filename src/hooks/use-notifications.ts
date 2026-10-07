"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  InfiniteData,
  QueryKey,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { NotificationListFilters, notificationKeys } from "@/lib/query-keys";
import type { NotificationCategorySummary } from "@/services/notifications";
import {
  deleteNotificationLive,
  fetchNotificationFeed,
  markAllNotificationsReadLive,
  markNotificationReadLive,
  summarizeFeed,
} from "@/services/notification-feed";
import { Notification } from "@/types";

/** The bell and the notification centre poll so new notifications appear without a reload. */
const POLL_MS = 30_000;
const FEED_STALE_MS = 10_000;

/** One shared fetch of the user's real feed; the list, badge and tabs all read from it. */
function loadFeed(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  return queryClient.fetchQuery({
    queryKey: ["notifications", "feed", userId],
    queryFn: () => fetchNotificationFeed(userId),
    staleTime: FEED_STALE_MS,
  });
}

export interface NotificationPagePayload {
  items: Notification[];
  nextCursor: number | null;
  hasMore: boolean;
}

export const NOTIFICATION_PAGE_SIZE = 20;

// ────────────────────────────────────────────────────────────────
// Reads
// ────────────────────────────────────────────────────────────────

/**
 * Curated, multi-page notification feed. `enabled` only turns the query on
 * once a session is authenticated, so nothing is fetched while signed out.
 */
export function useNotifications(
  filters: NotificationListFilters = { category: "all" },
  options?: { pageSize?: number }
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const enabled = Boolean(userId);
  const pageSize = options?.pageSize ?? NOTIFICATION_PAGE_SIZE;

  return useInfiniteQuery({
    queryKey: notificationKeys.list(userId || "guest", filters),
    enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<NotificationPagePayload> => {
      if (!userId) {
        return { items: [], nextCursor: null, hasMore: false };
      }
      const all = (await loadFeed(queryClient, userId)).items;
      const visible =
        filters.category === "all"
          ? all
          : all.filter((n) => n.category === filters.category);
      const items = visible.slice(pageParam, pageParam + pageSize);
      const nextCursor =
        pageParam + pageSize < visible.length ? pageParam + pageSize : null;
      return { items, nextCursor, hasMore: nextCursor !== null };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      flattened: data.pages.flatMap((page) => page.items),
    }),
  });
}

/**
 * Header/badge counter. Kept as a separate key so buffing the badge never
 * refetches the full feed.
 */
export function useUnreadNotificationCount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const enabled = Boolean(userId);

  return useQuery({
    queryKey: notificationKeys.unreadCount(userId || "guest"),
    enabled,
    initialData: 0,
    refetchInterval: POLL_MS,
    queryFn: async () => {
      if (!userId) return 0;
      return (await loadFeed(queryClient, userId)).unreadCount;
    },
  });
}

/**
 * Category tabs (counts + unread per category) for the notification center.
 */
export function useNotificationCategorySummaries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const enabled = Boolean(userId);

  return useQuery({
    queryKey: notificationKeys.categorySummaries(userId || "guest"),
    enabled,
    initialData: [],
    queryFn: async () => {
      if (!userId) return [];
      return summarizeFeed(await loadFeed(queryClient, userId));
    },
  });
}

// ────────────────────────────────────────────────────────────────
// Cache helpers
// ────────────────────────────────────────────────────────────────

type InfiniteListData = InfiniteData<NotificationPagePayload, number>;

function listQueryKey(userId: string): QueryKey {
  return ["notifications", "list", userId];
}

function updateListCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  updater: (item: Notification) => Notification | null
): void {
  queryClient.setQueriesData<InfiniteListData>(
    { queryKey: listQueryKey(userId) },
    (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items
            .map(updater)
            .filter((item): item is Notification => item !== null),
        })),
      };
    }
  );
}

function findInListCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  notificationId: string
): Notification | null {
  const queries = queryClient.getQueriesData<InfiniteListData>({
    queryKey: listQueryKey(userId),
  });
  for (const [, data] of queries) {
    if (!data) continue;
    for (const page of data.pages) {
      const found = page.items.find((n) => n.id === notificationId);
      if (found) return found;
    }
  }
  return null;
}

function updateUnreadCount(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  delta: number
): void {
  if (delta === 0) return;
  queryClient.setQueryData<number>(
    notificationKeys.unreadCount(userId),
    (current) => (current === undefined ? current : Math.max(0, current + delta))
  );
}

function setUnreadCount(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  value: number
): void {
  queryClient.setQueryData<number>(notificationKeys.unreadCount(userId), () => value);
}

function updateCategorySummaries(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  updater: (summaries: NotificationCategorySummary[]) => NotificationCategorySummary[]
): void {
  queryClient.setQueryData<NotificationCategorySummary[]>(
    notificationKeys.categorySummaries(userId),
    (current) => (current ? updater(current) : current)
  );
}

function adjustSummaryCounts(
  summaries: NotificationCategorySummary[],
  category: Notification["category"],
  deltaCount: number,
  deltaUnread: number
): NotificationCategorySummary[] {
  return summaries.map((s) =>
    s.id === "all" || s.id === category
      ? {
          ...s,
          count: Math.max(0, s.count + deltaCount),
          unread: Math.max(0, s.unread + deltaUnread),
        }
      : s
  );
}

function snapshotNotificationCache(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string
): Array<[QueryKey, unknown]> {
  return queryClient.getQueriesData<unknown>({
    queryKey: listQueryKey(userId),
  });
}

function restoreNotificationCache(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot: Array<[QueryKey, unknown]>
): void {
  snapshot.forEach(([key, data]) => {
    queryClient.setQueryData(key, data);
  });
}

function invalidateNotificationQueries(
  queryClient: ReturnType<typeof useQueryClient>
): void {
  queryClient.removeQueries({ queryKey: ["notifications", "feed"] });
  queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

// ────────────────────────────────────────────────────────────────
// Mutations
// ────────────────────────────────────────────────────────────────

/**
 * Marks a single notification as read. Optimistically updates the list,
 * unread counter and category summaries; reconciles with the authoritative
 * store on settle. The store remains the source of truth for read state.
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await markNotificationReadLive(notificationId);
      return notificationId;
    },
    onMutate: async (notificationId: string) => {
      if (!userId) return undefined;
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const snapshot = snapshotNotificationCache(queryClient, userId);

      const target = findInListCaches(queryClient, userId, notificationId);
      if (target && !target.read) {
        updateUnreadCount(queryClient, userId, -1);
        updateCategorySummaries(queryClient, userId, (summaries) =>
          adjustSummaryCounts(summaries, target.category, 0, -1)
        );
      }
      updateListCaches(queryClient, userId, (item) =>
        item.id === notificationId ? { ...item, read: true } : item
      );
      return snapshot;
    },
    onError: (_error, _notificationId, snapshot) => {
      if (snapshot && userId) restoreNotificationCache(queryClient, snapshot);
    },
    onSettled: () => {
      invalidateNotificationQueries(queryClient);
    },
  });
}

/**
 * Marks all notifications as read. Optimistically zeroes the unread
 * counters and flips every entry in the feed; reconciles on settle.
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useMutation({
    mutationFn: markAllNotificationsReadLive,
    onMutate: async () => {
      if (!userId) return undefined;
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const snapshot = snapshotNotificationCache(queryClient, userId);

      setUnreadCount(queryClient, userId, 0);
      updateCategorySummaries(queryClient, userId, (summaries) =>
        summaries.map((s) => ({ ...s, unread: 0 }))
      );
      updateListCaches(queryClient, userId, (item) => ({ ...item, read: true }));
      return snapshot;
    },
    onError: (_error, _vars, snapshot) => {
      if (snapshot && userId) restoreNotificationCache(queryClient, snapshot);
    },
    onSettled: () => {
      invalidateNotificationQueries(queryClient);
    },
  });
}

/**
 * Deletes a notification. Optimistically removes it from the feed and
 * adjusts counters; reconciles with the authoritative store on settle.
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useMutation({
    mutationFn: deleteNotificationLive,
    onMutate: async (notificationId: string) => {
      if (!userId) return undefined;
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const snapshot = snapshotNotificationCache(queryClient, userId);

      const target = findInListCaches(queryClient, userId, notificationId);
      if (target) {
        const unreadDelta = target.read ? 0 : -1;
        updateUnreadCount(queryClient, userId, unreadDelta);
        updateCategorySummaries(queryClient, userId, (summaries) =>
          adjustSummaryCounts(summaries, target.category, -1, unreadDelta)
        );
        updateListCaches(queryClient, userId, (item) =>
          item.id === notificationId ? null : item
        );
      }
      return snapshot;
    },
    onError: (_error, _notificationId, snapshot) => {
      if (snapshot && userId) restoreNotificationCache(queryClient, snapshot);
    },
    onSettled: () => {
      invalidateNotificationQueries(queryClient);
    },
  });
}
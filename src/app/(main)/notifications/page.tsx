"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { CategoryFilter } from "@/components/notifications/CategoryFilter";
import { EmptyNotifications } from "@/components/notifications/EmptyNotifications";
import { NotificationErrorState } from "@/components/notifications/NotificationErrorState";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { NotificationSkeleton } from "@/components/notifications/NotificationSkeleton";
import { getNotificationCategoryMeta } from "@/components/notifications/notification-meta";
import {
  useDeleteNotification,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotificationCategorySummaries,
  useNotifications,
  useUnreadNotificationCount,
} from "@/hooks/use-notifications";
import { notificationErrorMessage, getSafeNotificationTarget } from "@/lib/notification-utils";
import { markAllLabel, NOTIFICATION_ACTION_ERROR } from "@/lib/notification-rules";
import { Notification, NotificationCategory } from "@/types";
import { CheckCheck } from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<
    NotificationCategory | "all"
  >("all");
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

  const listFilters = useMemo(
    () => ({ category: selectedCategory }),
    [selectedCategory]
  );

  const notificationsQuery = useNotifications(listFilters);
  const summariesQuery = useNotificationCategorySummaries();
  const unreadQuery = useUnreadNotificationCount();

  const markRead = useMarkNotificationAsRead();
  const markAll = useMarkAllNotificationsAsRead();
  const deleteItem = useDeleteNotification();

  const visible = notificationsQuery.data?.flattened ?? [];
  const unreadCount = unreadQuery.data ?? 0;

  const grouped = useMemo(() => {
    const groups = new Map<NotificationCategory, Notification[]>();
    for (const n of visible) {
      const list = groups.get(n.category) ?? [];
      list.push(n);
      groups.set(n.category, list);
    }
    return Array.from(groups.entries()).map(([category, items]) => ({
      category,
      items,
      label: getNotificationCategoryMeta(category).label,
    }));
  }, [visible]);

  function handleNavigate(url: string) {
    const target = getSafeNotificationTarget(url);
    if (target) router.push(target);
  }

  return (
    <PageContainer className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-kampmax-text">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-kampmax-text-secondary">
              {unreadCount} unread
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {visible.length > 0 && (
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "grouped" ? "flat" : "grouped")}
              className="rounded-lg px-2 py-2 text-xs font-semibold text-kampmax-blue hover:bg-kampmax-muted transition-colors"
            >
              {viewMode === "grouped" ? "Newest first" : "Group by type"}
            </button>
          )}

          {unreadCount > 0 && (
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-kampmax-blue bg-kampmax-blue/10 hover:bg-kampmax-blue/15 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {markAll.isPending ? "Marking…" : markAllLabel(unreadCount)}
            </button>
          )}
        </div>
      </div>

      {(markRead.isError || markAll.isError || deleteItem.isError) && (
        <p role="alert" className="text-sm text-error-600">
          {NOTIFICATION_ACTION_ERROR}
        </p>
      )}

      {/* Category Filter */}
      <CategoryFilter
        categories={summariesQuery.data ?? []}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/* Content */}
      {notificationsQuery.isPending ? (
        <div className="bg-white rounded-xl border border-kampmax-border overflow-hidden">
          <NotificationSkeleton count={6} />
        </div>
      ) : notificationsQuery.isError ? (
        <div className="bg-white rounded-xl border border-kampmax-border">
          <NotificationErrorState
            error={notificationsQuery.error}
            message={notificationErrorMessage(notificationsQuery.error)}
            onRetry={() => notificationsQuery.refetch()}
          />
        </div>
      ) : visible.length === 0 ? (
        <EmptyNotifications filtered={selectedCategory !== "all"} />
      ) : viewMode === "grouped" ? (
        /* Grouped View */
        <div className="space-y-3">
          {grouped.map((group) => {
            const groupUnread = group.items.filter((n) => !n.read).length;
            return (
              <div
                key={group.category}
                className="bg-white rounded-xl border border-kampmax-border overflow-hidden"
              >
                {/* Group Header */}
                <div className="px-4 py-3 border-b border-kampmax-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-kampmax-text">
                      {group.label}
                    </h3>
                    <span className="text-[10px] text-kampmax-text-secondary px-1.5 py-0.5 rounded-full bg-kampmax-muted">
                      {group.items.length}
                    </span>
                  </div>
                  {groupUnread > 0 && (
                    <span className="text-[10px] font-semibold text-kampmax-blue">
                      {groupUnread} unread
                    </span>
                  )}
                </div>

                {/* Notifications */}
                <div className="divide-y divide-kampmax-border">
                  {group.items.map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notification={notif}
                      onMarkAsRead={(id) => markRead.mutate(id)}
                      onDelete={(id) => deleteItem.mutate(id)}
                      onNavigate={handleNavigate}
                      showIcon={false}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat View */
        <div className="bg-white rounded-xl border border-kampmax-border overflow-hidden divide-y divide-kampmax-border">
          {visible.map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onMarkAsRead={(id) => markRead.mutate(id)}
              onDelete={(id) => deleteItem.mutate(id)}
              onNavigate={handleNavigate}
              showIcon={false}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {visible.length > 0 && notificationsQuery.hasNextPage && (
        <div className="flex justify-center pt-1">
          <button
            onClick={() => notificationsQuery.fetchNextPage()}
            disabled={notificationsQuery.isFetchingNextPage}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-kampmax-blue bg-white border border-kampmax-border hover:bg-kampmax-muted transition-colors disabled:opacity-50"
          >
            {notificationsQuery.isFetchingNextPage
              ? "Loading…"
              : "Load more"}
          </button>
        </div>
      )}
    </PageContainer>
  );
}
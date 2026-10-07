"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Check, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useUnreadNotificationCount,
} from "@/hooks/use-notifications";
import type { Notification, NotificationCategory } from "@/types";

const CATEGORY_DOT: Partial<Record<NotificationCategory, string>> = {
  orders: "bg-success-500",
  payments: "bg-kampmax-blue",
  marketplace: "bg-primary-600",
  account: "bg-warning-600",
};

// The same real feed as the main bell: what the store sees here is what the
// notifications page shows.
export function VendorNotifications({ seeAllHref = "/vendor/notifications" }: { seeAllHref?: string } = {}) {
  const [open, setOpen] = useState(false);
  const list = useNotifications({ category: "all" }, { pageSize: 8 });
  const unreadQuery = useUnreadNotificationCount();
  const markRead = useMarkNotificationAsRead();
  const markAll = useMarkAllNotificationsAsRead();

  const items = list.data?.pages[0]?.items ?? [];
  const unread = unreadQuery.data ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-error-600" />
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-kampmax-border bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-kampmax-border px-4 py-3">
              <p className="text-sm font-bold text-kampmax-text">Notifications</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {list.isPending ? (
                <p className="px-4 py-8 text-center text-sm text-kampmax-text-secondary">Loading…</p>
              ) : list.isError ? (
                <p role="alert" className="px-4 py-8 text-center text-sm text-kampmax-text-secondary">
                  Couldn&apos;t load notifications.{" "}
                  <button type="button" onClick={() => void list.refetch()} className="font-medium text-primary-600 hover:underline">
                    Try again
                  </button>
                </p>
              ) : items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <BellRing className="mx-auto mb-2 h-6 w-6 text-neutral-300" aria-hidden />
                  <p className="text-sm text-kampmax-text-secondary">You&apos;re all caught up.</p>
                </div>
              ) : (
                items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    onConsume={() => {
                      if (!n.read) markRead.mutate(n.id);
                    }}
                  />
                ))
              )}
            </div>
            <Link
              href={seeAllHref}
              onClick={() => setOpen(false)}
              className="block border-t border-kampmax-border px-4 py-2.5 text-center text-xs font-semibold text-primary-600 hover:bg-neutral-50"
            >
              See all
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationRow({ n, onConsume }: { n: Notification; onConsume: () => void }) {
  const content = (
    <>
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", CATEGORY_DOT[n.category] ?? "bg-neutral-400")} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={cn("truncate text-sm font-medium text-kampmax-text", !n.read && "font-bold")}>
            {n.title}
          </span>
          {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" aria-label="Unread" />}
        </span>
        <span className="block text-xs text-kampmax-text-secondary">{n.message}</span>
        <span className="block text-[10px] text-kampmax-text-muted">{formatRelative(n.createdAt)}</span>
      </span>
    </>
  );

  const cls = cn(
    "flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-neutral-50",
    n.read ? "bg-white" : "bg-primary-50/50"
  );

  if (n.actionUrl) {
    return (
      <Link href={n.actionUrl} onClick={onConsume} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onConsume} className={cls}>
      {content}
    </button>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

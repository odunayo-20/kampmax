"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import { useNotificationSummary } from "@/hooks/use-notifications";

/**
 * Freelancer dashboard notification bell: a summary of the same real feed as the
 * notifications page.
 */
export function FreelancerNotifications() {
  const [open, setOpen] = useState(false);
  const summary = useNotificationSummary();

  const unread = summary.unreadCount;

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
                <span className="rounded-full bg-error-50 px-2 py-0.5 text-[10px] font-semibold text-error-700">
                  {unread} unread
                </span>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {summary.sample.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <BellRing className="mx-auto mb-2 h-6 w-6 text-neutral-300" aria-hidden />
                  <p className="text-sm text-kampmax-text-secondary">You're all caught up.</p>
                </div>
              ) : (
                summary.sample.map((n) => (
                  <div key={n.id} className="flex items-start gap-2.5 px-4 py-3 hover:bg-neutral-50">
                    <span
                      className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", "bg-primary-600")}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-kampmax-text">
                        {n.title}
                      </span>
                      <span className="block text-xs text-kampmax-text-secondary">{n.body}</span>
                      <span className="block text-[10px] text-kampmax-text-muted">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-kampmax-border p-2">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-center text-xs font-medium text-primary-600 hover:bg-neutral-50"
              >
                See all notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

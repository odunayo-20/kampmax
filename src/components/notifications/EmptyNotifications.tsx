"use client";

import { emptyNotificationsCopy } from "@/lib/notification-rules";

export function EmptyNotifications({ filtered }: { filtered?: boolean }) {
  const copy = emptyNotificationsCopy(!!filtered);
  return (
    <div className="px-8 py-16 text-center">
      <p className="mb-1 text-sm font-semibold text-kampmax-text">{copy.title}</p>
      <p className="mx-auto max-w-[260px] text-xs text-kampmax-text-secondary">{copy.text}</p>
    </div>
  );
}

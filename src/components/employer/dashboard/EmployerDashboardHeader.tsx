"use client";

import Link from "next/link";
import { Building2, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useUnreadMessageCount } from "@/hooks/use-messages";

export function EmployerDashboardHeader({
  displayName,
  descriptor,
  location,
  verified,
}: {
  displayName?: string;
  descriptor?: string;
  location?: string;
  verified?: boolean;
}) {
  const unreadQuery = useUnreadMessageCount();
  const unreadMessages = unreadQuery.data ?? 0;

  const context = [descriptor, location].filter(Boolean).join(" • ");

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-kampmax-text">
          {displayName || "Your hiring"}
        </h1>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-kampmax-text-secondary">
          {context}
          {verified && (
            <Badge variant="success" className="text-[10px]">
              Verified
            </Badge>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell variant="link" />
        <Link
          href="/chat"
          aria-label={`Messages${unreadMessages > 0 ? `, ${unreadMessages} unread` : ""}`}
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
        >
          <MessageSquare className="h-[19px] w-[19px]" aria-hidden />
          {!unreadQuery.isPending && !unreadQuery.isError && unreadMessages > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-kampmax-gold px-1 text-[10px] font-bold text-kampmax-navy ring-1 ring-white">
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          )}
        </Link>
        <Link
          href="/employer/profile"
          className="inline-flex items-center gap-1.5 rounded-lg border border-kampmax-border bg-white px-3 py-1.5 text-xs font-semibold text-kampmax-text hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
        >
          <Building2 className="h-3.5 w-3.5" aria-hidden />
          Employer profile
        </Link>
      </div>
    </div>
  );
}
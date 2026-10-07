"use client";

import Link from "next/link";
import { Bell, ArrowLeft } from "lucide-react";
import { useNotificationSummary } from "@/hooks/use-notifications";

export default function FreelancerSettingsPage() {
  const notif = useNotificationSummary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-kampmax-text">Freelancer settings</h1>
        <p className="mt-0.5 text-sm text-kampmax-text-secondary">
          Manage preferences for your freelancer profile.
        </p>
      </div>

      <div className="rounded-xl border border-kampmax-border bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            <Bell className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <h2 className="text-sm font-bold text-kampmax-text">Notifications</h2>
            <p className="mt-1 text-xs text-kampmax-text-secondary">
              You currently have {notif.unreadCount} unread notification
              {notif.unreadCount === 1 ? "" : "s"}. See them all on the
              notifications page.
            </p>
          </div>
        </div>
      </div>

      <Link
        href="/freelancer/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to dashboard
      </Link>
    </div>
  );
}

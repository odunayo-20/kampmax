"use client";

import Link from "next/link";
import { CalendarClock, User } from "lucide-react";
import { NotificationSettingsPanel } from "@/components/settings/NotificationSettingsPanel";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-kampmax-text">Settings</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">Notifications and where to manage your account and bookings.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-kampmax-border bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-kampmax-text">
            <User className="h-4 w-4 text-primary-600" aria-hidden /> Your account
          </h2>
          <p className="mt-2 text-sm text-kampmax-text-secondary">Email, password and sign-in live in your Kampmax account.</p>
          <Link href="/profile" className="mt-2 inline-block text-xs font-medium text-primary-600 hover:underline">
            Manage account
          </Link>
        </div>
        <div className="rounded-xl border border-kampmax-border bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-kampmax-text">
            <CalendarClock className="h-4 w-4 text-primary-600" aria-hidden /> Bookings
          </h2>
          <p className="mt-2 text-sm text-kampmax-text-secondary">
            Your weekly hours, notice period and whether you approve requests are set with your availability.
          </p>
          <Link href="/service-provider/availability" className="mt-2 inline-block text-xs font-medium text-primary-600 hover:underline">
            Open availability
          </Link>
        </div>
      </div>

      <NotificationSettingsPanel />
    </div>
  );
}

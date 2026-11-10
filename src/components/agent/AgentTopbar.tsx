"use client";

import Link from "next/link";
import { Menu, MapPin, Plus, ExternalLink, Home } from "lucide-react";
import { ProfileSwitcher } from "@/components/vendor-dashboard/ProfileSwitcher";

export function AgentTopbar({
  onOpenMobile,
  location,
  agentName,
}: {
  onOpenMobile: () => void;
  location?: string;
  agentName?: string;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-kampmax-border bg-white px-4 lg:px-8">
      {/* Left: Mobile Drawer Trigger & Workspace Indicator */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-kampmax-text-secondary hover:bg-neutral-100 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-bold text-kampmax-text">
            {agentName || "Agent Workspace"}
          </span>
          {location && (
            <span className="hidden items-center gap-1 rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-kampmax-text-secondary sm:inline-flex">
              <MapPin className="h-3 w-3 text-kampmax-blue" aria-hidden />
              {location}
            </span>
          )}
        </div>
      </div>

      {/* Right: Quick Actions & Shared ProfileSwitcher */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/agent/properties"
          className="inline-flex items-center gap-1.5 rounded-lg bg-kampmax-blue px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-opacity hover:opacity-95"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">New Property</span>
        </Link>

        <Link
          href="/accommodation"
          className="inline-flex items-center gap-1.5 rounded-lg border border-kampmax-border px-3 py-1.5 text-xs font-medium text-kampmax-text hover:bg-neutral-50"
        >
          <Home className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">View Accommodation</span>
          <ExternalLink className="hidden h-3.5 w-3.5 sm:inline" aria-hidden />
        </Link>

        {/* Shared Cross-Vertical Profile Switcher */}
        <ProfileSwitcher />
      </div>
    </header>
  );
}

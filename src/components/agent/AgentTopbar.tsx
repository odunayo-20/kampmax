"use client";

import Link from "next/link";
import { Menu, MapPin, Plus, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/ui";

export function AgentTopbar({
  onOpenMobile,
  location,
}: {
  onOpenMobile: () => void;
  location?: string;
}) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-kampmax-border bg-white px-4 sm:px-6 lg:px-8">
      {/* Left: Mobile Drawer Trigger & Workspace Indicator */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-kampmax-text-secondary hover:bg-neutral-100 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden text-sm font-semibold text-kampmax-text sm:inline">
            Agent Workspace
          </span>
          {location && (
            <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-kampmax-text-secondary">
              <MapPin className="h-3 w-3 text-kampmax-blue" aria-hidden />
              {location}
            </span>
          )}
        </div>
      </div>

      {/* Right: Quick Actions & Profile */}
      <div className="flex items-center gap-3">
        <Link
          href="/agent/properties"
          className="inline-flex items-center gap-1.5 rounded-xl bg-kampmax-blue px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-opacity hover:opacity-95"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          <span>New Property</span>
        </Link>

        <Link
          href="/accommodation"
          target="_blank"
          className="hidden items-center gap-1 text-xs font-medium text-kampmax-text-secondary hover:text-kampmax-blue sm:inline-flex"
        >
          <span>Marketplace</span>
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>

        <div className="h-4 w-px bg-kampmax-border" aria-hidden />

        <div className="flex items-center gap-2">
          <Avatar
            name={user?.name || "Agent"}
            src={user?.avatar}
            size="sm"
          />
        </div>
      </div>
    </header>
  );
}


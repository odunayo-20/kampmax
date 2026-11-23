"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, Plus } from "lucide-react";
import { HorizontalScroll } from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
import { PROFILE_DEFINITIONS, PROFILE_THEMES, useMyProfiles } from "@/hooks/use-my-profiles";
import { cn } from "@/lib/utils";
import { Skeleton } from "./Skeleton";

/**
 * For signed-in users: Method A horizontal profiles snap reel for the home page.
 * Displays shortcuts to held profiles with active status and direct dashboard links,
 * and a unified "Earn or hire" card for profiles not yet started.
 */
export function YourProfilesStrip() {
  const { status } = useAuth();
  const { data: states, isPending, isError } = useMyProfiles();

  // The query only runs for a signed-in user, and stays "pending" for anyone else, so
  // check who is here first or a guest would see a loading placeholder forever.
  if (status !== "authenticated" || isError) return null;

  if (isPending) {
    return (
      <div role="status" aria-label="Loading your profiles" className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {PROFILE_DEFINITIONS.slice(0, 4).map((p) => (
            <Skeleton key={p.id} className="h-[104px] w-[260px] sm:w-[280px] shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // A profile we couldn't check is left out rather than guessed at.
  const checked = PROFILE_DEFINITIONS.map((definition) => ({
    definition,
    state: states?.[definition.id],
  })).filter(({ state }) => state && state.status !== "error");
  const held = checked.filter(({ state }) => state?.status === "active");
  const notHeld = checked.filter(({ state }) => state?.status !== "active");
  if (checked.length === 0) return null;

  const headerTitle = held.length > 0 ? "Your profiles" : "Earn on Kampmax";
  const headerSubtitle =
    held.length > 0
      ? "Switch between the ways you use Kampmax"
      : "Sell, freelance, hire or offer services from one account";

  return (
    <section aria-label="Your profiles" className="space-y-3">
      {/* 1. Reel Header with Active Count badge and Manage link */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-kampmax-text truncate">{headerTitle}</h2>
            {held.length > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {held.length} Active
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-kampmax-text-secondary">{headerSubtitle}</p>
        </div>

        <Link
          href="/account/profiles"
          className="-my-2 flex min-h-11 shrink-0 items-center gap-0.5 pl-2 text-xs font-semibold text-primary-600 transition-colors hover:text-primary-700"
        >
          <span>Manage all</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {/* 2. Method A: Horizontal Reel */}
      <HorizontalScroll showArrows className="-mx-1 px-1">
        <ul role="list" className="flex gap-3 py-1">
          {held.map(({ definition, state }) => {
            const Icon = definition.icon;
            const theme = PROFILE_THEMES[definition.id];
            const sub = (state as { sub?: string }).sub ?? "Open dashboard";

            return (
              <li key={definition.id} className="w-[260px] sm:w-[280px] shrink-0">
                <Link
                  href={definition.activeHref}
                  className={cn(
                    "group flex flex-col justify-between h-[104px] w-full rounded-2xl border border-neutral-200/90 bg-white p-3.5 shadow-xs transition-all",
                    "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
                    theme.borderActive
                  )}
                >
                  {/* Top row: Vertical Icon and Dashboard shortcut pill with active dot */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        theme.iconBg,
                        theme.iconColor
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700 transition-colors group-hover:bg-primary-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Dashboard
                      <ArrowRight className="h-3 w-3 text-primary-600" aria-hidden />
                    </span>
                  </div>

                  {/* Bottom content: Role title and live subtitle */}
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-bold text-neutral-900">
                      {definition.label}
                    </span>
                    <span className="block truncate text-xs text-neutral-500">{sub}</span>
                  </div>
                </Link>
              </li>
            );
          })}

          {notHeld.length > 0 && (
            <li className="w-[260px] sm:w-[280px] shrink-0">
              <Link
                href="/account/earn"
                className="group flex flex-col justify-between h-[104px] w-full rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 p-3.5 transition-all hover:border-primary-300 hover:bg-primary-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 transition-colors group-hover:bg-primary-100 group-hover:text-primary-600">
                    <Plus className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-700 transition-colors group-hover:bg-primary-100 group-hover:text-primary-700">
                    <span>Start</span>
                    <ChevronRight className="h-3 w-3" aria-hidden />
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="block truncate text-sm font-bold text-neutral-800">Earn or hire</span>
                  <span className="block truncate text-xs text-neutral-500">
                    Sell, freelance, offer services
                  </span>
                </div>
              </Link>
            </li>
          )}
        </ul>
      </HorizontalScroll>
    </section>
  );
}

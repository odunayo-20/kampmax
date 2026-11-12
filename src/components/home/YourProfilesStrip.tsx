"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { SectionHeader } from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
import { PROFILE_DEFINITIONS, useMyProfiles } from "@/hooks/use-my-profiles";
import { Skeleton } from "./Skeleton";

/**
 * For signed-in users: a shortcut to each profile they hold (open its dashboard) and a
 * way to start the ones they don't. Held profiles come first. Nothing is shown to guests,
 * or if the profile check can't be completed.
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
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PROFILE_DEFINITIONS.map((p) => (
            <Skeleton key={p.id} className="h-[68px] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // A profile we couldn't check is left out rather than guessed at.
  const checked = PROFILE_DEFINITIONS.map((definition) => ({ definition, state: states?.[definition.id] })).filter(
    ({ state }) => state && state.status !== "error"
  );
  const held = checked.filter(({ state }) => state?.status === "active");
  const notHeld = checked.filter(({ state }) => state?.status !== "active");
  if (checked.length === 0) return null;

  // Held profiles get their own shortcut. Everything not yet set up collapses into ONE
  // "Earn or hire" entry, so a new user sees one door instead of five.
  return (
    <section aria-label="Your profiles" className="space-y-3">
      <SectionHeader
        title={held.length > 0 ? "Your profiles" : "Earn on Kampmax"}
        subtitle={
          held.length > 0
            ? "Switch between the ways you use Kampmax"
            : "Sell, freelance, hire or offer services from one account"
        }
        action={{ label: "Manage", href: "/account/profiles" }}
        className="mb-0"
      />
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {held.map(({ definition, state }) => {
          const Icon = definition.icon;
          return (
            <li key={definition.id}>
              <Link
                href={definition.activeHref}
                className="group flex h-full items-center gap-3 rounded-2xl border border-neutral-200/90 bg-white p-3 shadow-xs transition-all hover:border-primary-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-neutral-900">{definition.label}</span>
                  <span className="block truncate text-[11px] text-neutral-500">
                    {(state as { sub?: string }).sub ?? "Open dashboard"}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-primary-600" aria-hidden />
              </Link>
            </li>
          );
        })}
        {notHeld.length > 0 && (
          <li>
            <Link
              href="/account/earn"
              className="group flex h-full items-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-transparent p-3 transition-all hover:border-primary-300 hover:bg-primary-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
                <Plus className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-neutral-600">Earn or hire</span>
                <span className="block truncate text-[11px] text-neutral-500">Sell, freelance, offer services</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-primary-600" aria-hidden />
            </Link>
          </li>
        )}
      </ul>
    </section>
  );
}

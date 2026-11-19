"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw, Sparkles, AlertCircle } from "lucide-react";
import { PROFILE_DEFINITIONS, PROFILE_THEMES, useMyProfiles } from "@/hooks/use-my-profiles";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/home/Skeleton";

/**
 * Dedicated profiles screen for Kampmax Web.
 * Groups profiles into active roles (direct dashboard links with live store/role names),
 * unverified/network-errored roles (with instant retry), and available roles to start.
 */
export default function AccountProfilesPage() {
  const { status } = useAuth();
  const { data: states, isPending, isFetching, refetch } = useMyProfiles();

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 text-center space-y-4">
        <h1 className="text-2xl font-bold text-neutral-900">Sign in to view your profiles</h1>
        <p className="text-sm text-neutral-500 max-w-md mx-auto">
          Switch between your campus store, freelance work, services, and employer portals from one account.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-6" role="status" aria-label="Loading profiles">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="space-y-3 pt-2">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const activeList = PROFILE_DEFINITIONS.filter((p) => states?.[p.id]?.status === "active");
  const uncheckedList = PROFILE_DEFINITIONS.filter((p) => states?.[p.id]?.status === "error");
  const availableList = PROFILE_DEFINITIONS.filter((p) => states?.[p.id]?.status === "none");
  const activeCount = activeList.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-6">
      {/* 1. Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-kampmax-text tracking-tight">My Kampmax Profiles</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          One account, several ways to use Kampmax. Open a profile you already have, or set up a new one.
        </p>
      </div>

      {/* 2. Overview Summary Banner */}
      <div className="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50/80 via-white to-primary-50/30 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-neutral-900">
              {activeCount === 1
                ? "1 active profile"
                : activeCount > 1
                ? `${activeCount} active profiles`
                : "Start earning on Kampmax"}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-xl">
              One account, several ways to use Kampmax. A profile you set up on the website or mobile app syncs automatically.
            </p>
          </div>
          {activeCount > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1.5 self-start sm:self-auto rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {activeCount} Active
            </span>
          )}
        </div>
      </div>

      {/* 3. Section: Active Profiles */}
      {activeList.length > 0 && (
        <section aria-label="Active profiles" className="space-y-3">
          <div className="flex items-center gap-2 pt-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Your Active Profiles
            </h2>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              {activeCount}
            </span>
          </div>

          <ul className="space-y-3">
            {activeList.map((p) => {
              const Icon = p.icon;
              const theme = PROFILE_THEMES[p.id];
              const state = states?.[p.id];
              const sub = state?.status === "active" && state.sub ? state.sub : "Open your dashboard";

              return (
                <li key={p.id}>
                  <div
                    className={cn(
                      "group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-neutral-200/90 bg-white p-4 shadow-xs transition-all",
                      "hover:shadow-sm",
                      theme.borderActive
                    )}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                          theme.iconBg,
                          theme.iconColor
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-neutral-900">{p.label}</h3>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        </div>
                        <p className="truncate text-xs text-neutral-500 mt-0.5">{sub}</p>
                      </div>
                    </div>

                    <Link
                      href={p.activeHref}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary-50 px-3.5 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100"
                    >
                      Open dashboard
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 4. Section: Unchecked / Error State */}
      {uncheckedList.length > 0 && (
        <section aria-label="Profiles that could not be checked" className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Couldn&apos;t Check
          </h2>

          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Couldn&apos;t reach the server for {uncheckedList.length === 1 ? "this profile" : "these profiles"}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    We couldn&apos;t check {uncheckedList.map((p) => p.label).join(", ")}. You may already have{" "}
                    {uncheckedList.length === 1 ? "it" : "them"}, so try checking again before setting up a new one.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="inline-flex shrink-0 items-center gap-1.5 self-start sm:self-auto rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100/50 disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                {isFetching ? "Checking…" : "Check again"}
              </button>
            </div>
          </div>

          <ul className="space-y-2">
            {uncheckedList.map((p) => {
              const Icon = p.icon;
              const theme = PROFILE_THEMES[p.id];
              return (
                <li key={p.id}>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 opacity-80">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          theme.iconBg,
                          theme.iconColor
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-semibold text-neutral-800">{p.label}</span>
                        <span className="block text-xs text-amber-700">Check failed — click retry above</span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 5. Section: Available Profiles to Start */}
      {availableList.length > 0 && (
        <section aria-label="Available profiles" className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 pt-1">
            {activeCount > 0 ? "Start Something New" : "Available Profiles to Start"}
          </h2>

          <ul className="space-y-3">
            {availableList.map((p) => {
              const Icon = p.icon;
              const theme = PROFILE_THEMES[p.id];

              return (
                <li key={p.id}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-neutral-200/90 bg-white p-4 shadow-xs transition-all hover:border-neutral-300 hover:shadow-sm">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                          theme.iconBg,
                          theme.iconColor
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-neutral-900">{p.label}</h3>
                        <p className="truncate text-xs text-neutral-500 mt-0.5">{theme.valueProp}</p>
                      </div>
                    </div>

                    <Link
                      href={p.onboardHref}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 hover:border-neutral-400"
                    >
                      {p.onboardLabel}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 6. Wallet Tip Banner */}
      <div className="flex items-center gap-3 rounded-xl border border-primary-100 bg-primary-50/60 p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-primary-600" />
        <p className="text-xs text-primary-950 font-medium">
          All campus earnings, client payouts, and vendor deposits go directly into your unified Kampmax Pay wallet.
        </p>
      </div>
    </div>
  );
}

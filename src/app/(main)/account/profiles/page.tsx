"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PROFILE_DEFINITIONS, useMyProfiles } from "@/hooks/use-my-profiles";

export default function AccountProfilesPage() {
  const { data: states, isPending, isFetching, refetch } = useMyProfiles();
  const hasError = !!states && Object.values(states).some((s) => s.status === "error");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-kampmax-text">My Kampmax Profiles</h1>
      <p className="mt-1 text-sm text-kampmax-text-secondary">
        One account, several ways to use Kampmax. Open a profile you already have, or set up a new one.
      </p>

      <ul className="mt-6 space-y-3">
        {PROFILE_DEFINITIONS.map((p) => {
          const Icon = p.icon;
          const state = states?.[p.id];
          const active = state?.status === "active";
          const href = active ? p.activeHref : p.onboardHref;

          return (
            <li key={p.id}>
              <div className="flex items-center gap-4 rounded-xl border border-kampmax-border bg-white p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-kampmax-text">{p.label}</h2>
                    {active && (
                      <span className="rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-medium text-success-700">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-kampmax-text-secondary">
                    {active && state.sub ? state.sub : p.description}
                  </p>
                </div>

                {isPending ? (
                  <div
                    className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primary-600/30 border-t-primary-600"
                    role="status"
                    aria-label={`Checking ${p.label} profile`}
                  />
                ) : state?.status === "error" ? (
                  <span className="shrink-0 text-xs text-kampmax-error">Couldn&apos;t check</span>
                ) : (
                  <Link
                    href={href}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-kampmax-border px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    {active ? "Open dashboard" : p.onboardLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {hasError && (
        <p role="alert" className="mt-4 text-sm text-kampmax-error">
          Some profiles couldn&apos;t be checked.{" "}
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="font-medium underline disabled:opacity-50"
          >
            {isFetching ? "Trying…" : "Try again"}
          </button>
        </p>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, Building2, Store, Wrench } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getVendorDashboardAccessApi } from "@/services/vendor-dashboard";
import { getServiceProviderDashboardAccessApi } from "@/services/service-provider-dashboard";
import { getFreelancerDashboardAccessApi } from "@/services/freelancer-dashboard";
import { getEmployerDashboardAccessApi } from "@/services/employer";

type ProfileId = "vendor" | "freelancer" | "service" | "employer";

interface ProfileDefinition {
  id: ProfileId;
  label: string;
  description: string;
  icon: typeof Store;
  activeHref: string;
  onboardHref: string;
  onboardLabel: string;
  check: () => Promise<{ kind?: string; storeName?: string; displayName?: string } | null>;
}

const PROFILES: ProfileDefinition[] = [
  {
    id: "vendor",
    label: "Vendor",
    description: "Sell products from your own campus store.",
    icon: Store,
    activeHref: "/vendor",
    onboardHref: "/onboarding/vendor",
    onboardLabel: "Become a Vendor",
    check: getVendorDashboardAccessApi,
  },
  {
    id: "freelancer",
    label: "Freelancer",
    description: "Offer your skills and win projects from clients.",
    icon: Briefcase,
    activeHref: "/freelancer/dashboard",
    onboardHref: "/onboarding/freelancer",
    onboardLabel: "Become a Freelancer",
    check: getFreelancerDashboardAccessApi,
  },
  {
    id: "service",
    label: "Service Provider",
    description: "Get booked for local, on-site services.",
    icon: Wrench,
    activeHref: "/service-provider",
    onboardHref: "/onboarding/service-provider",
    onboardLabel: "Offer Services",
    check: getServiceProviderDashboardAccessApi,
  },
  {
    id: "employer",
    label: "Employer",
    description: "Post jobs and hire talent.",
    icon: Building2,
    activeHref: "/employer/dashboard",
    onboardHref: "/onboarding/employer",
    onboardLabel: "Become an Employer",
    check: getEmployerDashboardAccessApi,
  },
];

type ProfileState = { status: "active"; sub?: string } | { status: "none" } | { status: "error" };

/** Access kinds are "no_<vertical>" when the backend has no such profile. */
function hasProfile(a: { kind?: string } | null | undefined) {
  return !!a?.kind && !String(a.kind).startsWith("no_");
}

export default function AccountProfilesPage() {
  const { status } = useAuth();
  const [states, setStates] = useState<Record<ProfileId, ProfileState> | null>(null);

  const load = useCallback(async () => {
    setStates(null);
    const results = await Promise.allSettled(PROFILES.map((p) => p.check()));
    const next = {} as Record<ProfileId, ProfileState>;
    PROFILES.forEach((p, i) => {
      const r = results[i];
      if (r.status === "rejected") next[p.id] = { status: "error" };
      else if (hasProfile(r.value)) {
        next[p.id] = { status: "active", sub: r.value?.storeName ?? r.value?.displayName };
      } else next[p.id] = { status: "none" };
    });
    setStates(next);
  }, []);

  useEffect(() => {
    if (status === "authenticated") void load();
  }, [status, load]);

  const hasError = !!states && Object.values(states).some((s) => s.status === "error");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-kampmax-text">My Kampmax Profiles</h1>
      <p className="mt-1 text-sm text-kampmax-text-secondary">
        One account, several ways to use Kampmax. Open a profile you already have, or set up a new one.
      </p>

      <ul className="mt-6 space-y-3">
        {PROFILES.map((p) => {
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

                {!state ? (
                  <div
                    className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primary-600/30 border-t-primary-600"
                    role="status"
                    aria-label={`Checking ${p.label} profile`}
                  />
                ) : state.status === "error" ? (
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
          <button type="button" onClick={() => void load()} className="font-medium underline">
            Try again
          </button>
        </p>
      )}
    </div>
  );
}

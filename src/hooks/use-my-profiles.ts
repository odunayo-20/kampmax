"use client";

import { useQuery } from "@tanstack/react-query";
import { Briefcase, Building2, Store, Wrench } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getVendorDashboardAccessApi } from "@/services/vendor-dashboard";
import { getServiceProviderDashboardAccessApi } from "@/services/service-provider-dashboard";
import { getFreelancerDashboardAccessApi } from "@/services/freelancer-dashboard";
import { getEmployerDashboardAccessApi } from "@/services/employer";

/**
 * The four kinds of profile an account can hold, and how to find out which it has.
 * One definition for everything that lists them: the top-bar switcher, the profiles
 * page and the home page strip.
 */
export type ProfileId = "vendor" | "freelancer" | "service" | "employer";

type AccessResult = { kind?: string; storeName?: string; displayName?: string } | null;

export interface ProfileDefinition {
  id: ProfileId;
  label: string;
  description: string;
  icon: typeof Store;
  /** Where an existing profile's dashboard lives. */
  activeHref: string;
  /** Where to start setting one up. */
  onboardHref: string;
  onboardLabel: string;
  /** Live backend check: does this account already hold this profile? */
  check: () => Promise<AccessResult>;
}

export const PROFILE_DEFINITIONS: ProfileDefinition[] = [
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

/** What we know about one profile: held (with its display name), not held, or couldn't tell. */
export type ProfileState = { status: "active"; sub?: string } | { status: "none" } | { status: "error" };

/** Access kinds are "no_<vertical>" when the backend has no such profile. */
export function hasProfile(access: AccessResult | undefined): boolean {
  return !!access?.kind && !String(access.kind).startsWith("no_");
}

/**
 * Asks the backend about all four profiles at once. One failing check marks only that
 * profile as "error"; the others still answer.
 */
export async function loadMyProfiles(): Promise<Record<ProfileId, ProfileState>> {
  const results = await Promise.allSettled(PROFILE_DEFINITIONS.map((p) => p.check()));
  const states = {} as Record<ProfileId, ProfileState>;
  PROFILE_DEFINITIONS.forEach((p, i) => {
    const result = results[i];
    if (result.status === "rejected") states[p.id] = { status: "error" };
    else if (hasProfile(result.value)) {
      states[p.id] = { status: "active", sub: result.value?.storeName ?? result.value?.displayName };
    } else states[p.id] = { status: "none" };
  });
  return states;
}

/** The signed-in account's profiles, shared (and cached) across every place that shows them. */
export function useMyProfiles() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["my-profiles"],
    queryFn: loadMyProfiles,
    enabled: status === "authenticated",
    staleTime: 60_000,
  });
}

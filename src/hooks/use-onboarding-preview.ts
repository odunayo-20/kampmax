"use client";

import { useQuery } from "@tanstack/react-query";
import { homeQueries, toApiCampusId } from "@/lib/home-queries";
import {
  eventToPreview,
  pickUpcomingEvent,
  productToPreview,
  serviceToPreview,
  type OnboardingPreview,
} from "@/lib/onboarding-preview";

export type PreviewKind = "marketplace" | "services" | "events";

export type PreviewState =
  | { status: "loading" }
  /** The request worked but there is nothing to show yet. */
  | { status: "empty" }
  /** The request failed. Never filled in with demo data. */
  | { status: "error" }
  | { status: "ready"; preview: OnboardingPreview };

// Reuses the home page's live-only queries (they throw on failure instead of falling back
// to bundled demo data) and so shares their cache with the home feed.
const OPTIONS = { retry: 1, staleTime: 60_000 } as const;

/**
 * One real sample record for a tour slide. `kind: null` (a slide with no public data
 * source) fetches nothing. With no campus chosen yet, it looks across all campuses.
 */
export function useOnboardingPreview(kind: PreviewKind | null, campusId?: string): PreviewState {
  const apiCampusId = toApiCampusId(campusId);

  const products = useQuery({
    ...homeQueries.products(apiCampusId),
    ...OPTIONS,
    enabled: kind === "marketplace",
    select: (res) => res.map(productToPreview).find((p) => p !== null) ?? null,
  });
  const services = useQuery({
    ...homeQueries.services(apiCampusId),
    ...OPTIONS,
    enabled: kind === "services",
    select: (res) => res.map(serviceToPreview).find((p) => p !== null) ?? null,
  });
  const events = useQuery({
    ...homeQueries.events(apiCampusId),
    ...OPTIONS,
    enabled: kind === "events",
    select: (page) => {
      const next = pickUpcomingEvent(page.items);
      return next ? eventToPreview(next) : null;
    },
  });

  const query = kind === "marketplace" ? products : kind === "services" ? services : events;

  if (kind === null) return { status: "empty" };
  if (query.isError) return { status: "error" };
  if (query.isPending) return { status: "loading" };
  return query.data ? { status: "ready", preview: query.data } : { status: "empty" };
}

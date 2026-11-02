import type { Metadata } from "next";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { HomeContent } from "@/components/home/HomeContent";
import { prefetchHome } from "@/lib/home-queries";

export const metadata: Metadata = {
  title: "Kampmax | Campus marketplace, services, freelancers & events",
  description:
    "Buy and sell on campus, book services, hire freelancers, find gigs and get event tickets, all in one place.",
};

/**
 * Nothing here is per-visitor, so Next prerenders this page and rebuilds it in the
 * background at most once a minute, the way a cache would. Without this it would be
 * built once at deploy time and show that day's listings until the next deploy.
 */
export const revalidate = 60;

/** How long to wait for the data. Nobody is waiting on a background rebuild, so be generous. */
const PREFETCH_BUDGET_MS = 4000;

/**
 * The home page, with its public data loaded on the server. The first HTML a visitor (or
 * a search engine) receives already holds real listings, services and events instead of
 * an empty shell, and the browser picks up from there (it refreshes anything older than
 * 30 seconds as soon as the page opens).
 *
 * Only public data is loaded here, the same for everyone; anything personal (profiles,
 * saved items, the visitor's campus) is added in the browser afterwards.
 */
export default async function HomePage() {
  // A fresh client per rebuild, so nothing is shared between builds. No retries: a source
  // that fails is left to the browser instead of delaying the page.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await prefetchHome(queryClient, PREFETCH_BUDGET_MS);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeContent />
    </HydrationBoundary>
  );
}

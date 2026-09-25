import { FREELANCER_CATEGORIES } from "@/config/freelancer";
import { cachedTaxonomyName } from "@/services/taxonomy";
import type { FreelancerService } from "@/types/freelancer-services";
import { FREELANCER_SERVICE_PRICING } from "@/types/freelancer-services";
import { formatNaira, formatNairaCompact } from "@/lib/utils";

/**
 * Display name for a category id. New ids come from the SERVICE taxonomy
 * (resolved from the loaded tree; render `useCategories("SERVICE")` in the
 * calling component so it is warm); the static list only labels legacy ids.
 */
export function categoryLabel(categoryId: string): string {
  return (
    cachedTaxonomyName(categoryId) ??
    FREELANCER_CATEGORIES.find((c) => c.id === categoryId)?.name ??
    "General"
  );
}

/** Compact human-readable price summary for a service card. */
export function servicePriceLabel(service: Pick<FreelancerService, "pricing" | "price" | "priceMax">): string | null {
  if (service.price === undefined || service.price === null) return null;
  const base = formatNairaCompact(service.price);
  switch (service.pricing) {
    case FREELANCER_SERVICE_PRICING.HOURLY:
      return `${base}/hr`;
    case FREELANCER_SERVICE_PRICING.STARTING_AT:
      return service.priceMax ? `${base}–${formatNairaCompact(service.priceMax)}` : `From ${base}`;
    case FREELANCER_SERVICE_PRICING.PROJECT:
      return `${base} project`;
    default:
      return base;
  }
}

export { formatNaira };

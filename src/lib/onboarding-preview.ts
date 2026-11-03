import type { Product } from "@/types";
import type { EventItem } from "@/types/event-ticketing";
import type { MarketplaceService } from "@/types/service-marketplace";
import { getServiceCategoryName, getServicePriceDisplay } from "@/services/service-marketplace";
import { formatNaira } from "@/lib/utils";

/**
 * What the tour's sample card shows. Every field comes from a real record: a field the
 * record doesn't have is left out (`undefined`), never replaced by a made-up value.
 */
export interface OnboardingPreview {
  tag: string;
  title: string;
  detail?: string;
  extra?: string;
  /** Present only when the record says so (e.g. a verified provider). */
  verifiedLabel?: string;
  /** Public page for the record, so a guest can open it. */
  href: string;
}

/** Joins the parts that exist; `undefined` when none do. */
function joinParts(parts: Array<string | undefined | false>): string | undefined {
  const present = parts.filter((p): p is string => typeof p === "string" && p.trim() !== "");
  return present.length > 0 ? present.join(" • ") : undefined;
}

export function productToPreview(product: Product): OnboardingPreview | null {
  if (!product.title.trim()) return null;
  return {
    tag: product.condition,
    title: product.title,
    detail: joinParts([product.location]),
    // A price of 0 means "not set", not "free".
    extra: product.price > 0 ? formatNaira(product.price) : undefined,
    href: `/marketplace/${product.id}`,
  };
}

export function serviceToPreview(service: MarketplaceService): OnboardingPreview | null {
  if (!service.name.trim()) return null;
  const price = getServicePriceDisplay(service.pricingModel, service.price, service.priceMax);
  return {
    tag: getServiceCategoryName(service.categoryId) || "Service",
    title: service.name,
    detail: joinParts([service.provider?.displayName]),
    extra: price.label,
    verifiedLabel: service.provider?.verified ? "Verified provider" : undefined,
    href: `/services/${service.id}`,
  };
}

const EVENT_DATE = new Intl.DateTimeFormat("en-NG", { weekday: "short", day: "numeric", month: "short" });

/** The soonest event that is still on and hasn't ended. */
export function pickUpcomingEvent(events: EventItem[], now = Date.now()): EventItem | undefined {
  return events
    .filter((e) => e.status === "ACTIVE" && new Date(e.endsAt).getTime() > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
}

export function eventToPreview(event: EventItem): OnboardingPreview | null {
  if (!event.title.trim()) return null;
  const start = new Date(event.startsAt);
  const price = event.minPrice > 0 ? `From ${formatNaira(event.minPrice)}` : "Free entry";
  return {
    tag: event.category?.name ?? "Event",
    title: event.title,
    detail: joinParts([
      event.location,
      Number.isNaN(start.getTime()) ? undefined : EVENT_DATE.format(start),
    ]),
    extra: joinParts([price, event.attendeeCount > 0 && `${event.attendeeCount} going`]),
    href: `/events/${event.id}`,
  };
}

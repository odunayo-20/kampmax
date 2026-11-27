/** Pure rules for the provider's services list. The mobile app's lib/service-provider.ts says the same things. */

import { formatNaira } from "@/lib/utils";
import type { ServiceProviderDashboardService } from "@/types/service-provider-dashboard";

/** Live, paused or draft: the only three states the backend has. */
export const SERVICE_STATUS_NAME: Record<string, string> = {
  active: "Live",
  inactive: "Paused",
  draft: "Draft",
};

/** What the live/pause button does next: a paused or draft service goes live, a live one pauses. */
export function nextServiceStatus(status: string): { to: "active" | "inactive"; label: string } {
  return status === "active" ? { to: "inactive", label: "Pause" } : { to: "active", label: "Make live" };
}

/** Where a service happens, in the backend's own words. */
const LOCATION_NAME: Record<string, string> = {
  provider_location: "On campus",
  customer_location: "Off campus",
  online: "Remote",
};

export const locationName = (locationType: string): string => LOCATION_NAME[locationType] ?? "";

/** The price as the provider set it. A negotiable service has no price to show. */
export function servicePriceLabel(s: Pick<ServiceProviderDashboardService, "pricingModel" | "price" | "priceMax">): string {
  switch (s.pricingModel) {
    case "starting_from":
      return `From ${formatNaira(s.price)}`;
    case "range":
      return `${formatNaira(s.price)} – ${formatNaira(s.priceMax ?? s.price)}`;
    case "hourly":
      return `${formatNaira(s.price)} / hour`;
    case "quote":
      return "Negotiable";
    default:
      return formatNaira(s.price);
  }
}

/** The line above the services list. */
export function servicesSummary(live: number, total: number): string {
  return `${live} of ${total} live. Paused and draft services are hidden from customers.`;
}

/** Customers only see a provider's live services once Kampmax has verified the profile. */
export const UNVERIFIED_SERVICES_NOTE = "Customers see your live services once Kampmax verifies your profile.";

/** What to show when the live/pause switch fails. */
export const SERVICE_SWITCH_ERROR = "Couldn't update the service. Check your connection and try again.";

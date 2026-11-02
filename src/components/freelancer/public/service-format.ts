import { formatNaira, pluralize } from "@/lib/utils";
import type { FreelancerService } from "@/types/freelancer-services";
import { FREELANCER_SERVICE_PRICING } from "@/types/freelancer-services";

/** "₦15,000", "From ₦15,000 – ₦40,000", "₦2,000/hr" — split so the amount can be set large. */
export function priceParts(
  service: Pick<FreelancerService, "pricing" | "price" | "priceMax">
): { prefix: string; amount: string; suffix: string } {
  const { pricing, price, priceMax } = service;
  if (typeof price !== "number") return { prefix: "", amount: "Price on request", suffix: "" };
  const base = formatNaira(price);
  if (pricing === FREELANCER_SERVICE_PRICING.HOURLY) return { prefix: "", amount: base, suffix: "/hr" };
  if (pricing === FREELANCER_SERVICE_PRICING.PROJECT) return { prefix: "", amount: base, suffix: "/project" };
  if (pricing === FREELANCER_SERVICE_PRICING.STARTING_AT) {
    return {
      prefix: "From",
      amount: typeof priceMax === "number" ? `${base} – ${formatNaira(priceMax)}` : base,
      suffix: "",
    };
  }
  return { prefix: "", amount: base, suffix: "" };
}

const UUID_AT_END = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * Where a service lives: /freelancers/services/<slug>-<id>. The slug makes the link
 * readable; the id makes it exact (two freelancers can both call a service
 * "Logo Design", so a slug alone is ambiguous).
 */
export function serviceHref(service: Pick<FreelancerService, "id" | "slug">): string {
  return `/freelancers/services/${service.slug ? `${service.slug}-` : ""}${service.id}`;
}

/** The service id inside an address made by `serviceHref`; null for an old slug-only address. */
export function serviceIdFromAddress(address: string): string | null {
  return UUID_AT_END.exec(address)?.[1] ?? null;
}

/** The price as one line of text. */
export function priceText(service: Pick<FreelancerService, "pricing" | "price" | "priceMax">): string {
  const { prefix, amount, suffix } = priceParts(service);
  return `${prefix ? `${prefix} ` : ""}${amount}${suffix}`;
}

/** "3 days"; null when the freelancer gave no estimate. */
export function deliveryLabel(
  service: Pick<FreelancerService, "deliveryValue" | "deliveryUnit">
): string | null {
  if (!service.deliveryValue) return null;
  const unit = { hours: "hour", days: "day", weeks: "week" }[service.deliveryUnit];
  return pluralize(service.deliveryValue, unit);
}

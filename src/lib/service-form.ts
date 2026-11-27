/** Pure rules for adding or editing a service. The mobile app's lib/service-provider.ts says the same things. */

import type { ServiceProviderLocationType, ServiceProviderPricingModel } from "@/types/service-provider";

export const TITLE_MIN = 2;
export const TITLE_MAX = 200;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 5000;
export const DURATION_PRESETS = [30, 45, 60, 90, 120, 180];

/** The four ways the backend lets a provider charge. A negotiable service shows no price. */
export const PRICING_OPTIONS: { value: ServiceProviderPricingModel; label: string }[] = [
  { value: "fixed", label: "Fixed price" },
  { value: "starting_from", label: "Starting from" },
  { value: "hourly", label: "Per hour" },
  { value: "quote", label: "Negotiable" },
];

export const PRICING_HINT: Record<string, string> = {
  fixed: "One price for the whole job.",
  starting_from: 'Shown as "From ₦…". You can agree the final price with the customer.',
  hourly: "Charged for each hour of work.",
  quote: "No price is shown. You agree it with the customer.",
};

/** Where a service happens, in the backend's own words. */
export const LOCATION_OPTIONS: { value: ServiceProviderLocationType; label: string }[] = [
  { value: "provider_location", label: "On campus" },
  { value: "customer_location", label: "Off campus" },
  { value: "online", label: "Remote" },
];

export const CATEGORY_REQUIRED = "Choose a category so customers can find this service.";

/** New services go live at once; customers only see them once the provider is verified. */
export const NEW_SERVICE_NOTE = "New services go live straight away, but customers only see them once Kampmax has verified you.";

/** A price is needed unless the model is "negotiable"; blank is then zero. Amounts are naira, up to 2 decimals. */
export function parsePrice(raw: string, model: string): { value: number } | { error: string } {
  const t = raw.replace(/[₦,\s]/g, "");
  if (!t) return model === "quote" ? { value: 0 } : { error: "Enter a price in naira, e.g. 5000." };
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return { error: "Enter an amount in naira, e.g. 5000." };
  const value = Number(t);
  if (value <= 0 && model !== "quote") return { error: "The price must be more than zero." };
  return { value };
}

/** Whole minutes from 1 to a day. */
export function parseDuration(raw: string): { value: number } | { error: string } {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return { error: "Enter a whole number of minutes." };
  const n = Number(t);
  return n < 1 || n > 1440 ? { error: "Enter between 1 and 1440 minutes." } : { value: n };
}

/** "45 min", "1 hr", "1 hr 30 min". */
export function durationText(minutes: number): string {
  const m = Math.round(minutes);
  if (m <= 0) return "";
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} min`;
  return rest === 0 ? `${h} hr` : `${h} hr ${rest} min`;
}

export interface ServiceFormValues {
  name: string;
  description: string;
  categoryId: string;
  pricingModel: string;
  price: string;
  duration: string;
}

export interface ServiceFormErrors {
  name?: string;
  description?: string;
  category?: string;
  price?: string;
  duration?: string;
}

export function validateServiceForm(f: ServiceFormValues): ServiceFormErrors {
  const errors: ServiceFormErrors = {};
  const name = f.name.trim();
  if (name.length < TITLE_MIN) errors.name = `Enter a title of at least ${TITLE_MIN} characters.`;
  else if (name.length > TITLE_MAX) errors.name = `Keep the title under ${TITLE_MAX} characters.`;
  if (!f.categoryId) errors.category = CATEGORY_REQUIRED;
  const d = f.description.trim();
  if (d.length < DESCRIPTION_MIN) errors.description = `Describe the service in at least ${DESCRIPTION_MIN} characters.`;
  else if (d.length > DESCRIPTION_MAX) errors.description = `Keep the description under ${DESCRIPTION_MAX} characters.`;
  const price = parsePrice(f.price, f.pricingModel);
  if ("error" in price) errors.price = price.error;
  const dur = parseDuration(f.duration);
  if ("error" in dur) errors.duration = dur.error;
  return errors;
}

function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** The slug is unique across providers, so a short random tail stops two "Room cleaning" colliding. */
export function makeSlug(name: string, rand: () => number = Math.random): string {
  const tail = Math.floor(rand() * 36 ** 4).toString(36).padStart(4, "0");
  return `${slugify(name) || "service"}-${tail}`;
}

/**
 * What to show when saving a service fails. The server's reason is shown only for a rule it enforces (a 409 or 422
 * message that is short); validation and server errors come back as technical text, so they get a plain sentence.
 */
export function describeServiceSaveError(message: string | undefined, status?: number): string {
  const text = message?.trim() ?? "";
  if ((status === 409 || status === 422) && text && text.length <= 200) return text;
  return "Couldn't save the service. Check the details and your connection, then try again.";
}

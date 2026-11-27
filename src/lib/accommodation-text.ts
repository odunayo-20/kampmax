/**
 * How a place to live reads on a card, and what the search page says. The mobile app's lib/accommodation-search.ts
 * says the same things. Pure rules: no screens, no network.
 */

import { formatNaira } from "@/lib/utils";

export const FREQUENCY_SHORT: Record<string, string> = {
  ANNUALLY: "a year",
  BIANNUALLY: "every 6 months",
  PER_SEMESTER: "a semester",
  QUARTERLY: "every 3 months",
  MONTHLY: "a month",
  PER_NIGHT: "a night",
};

export const FURNISHING_TEXT: Record<string, string> = {
  FURNISHED: "Furnished",
  SEMI_FURNISHED: "Partly furnished",
  UNFURNISHED: "Unfurnished",
};

/** "₦250,000 a year". */
export function rentText(l: { rentAmount: number; paymentFrequency: string }): string {
  const per = FREQUENCY_SHORT[l.paymentFrequency];
  return per ? `${formatNaira(l.rentAmount)} ${per}` : formatNaira(l.rentAmount);
}

/** "Akoka, Yaba, Lagos". The street address is never part of a public listing. */
export function placeText(l: { neighbourhood: string | null; city: string; state: string }): string {
  return [l.neighbourhood, l.city, l.state].filter((x) => x && x.trim()).join(", ");
}

/** "2 bed · 1 bath · Furnished". */
export function factsText(l: { bedrooms: number; bathrooms: number; furnishingStatus: string }): string {
  const bed = l.bedrooms === 0 ? "Studio" : `${l.bedrooms} bed`;
  return [bed, `${l.bathrooms} bath`, FURNISHING_TEXT[l.furnishingStatus] ?? null].filter(Boolean).join(" · ");
}

export const BEDROOM_FILTERS: { id: string; label: string }[] = [
  { id: "", label: "Any size" },
  { id: "1", label: "1+ bed" },
  { id: "2", label: "2+ beds" },
  { id: "3", label: "3+ beds" },
];

/** The warning at the top of the search: housing is where students get scammed. */
export const HOUSING_SAFETY_NOTE =
  "Rooms, hostels and flats from verified agents. Contact stays on Kampmax, so never pay anyone before you have seen the place.";

export const HOUSING_LOAD_ERROR = { title: "Couldn't load places", text: "Check your connection and try again." };

export const HOUSING_EMPTY = { title: "No places match", text: "Try a different area, a higher rent or fewer filters." };

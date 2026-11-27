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

// ---------- a listing's page ----------

/** The warning on a listing's page, next to the agent. The app says the same. */
export const DETAIL_SAFETY_NOTE = "Keep payments and chats on Kampmax. Never pay before you have seen the place and met the agent.";

export const ADDRESS_NOTE = "The exact address is private. The agent shares it with you after you enquire.";

export const LISTING_GONE = "This place is no longer listed. It may have been taken, or the agent took it down.";

/** Photos only, over a secure link: a video in an image frame would show broken. */
export function photosOf<T extends { url: string; type: string }>(media: readonly T[]): T[] {
  return media.filter((m) => m.type !== "VIDEO" && /^https:\/\//i.test(m.url));
}

/** The charges that apply, then the total, for the "Cost up front" card. */
export function chargeRows(c: {
  rent: number;
  cautionFee: number;
  agencyFee: number;
  agreementFee: number;
  otherCharges: number;
  totalUpfront: number;
}): { label: string; value: string; bold?: boolean }[] {
  const rows = [
    { label: "Rent", amount: c.rent },
    { label: "Caution fee", amount: c.cautionFee },
    { label: "Agency fee", amount: c.agencyFee },
    { label: "Agreement fee", amount: c.agreementFee },
    { label: "Other charges", amount: c.otherCharges },
  ]
    .filter((r) => Number(r.amount) > 0)
    .map((r) => ({ label: r.label, value: formatNaira(Number(r.amount)) }));
  return [...rows, { label: "Total to pay up front", value: formatNaira(c.totalUpfront), bold: true }];
}

/** "Agent since March 2025". */
export function memberSinceText(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Agent since ${d.toLocaleDateString("en-NG", { month: "long", year: "numeric" })}`;
}

/** "Agent confirmed it is available 3 days ago", from the real date, or null when the agent never confirmed. */
export function availabilityText(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const days = Math.floor((now - t) / 86_400_000);
  const when = days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
  return `Agent confirmed it is available ${when}`;
}

export const ENQUIRY_MIN = 10;
export const ENQUIRY_MAX = 1000;

export type ContactMethod = "IN_APP" | "PHONE" | "EMAIL";

export const CONTACT_CHOICES: { id: ContactMethod; label: string; consent: string }[] = [
  { id: "IN_APP", label: "Messages here", consent: "Nothing about you is shared. The agent replies in the app." },
  { id: "PHONE", label: "Phone call", consent: "Your account phone number is shown to this agent so they can call you." },
  { id: "EMAIL", label: "Email", consent: "Your account email address is shown to this agent so they can write to you." },
];

export function enquiryProblem(message: string): string | null {
  const t = message.trim();
  if (t.length < ENQUIRY_MIN) {
    return `Say a little more (at least ${ENQUIRY_MIN} characters), for example whether it is still free and when you could move in.`;
  }
  if (t.length > ENQUIRY_MAX) return `Keep it under ${ENQUIRY_MAX} characters.`;
  return null;
}

/** A phone choice needs a phone on the account; the server refuses otherwise, so say it first. */
export function contactProblem(
  method: ContactMethod,
  user: { phone?: string | null; email?: string | null } | null | undefined
): string | null {
  if (method === "PHONE" && !(user?.phone ?? "").trim()) return "Add a phone number to your profile to be contacted by phone.";
  if (method === "EMAIL" && !(user?.email ?? "").trim()) return "Add an email address to your profile to be contacted by email.";
  return null;
}

/** The server answers 409 with the id of the enquiry that is already open. Reads it from whatever shape arrived. */
export function existingEnquiryId(data: unknown): string | null {
  const find = (o: unknown): string | null => {
    if (!o || typeof o !== "object") return null;
    const rec = o as Record<string, unknown>;
    if (typeof rec.enquiryId === "string" && /^[0-9a-f-]{36}$/i.test(rec.enquiryId)) return rec.enquiryId;
    return find(rec.data) ?? find(rec.message);
  };
  return find(data);
}

export const REPORT_MAX = 1000;

export function reportProblem(reason: string, description: string, reasons: readonly string[]): string | null {
  if (!reasons.includes(reason)) return "Choose why you are reporting this.";
  if (description.trim().length > REPORT_MAX) return `Keep the details under ${REPORT_MAX} characters.`;
  if (reason === "OTHER" && description.trim().length < 5) return "Tell us a little about what is wrong.";
  return null;
}

/**
 * What to show when saving, enquiring or reporting fails. The server's reason is shown when it is a short refusal
 * meant for people (400, 409 or 422); anything else gets a plain sentence.
 */
export function describeHousingError(error: unknown): string {
  const e = (error ?? {}) as { status?: number; message?: string };
  const text = e.message?.trim() ?? "";
  if ((e.status === 400 || e.status === 409 || e.status === 422) && text && text.length <= 200) return text;
  if (e.status === 401) return "Please sign in again.";
  return "That didn't go through. Check your connection and try again.";
}

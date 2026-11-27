/**
 * An accommodation agent's own listings: what a listing's statuses mean together, the list filters, and the rent
 * line on a card. The mobile app's lib/agent-listings.ts and app/agent-listings.tsx say the same things. Pure rules.
 */

import type { AccommodationListing } from "@/types/accommodation";

export type ListingTone = "positive" | "attention" | "info" | "neutral" | "bad";

type StatusFields = Pick<AccommodationListing, "moderationStatus" | "publicationStatus" | "availabilityStatus" | "rejectionReason" | "expiresAt">;

const day = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });

/** What a listing's two statuses mean together, with one sentence on where it stands and what, if anything, to do. */
export function listingStatus(l: StatusFields): { label: string; tone: ListingTone; text: string } {
  switch (l.moderationStatus) {
    case "DRAFT":
      return { label: "Draft", tone: "neutral", text: "Only you can see this. Finish it, then choose a package to publish." };
    case "PENDING_APPROVAL":
      return { label: "In review", tone: "info", text: "The Kampmax team is checking it. You can edit it again once the review is done." };
    case "REJECTED":
      return {
        label: "Needs changes",
        tone: "bad",
        text: l.rejectionReason?.trim() ? `Kampmax asked for changes: ${l.rejectionReason.trim()}` : "Kampmax asked for changes. Edit it, then send it back for review.",
      };
    case "ADMIN_SUSPENDED":
      return { label: "Suspended", tone: "bad", text: "Kampmax has taken this listing down. Contact support to find out why." };
    case "APPROVED":
      if (l.publicationStatus === "ACTIVE") return { label: "Live", tone: "positive", text: l.expiresAt ? `Students can see it until ${day(l.expiresAt)}.` : "Students can see it." };
      if (l.publicationStatus === "EXPIRED") return { label: "Expired", tone: "attention", text: "Its paid period has ended, so students cannot see it. Renew to bring it back." };
      if (l.availabilityStatus !== "AVAILABLE") return { label: "Hidden", tone: "neutral", text: "Hidden because the room is marked not available. Mark it available to show it again." };
      return { label: "Hidden", tone: "neutral", text: "Approved, but not showing to students right now." };
    default:
      return { label: l.moderationStatus, tone: "neutral", text: "" };
  }
}

export type ListingFilter = "all" | "attention" | "live" | "review" | "draft";

export const LISTING_FILTERS: { id: ListingFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "attention", label: "Needs you" },
  { id: "live", label: "Live" },
  { id: "review", label: "In review" },
  { id: "draft", label: "Drafts" },
];

export function listingMatches(l: Pick<AccommodationListing, "moderationStatus" | "publicationStatus" | "subscription">, f: ListingFilter): boolean {
  switch (f) {
    case "live":
      return l.moderationStatus === "APPROVED" && l.publicationStatus === "ACTIVE";
    case "review":
      return l.moderationStatus === "PENDING_APPROVAL";
    case "draft":
      return l.moderationStatus === "DRAFT";
    case "attention":
      return (
        l.moderationStatus === "REJECTED" ||
        l.publicationStatus === "EXPIRED" ||
        l.moderationStatus === "ADMIN_SUSPENDED" ||
        ["PAST_DUE", "SUSPENDED"].includes(l.subscription?.status ?? "")
      );
    default:
      return true;
  }
}

/** "per year" and so on, for "₦250,000 per year". */
export const FREQUENCY_PHRASE: Record<string, string> = {
  ANNUALLY: "per year",
  BIANNUALLY: "every 6 months",
  PER_SEMESTER: "per semester",
  QUARTERLY: "every 3 months",
  MONTHLY: "per month",
  PER_NIGHT: "per night",
};

/** "₦250,000 per year" for a card, or "Rent not set" on a draft without one. */
export function rentLine(l: Pick<AccommodationListing, "rentAmount" | "paymentFrequency">, format: (n: number) => string): string {
  if (!(l.rentAmount > 0)) return "Rent not set";
  return `${format(l.rentAmount)} ${FREQUENCY_PHRASE[l.paymentFrequency] ?? ""}`.trim();
}

/** "Sunrise Lodge · Room 4". */
export const placeLine = (l: Pick<AccommodationListing, "property" | "unit">): string => [l.property?.title, l.unit?.unitName].filter(Boolean).join(" · ");

/** The server refuses edits while a review is open or after a suspension. */
export const canEditListing = (l: Pick<AccommodationListing, "moderationStatus">): boolean =>
  l.moderationStatus !== "PENDING_APPROVAL" && l.moderationStatus !== "ADMIN_SUSPENDED";

/** Only a draft is published by choosing a package. */
export const canPublish = (l: Pick<AccommodationListing, "moderationStatus">): boolean => l.moderationStatus === "DRAFT";

/** A rejected listing with a still-running paid period goes back for review without paying again. */
export const canResubmit = (l: Pick<AccommodationListing, "moderationStatus" | "subscription">): boolean =>
  l.moderationStatus === "REJECTED" && l.subscription?.status === "ACTIVE";

/** Only a listing with no subscription in play can be archived; the server enforces the same rule. */
export const canArchiveListing = (l: Pick<AccommodationListing, "subscription">): boolean =>
  !l.subscription || l.subscription.status === "PENDING_PAYMENT";

/** What a saved draft still lacks before it can be paid for and reviewed, in plain words. */
export function missingOnListing(l: Pick<AccommodationListing, "title" | "description" | "rentAmount" | "media">): string[] {
  const missing: string[] = [];
  if (!l.title.trim()) missing.push("a title");
  if (!(l.description ?? "").trim()) missing.push("a description");
  if (!(l.rentAmount > 0)) missing.push("the rent");
  if (l.media.length < 1) missing.push("at least one photo");
  return missing;
}

/** "a, b and c". */
export const joinAnd = (parts: string[]): string => parts.join(", ").replace(/, ([^,]*)$/, " and $1");

export const GOOD_PHOTO_COUNT = 5;
const GOOD_DESCRIPTION_LENGTH = 80;
const OPENED_BUT_IGNORED = 20;

/** One practical thing that would help a live listing, or null. A tip, never a rule. */
export function listingTip(l: Pick<AccommodationListing, "media" | "description" | "stats">): string | null {
  const photos = l.media.length;
  if (photos < GOOD_PHOTO_COUNT) return `More photos usually mean more enquiries. This one has ${photos}; try ${GOOD_PHOTO_COUNT} or more.`;
  if ((l.description ?? "").trim().length < GOOD_DESCRIPTION_LENGTH) return "Add a few lines about the room and the area. Students read them before they write.";
  const s = l.stats ?? { views: 0, saves: 0, enquiries: 0 };
  if (s.views >= OPENED_BUT_IGNORED && s.enquiries === 0) return "People open this but nobody writes. Check the rent against similar rooms, and make the first photo the best one.";
  return null;
}

export type Availability = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "UNAVAILABLE";

export const AVAILABILITY_OPTIONS: { id: Availability; label: string }[] = [
  { id: "AVAILABLE", label: "Available" },
  { id: "RESERVED", label: "Reserved" },
  { id: "OCCUPIED", label: "Occupied" },
  { id: "UNAVAILABLE", label: "Not available" },
];

export const AVAILABILITY_LABEL: Record<string, string> = Object.fromEntries(AVAILABILITY_OPTIONS.map((o) => [o.id, o.label]));

export const LISTINGS_EMPTY = {
  title: "No listings yet",
  text: "Each room has its own listing, with photos, rent and facilities. Add a property with a room first, then list it.",
};

export const NEEDS_PROPERTY = {
  title: "Add a property first",
  text: "A listing is for one room in one of your properties. Add the property and its rooms, then come back.",
};

// ---------- the form (create and edit share it) ----------

export const MAX_MONEY = 100_000_000;
export const MAX_LISTING_PHOTOS = 10;

export type PaymentFrequency = "MONTHLY" | "QUARTERLY" | "BIANNUALLY" | "ANNUALLY" | "PER_SEMESTER" | "PER_NIGHT";

export const FREQUENCY_OPTIONS: { id: PaymentFrequency; label: string }[] = [
  { id: "ANNUALLY", label: "Yearly" },
  { id: "BIANNUALLY", label: "Every 6 months" },
  { id: "PER_SEMESTER", label: "Per semester" },
  { id: "QUARTERLY", label: "Every 3 months" },
  { id: "MONTHLY", label: "Monthly" },
  { id: "PER_NIGHT", label: "Per night" },
];

export interface ListingPhoto {
  id: string;
  url: string;
}

export interface ListingForm {
  title: string;
  description: string;
  rentAmount: string;
  paymentFrequency: PaymentFrequency;
  cautionFee: string;
  agencyFee: string;
  agreementFee: string;
  otherCharges: string;
  amenityIds: string[];
  photos: ListingPhoto[];
}

export type ListingErrors = Partial<Record<"title" | "description" | "rentAmount" | "cautionFee" | "agencyFee" | "agreementFee" | "otherCharges" | "photos", string>>;

export const emptyListing = (): ListingForm => ({
  title: "",
  description: "",
  rentAmount: "",
  paymentFrequency: "ANNUALLY",
  cautionFee: "",
  agencyFee: "",
  agreementFee: "",
  otherCharges: "",
  amenityIds: [],
  photos: [],
});

const asText = (n: number): string => (n > 0 ? String(n) : "");

export function formFromListing(l: AccommodationListing): ListingForm {
  return {
    title: l.title,
    description: l.description ?? "",
    rentAmount: asText(l.rentAmount),
    paymentFrequency: (FREQUENCY_OPTIONS.some((o) => o.id === l.paymentFrequency) ? l.paymentFrequency : "ANNUALLY") as PaymentFrequency,
    cautionFee: asText(l.cautionFee),
    agencyFee: asText(l.agencyFee),
    agreementFee: asText(l.agreementFee),
    otherCharges: asText(l.otherCharges),
    amenityIds: l.amenities.map((a) => a.id),
    photos: l.media.map((m) => ({ id: m.mediaId, url: m.url })),
  };
}

/** "250000", "₦250,000" or "" (nothing) to naira, kept to 2 decimals; null when it is not an amount or too big. */
export function parseMoney(input: string, max = MAX_MONEY): number | null {
  const raw = input.trim().toLowerCase();
  if (raw === "" || raw === "0") return 0;
  const cleaned = raw.replace(/[₦,\s]/g, "").replace(/^ngn/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const naira = Math.round(Number(cleaned) * 100) / 100;
  return Number.isFinite(naira) && naira >= 0 && naira <= max ? naira : null;
}

/** A sensible starting title for a room, so a new draft is one step from useful. */
export function suggestedTitle(unit: { unitName: string; unitType: string }, property: { title: string }): string {
  const name = `${unit.unitType} at ${property.title}`.replace(/\s+/g, " ").trim();
  return name.length > 160 ? name.slice(0, 160).trim() : name;
}

type RoomSource = { id: string; title: string; units: { id: string; unitName: string; unitType: string }[] };

/** The rooms that can still get a listing: a room has at most one. */
export function freeRooms<P extends RoomSource>(properties: P[], listings: Pick<AccommodationListing, "unitId">[]): { id: string; property: P; unit: P["units"][number] }[] {
  const taken = new Set(listings.map((l) => l.unitId));
  return properties.flatMap((p) => p.units.filter((u) => !taken.has(u.id)).map((u) => ({ id: u.id, property: p, unit: u })));
}

const one = (s: string) => s.replace(/\s+/g, " ").trim();

/** Problems by field. A draft only needs a title; the rest is checked for being a sane amount or length. */
export function listingProblems(f: ListingForm): ListingErrors {
  const e: ListingErrors = {};
  const title = one(f.title);
  if (title.length < 3) e.title = 'Give the listing a title, like "Self-contain near UNILAG gate".';
  else if (title.length > 160) e.title = "Keep the title under 160 characters.";
  if (f.description.trim().length > 5000) e.description = "Keep the description under 5,000 characters.";
  const fields = [
    ["rentAmount", "Rent"],
    ["cautionFee", "Caution fee"],
    ["agencyFee", "Agency fee"],
    ["agreementFee", "Agreement fee"],
    ["otherCharges", "Other charges"],
  ] as const;
  for (const [key, label] of fields) {
    if (parseMoney(f[key]) === null) e[key] = `${label} must be an amount like 250000 (up to 2 decimals, under ₦100,000,000).`;
  }
  if (f.photos.length > MAX_LISTING_PHOTOS) e.photos = `Use at most ${MAX_LISTING_PHOTOS} photos.`;
  return e;
}

/** Rent plus every compulsory charge, worked in kobo so the pennies never drift. Null if a field is not an amount. */
export function totalUpfront(f: Pick<ListingForm, "rentAmount" | "cautionFee" | "agencyFee" | "agreementFee" | "otherCharges">): number | null {
  const parts = [f.rentAmount, f.cautionFee, f.agencyFee, f.agreementFee, f.otherCharges].map((v) => parseMoney(v));
  if (parts.some((p) => p === null)) return null;
  return parts.reduce<number>((sum, p) => sum + Math.round((p as number) * 100), 0) / 100;
}

export interface ListingBody {
  title: string;
  description?: string;
  rentAmount: number;
  paymentFrequency: PaymentFrequency;
  cautionFee: number;
  agencyFee: number;
  agreementFee: number;
  otherCharges: number;
  media: { mediaId: string }[];
  amenityIds: string[];
}

const amount = (s: string): number => parseMoney(s) ?? 0;

/** The body for a new draft. Call only after `listingProblems` found nothing. */
export function listingBody(f: ListingForm): ListingBody {
  const body: ListingBody = {
    title: one(f.title),
    rentAmount: amount(f.rentAmount),
    paymentFrequency: f.paymentFrequency,
    cautionFee: amount(f.cautionFee),
    agencyFee: amount(f.agencyFee),
    agreementFee: amount(f.agreementFee),
    otherCharges: amount(f.otherCharges),
    media: f.photos.map((p) => ({ mediaId: p.id })),
    amenityIds: f.amenityIds,
  };
  if (f.description.trim()) body.description = f.description.trim();
  return body;
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** Only what changed. Photos and facilities replace the whole set on the server, so they go only when they differ. */
export function listingPatch(f: ListingForm, original: AccommodationListing): Partial<ListingBody> {
  const was = formFromListing(original);
  const patch: Partial<ListingBody> = {};
  if (one(f.title) !== one(was.title)) patch.title = one(f.title);
  if (f.description.trim() !== was.description.trim()) patch.description = f.description.trim();
  if (amount(f.rentAmount) !== amount(was.rentAmount)) patch.rentAmount = amount(f.rentAmount);
  if (f.paymentFrequency !== was.paymentFrequency) patch.paymentFrequency = f.paymentFrequency;
  for (const k of ["cautionFee", "agencyFee", "agreementFee", "otherCharges"] as const) {
    if (amount(f[k]) !== amount(was[k])) patch[k] = amount(f[k]);
  }
  if (!sameList(f.photos.map((p) => p.id), was.photos.map((p) => p.id))) patch.media = f.photos.map((p) => ({ mediaId: p.id }));
  if (!sameSet(f.amenityIds, was.amenityIds)) patch.amenityIds = f.amenityIds;
  return patch;
}

/** Facilities are not read by the review, so they never send a listing back. Everything else in the patch does. */
const CRITICAL_KEYS = ["title", "description", "rentAmount", "paymentFrequency", "cautionFee", "agencyFee", "agreementFee", "otherCharges", "media"];

/** True when saving this patch on an approved listing takes it off the site until the team reviews it again. */
export function sendsBackForReview(l: Pick<AccommodationListing, "moderationStatus">, patch: Record<string, unknown>): boolean {
  return l.moderationStatus === "APPROVED" && CRITICAL_KEYS.some((k) => k in patch);
}

export const LOST_DRAFT = "We lost the connection, so we cannot tell if the draft was saved. Check your listings before trying again.";

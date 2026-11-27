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

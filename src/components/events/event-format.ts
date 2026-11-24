import type { EventItem } from "@/types/event-ticketing";

/**
 * Events happen on Nigerian campuses, so their times are shown in Nigerian time wherever
 * the page is rendered. Left to the machine's clock, a server in another time zone and a
 * browser in Lagos would print different times for the same event.
 */
const EVENT_TIME_ZONE = "Africa/Lagos";

const dateFmt = new Intl.DateTimeFormat("en-NG", {
  timeZone: EVENT_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-NG", {
  timeZone: EVENT_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const dayFmt = new Intl.DateTimeFormat("en-NG", {
  timeZone: EVENT_TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
});

export const eventDate = (iso: string): string => dateFmt.format(new Date(iso));
export const eventTime = (iso: string): string => timeFmt.format(new Date(iso));
export const eventDay = (iso: string): string => dayFmt.format(new Date(iso));

/** "10:00 AM - 5:00 PM" */
export function eventTimeRange(startsAt: string, endsAt: string): string {
  return `${eventTime(startsAt)} – ${eventTime(endsAt)}`;
}

/** "Free" or "From ₦2,000" style price label for cards. */
export function priceLabel(event: Pick<EventItem, "minPrice" | "tiers">): string {
  if (event.tiers.length === 0) return "Free";
  if (event.minPrice <= 0) return "Free";
  return `₦${event.minPrice.toLocaleString("en-NG")}`;
}

export const naira = (n: number): string =>
  `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

/** True while an event can still be booked. */
export function isBookable(event: EventItem): boolean {
  return (
    event.status === "ACTIVE" &&
    new Date(event.endsAt).getTime() > Date.now() &&
    event.seatsLeft > 0
  );
}

/** "Happening now", "Today", "Tomorrow", "In 5 days". Null when the date is unreadable or the event is long gone. */
export function startsIn(startsAt: string, endsAt: string | undefined, now = Date.now()): string | null {
  const start = new Date(startsAt).getTime();
  if (!Number.isFinite(start)) return null;
  const end = endsAt ? new Date(endsAt).getTime() : NaN;
  if (start <= now) return Number.isFinite(end) && end > now ? "Happening now" : null;
  const dayOf = (ms: number) => {
    const d = new Date(ms);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  };
  const days = Math.round((dayOf(start) - dayOf(now)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export type EventActionKind = "cancelled" | "ended" | "held" | "sold-out" | "not-on-sale" | "ticket" | "free";

/** What a listed event offers right now: a way to book, or the reason it can't be. Same rules as the app. */
export function eventAction(
  e: Pick<EventItem, "status" | "startsAt" | "endsAt" | "attending" | "seatsLeft" | "tiers" | "minPrice">,
  now: number
): { kind: EventActionKind; label: string; bookable: boolean } {
  if (e.status === "CANCELLED") return { kind: "cancelled", label: "Cancelled", bookable: false };
  if (eventOver(e, now)) return { kind: "ended", label: "Ended", bookable: false };
  if (e.attending) return { kind: "held", label: "You\u2019re going", bookable: false };
  if (e.seatsLeft === 0) return { kind: "sold-out", label: "Sold out", bookable: false };
  if (e.tiers.length === 0) return { kind: "not-on-sale", label: "Not on sale yet", bookable: false };
  return e.minPrice > 0
    ? { kind: "ticket", label: "Get ticket", bookable: true }
    : { kind: "free", label: "Register", bookable: true };
}

/** Whether an event's time has gone: past its end, or six hours after its start when no end is given. */
export function eventOver(e: { startsAt: string; endsAt?: string }, now: number): boolean {
  const start = Date.parse(e.startsAt);
  const end = e.endsAt ? Date.parse(e.endsAt) : NaN;
  return Number.isFinite(end) ? end < now : Number.isFinite(start) ? start + 6 * 3_600_000 < now : false;
}

/** "Only 4 left!" / "30 seats left" / "Sold out", and whether it should look urgent. */
export function seatsUrgency(seatsLeft: number): { isUrgent: boolean; label: string } {
  if (seatsLeft <= 0) return { isUrgent: true, label: "Sold out" };
  if (seatsLeft <= 10) return { isUrgent: true, label: `Only ${seatsLeft} left!` };
  return { isUrgent: false, label: `${seatsLeft} seats left` };
}

/** What an empty Events list says, for the search or time filter that is active. Same words as the app. */
export function emptyEventsCopy(
  search: string,
  when: "all" | "today" | "week" | "month",
  place: string
): { title: string; text: string } {
  if (search) return { title: `No events match "${search}"`, text: "Try a different keyword or expand your time filter." };
  return {
    title: `No events ${when === "all" ? "scheduled right now" : "in this time range"}`,
    text: `Nothing is scheduled at ${place} right now. Check back soon or host one yourself.`,
  };
}

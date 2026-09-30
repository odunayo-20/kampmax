import type { EventItem } from "@/types/event-ticketing";

const dateFmt = new Intl.DateTimeFormat("en-NG", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-NG", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const dayFmt = new Intl.DateTimeFormat("en-NG", {
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

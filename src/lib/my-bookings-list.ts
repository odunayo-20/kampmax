/** Tabs and empty-list text for the customer's bookings. Same wording as the mobile app's lib/my-bookings.ts. */

export type MyBookingTab = "upcoming" | "pending" | "in_progress" | "completed" | "cancelled" | "all";

/** "Requests" are the bookings the provider has not answered yet. */
export const MY_BOOKING_TABS: { key: MyBookingTab; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "pending", label: "Requests" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

const EMPTY_TEXT: Record<MyBookingTab, { title: string; text: string }> = {
  upcoming: { title: "No upcoming bookings", text: "Book a service and your appointments will show up here." },
  pending: { title: "No requests waiting", text: "Bookings the provider has not accepted yet show up here." },
  in_progress: { title: "Nothing in progress", text: "A booking shows up here once the provider starts the job." },
  completed: { title: "No completed bookings", text: "Finished jobs show up here, ready to confirm and review." },
  cancelled: { title: "No cancelled bookings", text: "Cancelled and declined bookings show up here." },
  all: { title: "No bookings yet", text: "Book a service and it will show up here." },
};

/** The provider's tabs: requests first, since they need an answer before they lapse. Same names as the customer's. */
export const PROVIDER_BOOKING_TABS: { key: MyBookingTab; label: string }[] = [
  { key: "pending", label: "Requests" },
  { key: "upcoming", label: "Upcoming" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

/**
 * Requests lapse and upcoming jobs are worked through in order, so both list the soonest first.
 * Everything else lists the newest first.
 */
export function defaultSort(status: string | undefined): "upcoming" | "newest" {
  return status === "pending" || status === "upcoming" ? "upcoming" : "newest";
}

/** Until the provider picks a tab, open on what needs them most: requests, else what is coming up. */
export function openingTab(s: { pending: number; upcoming: number } | null | undefined): MyBookingTab {
  return s && !s.pending && s.upcoming ? "upcoming" : "pending";
}

/** One line on what needs the provider now, or null when nothing does. */
export function providerHeadline(s: { pending: number; upcomingToday: number; inProgress: number } | null | undefined): string | null {
  if (!s) return null;
  const parts: string[] = [];
  if (s.pending) parts.push(`${s.pending} ${s.pending === 1 ? "request needs" : "requests need"} your answer`);
  if (s.upcomingToday) parts.push(`${s.upcomingToday} today`);
  if (s.inProgress) parts.push(`${s.inProgress} in progress`);
  return parts.length ? parts.join(" · ") : null;
}

const PROVIDER_EMPTY: Record<MyBookingTab, { title: string; text: string }> = {
  pending: { title: "No requests right now", text: "When a customer asks to book you, it shows up here for you to accept or decline." },
  upcoming: { title: "Nothing coming up", text: "Confirmed bookings appear here, soonest first." },
  in_progress: { title: "Nothing in progress", text: "Jobs you have started show here until you mark them complete." },
  completed: { title: "No finished jobs yet", text: "Completed bookings and what you earned from them show here." },
  cancelled: { title: "No cancellations", text: "Cancelled and declined bookings show here." },
  all: { title: "No bookings yet", text: "Once customers book your services you will see them here. Make sure a service is live and your hours are set." },
};

/** What an empty provider list says. With filters on, the filters are the likely reason. */
export function providerBookingsEmpty(tab: MyBookingTab, filtered: boolean): { title: string; text: string } {
  return filtered ? { title: "No bookings match", text: "Try a different search or clear the filters." } : PROVIDER_EMPTY[tab];
}

/** Hours after the provider marks a job done that the customer's money is released without their confirmation. */
export const AUTO_CONFIRM_HOURS = 72;

/**
 * Where the money is, in the provider's words. The server's text speaks to the customer ("Paid from your wallet.
 * Held until you confirm"), so the provider's screens build their own line from the state.
 */
export function providerPaymentLine(b: {
  status: string;
  fulfillment: { payment: { state: string }; escrow: { state: string } };
}): string {
  if (b.fulfillment.escrow.state === "disputed") return "On hold while Kampmax support reviews the problem the customer reported.";
  switch (b.fulfillment.payment.state) {
    case "released":
      return "Paid to you.";
    case "refunded":
      return "Refunded to the customer.";
    case "escrow_held":
      return b.status === "completed"
        ? `Held by Kampmax. Paid to you when the customer confirms, or automatically ${AUTO_CONFIRM_HOURS} hours after you marked the job done.`
        : "Held by Kampmax. Paid to you once the job is done and the customer confirms.";
    default:
      return "No payment was taken.";
  }
}

/** The backend lets a provider start an appointment this long before its time. */
export const EARLY_START_MS = 30 * 60_000;

/** When Start opens, in ms, while a confirmed booking has not reached it yet. Null otherwise. */
export function startOpensAt(b: { status: string; startAt: string }, nowMs: number): number | null {
  if (b.status !== "confirmed") return null;
  const opens = new Date(b.startAt).getTime() - EARLY_START_MS;
  return nowMs < opens ? opens : null;
}

/** The reasons offered when declining, so the customer gets a clear answer. */
export const DECLINE_REASONS = [
  "No longer available at that time",
  "Scheduling conflict",
  "Need more information",
  "Service not available in that location",
  "Other",
];

/** The reason sent to the customer: the choice, with the note after it. "Other" is the note alone. */
export function declineReasonText(reason: string, note: string): string {
  const n = note.trim();
  if (reason === "Other") return n || "Other";
  return n ? `${reason}. ${n}` : reason;
}

/** What accepting means, so a click is not a surprise. */
export const acceptNote = (amountText: string) =>
  `${amountText} is already held by Kampmax. It is paid to you once the customer confirms the service.`;

/**
 * What to show when a booking action (accept, cancel, confirm, report, review...) fails. The server's reason is shown
 * only when it is a short refusal meant for people (422 or 409, like "It is too early to start this appointment.").
 * Anything else gets a plain sentence.
 */
export function describeBookingActionError(code: string, message: string): string {
  const text = message.trim();
  if ((code === "422" || code === "409") && text && text.length <= 200) return text;
  if (code === "401") return "Please sign in again.";
  if (code === "404") return "This booking could not be found.";
  return "That didn't go through. Check your connection and try again.";
}

/** Hours the provider has to accept a request before it lapses and the money comes back. */
export const REQUEST_RESPONSE_HOURS = 24;

export const REQUEST_NOTE = `The provider has not accepted yet. If they don't answer within ${REQUEST_RESPONSE_HOURS} hours, the money goes back to your wallet.`;

/** What moving a booking means. A request goes back to the provider, who has to accept the new time. */
export function rescheduleNote(preference: "instant" | "request_approval"): string {
  return preference === "request_approval"
    ? `The provider has to accept the new time. If they don't answer within ${REQUEST_RESPONSE_HOURS} hours, the booking is cancelled and the money goes back to your wallet.`
    : "The new time is yours straight away. The provider is told.";
}

/** A failed move: a taken time reloads the times, a short refusal is shown as sent, anything else stays plain. */
export function describeRescheduleError(code: string, message: string): { kind: "taken" | "other"; message: string } {
  const text = message.trim();
  if (code === "409") return { kind: "taken", message: "That time was just taken. Pick another." };
  if ((code === "400" || code === "422") && text && text.length <= 200) return { kind: "other", message: text };
  if (code === "401") return { kind: "other", message: "Please sign in again." };
  return { kind: "other", message: "We couldn't tell whether the booking moved. Close this to check the time, then try again if needed." };
}

/** Finished or called off: offer to book the same service again. */
export const canBookAgain = (status: string) => status === "completed" || status === "cancelled" || status === "declined";

/** What an empty list says. With filters on, the filters are the likely reason. */
export function myBookingsEmpty(tab: MyBookingTab, filtered: boolean): { title: string; text: string } {
  return filtered ? { title: "No bookings match", text: "Try a different search or clear the filters." } : EMPTY_TEXT[tab];
}

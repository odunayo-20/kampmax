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

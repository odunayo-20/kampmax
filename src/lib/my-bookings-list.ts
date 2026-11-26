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

/** What an empty list says. With filters on, the filters are the likely reason. */
export function myBookingsEmpty(tab: MyBookingTab, filtered: boolean): { title: string; text: string } {
  return filtered ? { title: "No bookings match", text: "Try a different search or clear the filters." } : EMPTY_TEXT[tab];
}

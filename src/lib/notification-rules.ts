/**
 * Where a notification opens, what the empty list says and how a failure reads. The mobile app's lib/notifications.ts
 * says the same things. Pure rules: no screens, no network.
 */

/** A path segment the server gave us: only letters, digits, dash and underscore are put into a web address. */
const SEGMENT = /^[A-Za-z0-9_-]{1,120}$/;
const segment = (v: unknown): string | null => (typeof v === "string" && SEGMENT.test(v) ? v : null);

/**
 * The page a notification opens, from what the server attached to it. The server's own `link` wins (booking, store
 * update and product question notices carry one); otherwise the ids it attached say where to go. Null when
 * there is nowhere sensible to go.
 */
export function actionUrlFor(data: Record<string, unknown> | null): string | undefined {
  if (!data) return undefined;
  if (typeof data.link === "string") return data.link;
  const id = (key: string) => segment(data[key]);
  if (id("orderId")) return `/orders/${id("orderId")}`;
  if (id("ticketId")) return `/tickets/${id("ticketId")}`;
  if (id("eventId")) return `/events/${id("eventId")}`;
  if (id("conversationId")) return `/chat/${id("conversationId")}`;
  // A contract opens on the employer's or the freelancer's side; the page works out which.
  if (id("engagementId")) return `/contracts/${id("engagementId")}`;
  if (id("postId")) return `/community/${id("postId")}`;
  if (id("jobId")) return `/jobs/${id("jobId")}`;
  if (data.kind === "referral-credit") return "/profile/wallet";
  return housingUrl(data);
}

/**
 * Housing notices. An enquiry notice reaches an agent or a student, so it opens a small page that looks at which
 * side the person is on. Listing and payment notices go to the agent.
 */
function housingUrl(data: Record<string, unknown>): string | undefined {
  const kind = typeof data.kind === "string" ? data.kind : "";
  if (!kind.startsWith("accommodation_")) return undefined;
  if (kind === "accommodation_enquiry") {
    const id = segment(data.enquiryId);
    return id ? `/accommodation/enquiry/${id}` : undefined;
  }
  if (kind === "accommodation_agent") return "/agent";
  if (kind === "accommodation_subscription" || kind === "accommodation_package" || kind === "accommodation_payment") return "/agent/billing";
  if (kind === "accommodation_listing") return "/agent/listings";
  return undefined;
}

/** What the empty list says. */
export const emptyNotificationsCopy = (filtered: boolean): { title: string; text: string } =>
  filtered
    ? { title: "No notifications in this category", text: "You're all caught up. Check back later for new updates." }
    : { title: "You're all caught up", text: "Updates about your orders, payments and more will appear here." };

/** "Mark all 3 as read". */
export const markAllLabel = (unread: number): string => `Mark all ${unread} as read`;

/** What to show when marking or deleting fails. The server's own words are never shown. */
export const NOTIFICATION_ACTION_ERROR = "Couldn't update your notifications. Check your connection and try again.";

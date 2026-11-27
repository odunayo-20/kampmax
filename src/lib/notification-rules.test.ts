import { describe, expect, it } from "vitest";
import { actionUrlFor, emptyNotificationsCopy, markAllLabel } from "./notification-rules";

describe("notification rules", () => {
  it("follows the server's own link first", () => {
    expect(actionUrlFor({ link: "/customer/bookings/b1", bookingId: "b1" })).toBe("/customer/bookings/b1");
    expect(actionUrlFor(null)).toBeUndefined();
  });

  it("opens messages, contracts, posts, jobs, orders, tickets and events from their ids", () => {
    expect(actionUrlFor({ orderId: "o1" })).toBe("/orders/o1");
    expect(actionUrlFor({ ticketId: "t1" })).toBe("/tickets/t1");
    expect(actionUrlFor({ eventId: "e1" })).toBe("/events/e1");
    expect(actionUrlFor({ conversationId: "c1" })).toBe("/chat/c1");
    expect(actionUrlFor({ engagementId: "g1" })).toBe("/contracts/g1");
    expect(actionUrlFor({ postId: "p1" })).toBe("/community/p1");
    expect(actionUrlFor({ jobId: "j1" })).toBe("/jobs/j1");
    expect(actionUrlFor({ kind: "referral-credit", amount: 500 })).toBe("/profile/wallet");
  });

  it("sends housing notices to the right side", () => {
    expect(actionUrlFor({ kind: "accommodation_enquiry", enquiryId: "q1" })).toBe("/accommodation/enquiry/q1");
    expect(actionUrlFor({ kind: "accommodation_enquiry" })).toBeUndefined();
    expect(actionUrlFor({ kind: "accommodation_agent" })).toBe("/agent");
    expect(actionUrlFor({ kind: "accommodation_payment" })).toBe("/agent/billing");
    expect(actionUrlFor({ kind: "accommodation_listing", listingId: "l1" })).toBe("/agent/listings");
    expect(actionUrlFor({ kind: "accommodation_report" })).toBeUndefined();
  });

  it("never puts anything but a plain id in a web address", () => {
    expect(actionUrlFor({ orderId: "../admin" })).toBeUndefined();
    expect(actionUrlFor({ conversationId: "a/b" })).toBeUndefined();
    expect(actionUrlFor({ postId: 42 })).toBeUndefined();
  });

  it("words the empty list and the mark-all button", () => {
    expect(emptyNotificationsCopy(true).title).toMatch(/in this category/);
    expect(emptyNotificationsCopy(false).title).toBe("You're all caught up");
    expect(markAllLabel(3)).toBe("Mark all 3 as read");
  });
});

import { describe, expect, it } from "vitest";
import { replyTimeText } from "@/lib/reading";
import {
  interestLine,
  listingInterest,
  readAgentOverview,
  replyChips,
} from "@/services/accommodation-overview";

describe("readAgentOverview", () => {
  it("reads a full dashboard", () => {
    const o = readAgentOverview({
      nextRenewal: { listingId: "l1", title: "Room A", expiresAt: "2026-12-01T00:00:00Z", amount: "2000", autoRenew: true },
      needsConfirming: { count: 1, hideBy: "2026-11-20T00:00:00Z", listings: [{ id: "l1", title: "Room A" }, { id: "", title: "x" }, null] },
      reply: { received: 10, answeredRate: 80, typicalReplyHours: 3 },
      interest: { views: "40", saves: 6 },
      topListings: [{ listingId: "l1", title: "Room A", views: 25, saves: 4, enquiries: 3 }, { title: "no id" }],
    });
    expect(o.nextRenewal).toEqual({ listingId: "l1", title: "Room A", expiresAt: "2026-12-01T00:00:00Z", amount: 2000, autoRenew: true });
    expect(o.needsConfirming).toEqual({ count: 1, hideBy: "2026-11-20T00:00:00Z", listings: [{ id: "l1", title: "Room A" }] });
    expect(o.reply).toEqual({ received: 10, answeredRate: 80, typicalReplyHours: 3 });
    expect(o.interest).toEqual({ views: 40, saves: 6 });
    expect(o.topListings).toHaveLength(1);
  });

  it("reads nothing, or nonsense, as empty rather than crashing", () => {
    for (const raw of [undefined, null, "oops", []]) {
      const o = readAgentOverview(raw);
      expect(o.nextRenewal).toBeNull();
      expect(o.needsConfirming).toEqual({ count: 0, hideBy: null, listings: [] });
      expect(o.reply).toEqual({ received: 0, answeredRate: null, typicalReplyHours: null });
      expect(o.interest).toEqual({ views: 0, saves: 0 });
      expect(o.topListings).toEqual([]);
    }
  });
});

describe("how students see an agent", () => {
  it("words reply times like a person would", () => {
    expect(replyTimeText(0)).toBe("within an hour");
    expect(replyTimeText(5)).toBe("within 5 hours");
    expect(replyTimeText(24)).toBe("in about 1 day");
    expect(replyTimeText(60)).toBe("in about 3 days");
  });

  it("shows only facts with enough behind them", () => {
    expect(replyChips({ received: 10, answeredRate: 80, typicalReplyHours: 3 })).toEqual(["Replies within 3 hours", "80% answered"]);
    expect(replyChips({ received: 10, answeredRate: 80, typicalReplyHours: null })).toEqual(["80% answered"]);
    expect(replyChips({ received: 2, answeredRate: null, typicalReplyHours: null })).toEqual([]);
    expect(replyChips(undefined)).toEqual([]);
  });

  it("reads interest as one short line", () => {
    expect(interestLine({ views: 40, saves: 6 })).toBe("40 views · 6 saves");
    expect(interestLine({ views: 1, saves: 1, enquiries: 1 })).toBe("1 view · 1 save · 1 enquiry");
  });
});

describe("listingInterest", () => {
  const stats = { views: 40, saves: 6, enquiries: 3 };

  it("says what a live listing is getting", () => {
    expect(listingInterest({ moderationStatus: "APPROVED", stats })).toBe("40 views · 6 saves · 3 enquiries");
  });

  it("says nothing about a listing nobody can see yet", () => {
    for (const moderationStatus of ["DRAFT", "PENDING_APPROVAL", "REJECTED"] as const) {
      expect(listingInterest({ moderationStatus, stats })).toBeNull();
    }
  });

  it("says nothing when the server sent no numbers", () => {
    expect(listingInterest({ moderationStatus: "APPROVED" })).toBeNull();
  });
});

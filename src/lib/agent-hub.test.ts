import { describe, expect, it } from "vitest";
import { readAgentOverview } from "@/services/accommodation-overview";
import { agentToday, listingNotices, listingsFooter, setupStep, spendFooter } from "./agent-hub";

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

describe("the agent hub", () => {
  it("picks the one thing to do now, rooms to confirm first", () => {
    const base = { inspections: { awaitingAnswer: 2, upcoming: 1 }, enquiries: { new: 3 } };
    expect(agentToday(readAgentOverview({ ...base, needsConfirming: { count: 1, listings: [{ id: "l1", title: "A" }] } }))?.kind).toBe("confirm");
    expect(agentToday(readAgentOverview(base))).toMatchObject({ kind: "visits", title: "2 visit requests waiting", href: "/agent/visits" });
    expect(agentToday(readAgentOverview({ enquiries: { new: 1 } }))?.title).toBe("1 new enquiry");
    expect(agentToday(readAgentOverview({}))).toBeNull();
  });

  it("words the money and listing cards", () => {
    expect(listingsFooter(readAgentOverview({ listings: { total: 3, pendingApproval: 2, drafts: 1 } }))).toBe("2 in review · 1 draft");
    expect(listingsFooter(readAgentOverview({}))).toBe("Add your first room");
    expect(spendFooter(readAgentOverview({ spending: { refundsPending: 5000 } }), naira)).toBe("₦5,000 being refunded");
    expect(spendFooter(readAgentOverview({}), naira)).toBe("Nothing due");
  });

  it("warns about ending listings and walks a new agent to a live room", () => {
    expect(listingNotices(readAgentOverview({ listings: { expiringSoon: 2 } }))[0].title).toBe("2 listings ending within 7 days");
    expect(setupStep(readAgentOverview({}))?.title).toBe("Add your first property");
    expect(setupStep(readAgentOverview({ properties: 1 }))).toMatchObject({ title: "List your first room", progress: "1 of 3 done" });
    expect(setupStep(readAgentOverview({ properties: 1, listings: { total: 1, active: 1 } }))).toBeNull();
  });
});

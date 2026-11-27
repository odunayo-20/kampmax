import { describe, expect, it } from "vitest";
import {
  availableFooter,
  moneyText,
  onTheWayFooter,
  providerNextStep,
  requestsCallout,
  setupSteps,
  todayLine,
  verificationNotice,
  type ProviderMoney,
  type ProviderStats,
} from "./provider-hub";

const money: ProviderMoney = { onTheWay: 12000, onTheWayCount: 2, awaitingAnswer: 5000, earnedTotal: 90000, earnedThisMonth: 30000 };
const stats = (over: Partial<ProviderStats> = {}): ProviderStats => ({
  pending: 0, upcomingToday: 0, upcoming: 0, inProgress: 0, completed: 0, cancelled: 0, ...over,
});

describe("provider hub", () => {
  it("says what is clearing, earned or on its way", () => {
    expect(availableFooter(4000, money)).toBe("₦4,000 still clearing");
    expect(availableFooter(0, money)).toBe("₦30,000 earned this month");
    expect(availableFooter(undefined, { ...money, earnedThisMonth: 0 })).toBe("₦90,000 earned so far");
    expect(availableFooter(undefined, undefined)).toBe("Your earnings land here");
    expect(onTheWayFooter(money)).toBe("2 jobs to be confirmed");
    expect(onTheWayFooter({ ...money, onTheWayCount: 1 })).toBe("1 job to be confirmed");
    expect(onTheWayFooter(undefined)).toBe("Paid out after each job");
    expect(moneyText(undefined)).toBe("–");
    expect(moneyText(0)).toBe("₦0");
  });

  it("calls out requests with what is held for them", () => {
    expect(requestsCallout(0, 5000)).toBeNull();
    expect(requestsCallout(2, 5000)).toEqual({ title: "2 requests waiting for you", text: "₦5,000 is held for you. Answer to lock it in." });
    expect(requestsCallout(1, 0)).toEqual({ title: "1 request waiting for you", text: "Customers are waiting for an answer." });
  });

  it("describes the day and the next job", () => {
    expect(todayLine(undefined, null)).toBeNull();
    expect(todayLine(stats(), null)).toEqual({ title: "No jobs coming up", detail: "Customers book you from your page" });
    const line = todayLine(stats({ upcomingToday: 2, upcoming: 3 }), { serviceName: "Braids", startAt: "2026-11-27T09:00:00Z", customer: { name: "Ada Obi" } });
    expect(line?.title).toBe("2 jobs today");
    expect(line?.detail).toMatch(/^Next: 10:00 AM · Braids, Ada$/);
    expect(todayLine(stats({ inProgress: 1 }), null)?.title).toBe("1 job in progress");
    expect(todayLine(stats({ upcoming: 1 }), null)?.title).toBe("Nothing more today");
  });

  it("offers one next step, and none once everything is done", () => {
    const fresh = setupSteps({ hasPicture: false, services: 0, liveServices: 0, hours: 0, portfolio: 0 });
    expect(providerNextStep(fresh)).toMatchObject({ progress: "0 of 4 done", title: "Add your first service", href: "/service-provider/services/new" });
    const paused = setupSteps({ hasPicture: true, services: 2, liveServices: 0, hours: 3, portfolio: 1 });
    expect(providerNextStep(paused)).toMatchObject({ progress: "3 of 4 done", title: "Make a service live", href: "/service-provider/services" });
    expect(providerNextStep(setupSteps({ hasPicture: true, services: 1, liveServices: 1, hours: 1, portfolio: 1 }))).toBeNull();
  });

  it("shows a verification notice only while it matters", () => {
    expect(verificationNotice("VERIFIED")).toBeNull();
    expect(verificationNotice("PENDING")).toMatchObject({ title: "Awaiting verification", blocked: false });
    expect(verificationNotice("SUSPENDED")).toMatchObject({ blocked: true });
    expect(verificationNotice("DEACTIVATED")).toMatchObject({ title: "Deactivated", blocked: true });
    expect(verificationNotice(undefined)?.blocked).toBe(false);
  });
});

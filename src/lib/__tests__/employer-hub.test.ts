import { describe, expect, it } from "vitest";
import { closesSoonText, heldInEscrow, nextProfileStep, todayLine, watchFrom } from "../employer-hub";

const now = new Date("2026-11-28T10:00:00Z");
const contract = (status: string, amount: number) =>
  ({ status, currentMilestonePosition: 1, milestones: [{ position: 1, amount }] }) as never;

describe("employer hub rules", () => {
  it("adds up the current step of each funded contract, and nothing waiting to be funded", () => {
    expect(heldInEscrow([contract("FUNDED", 10000), contract("SUBMITTED", 2500.5), contract("PENDING_PAYMENT", 9000), contract("COMPLETED", 1)])).toEqual({ total: 12500.5, count: 2 });
  });

  it("names the posting with people waiting first, then one about to close", () => {
    const watch = watchFrom([
      { jobId: "a", title: "Logo", opportunityType: "GIG", expiresAt: "2026-12-30T00:00:00Z", newCount: 0 },
      { jobId: "b", title: "Social media intern", opportunityType: "INTERNSHIP", expiresAt: "2026-11-30T09:00:00Z", newCount: 3 },
      { title: "broken" },
    ]);
    expect(watch).toHaveLength(2);
    expect(todayLine(watch, now)?.text).toBe("3 new applicants on Social media intern, closes in 2 days");
    expect(todayLine([{ ...watch[0], expiresAt: "2026-11-29T09:00:00Z" }], now)?.text).toBe("Logo closes tomorrow");
    expect(todayLine([watch[0]], now)).toBeNull();
    expect(closesSoonText(null, now)).toBeNull();
  });

  it("offers one profile step at a time, and nothing once it is complete", () => {
    expect(nextProfileStep({ displayName: "Ada" })).toEqual({ title: "A one-line headline", detail: 'For example "Founder of a campus snack brand".', progress: "1 of 7 done" });
    const full = { displayName: "Ada", headline: "Founder", about: "We sell snacks", industry: "Food", city: "Akure", email: "a@b.co", phone: "0803", categories: 1 };
    expect(nextProfileStep(full)).toBeNull();
    expect(nextProfileStep({ ...full, organization: { name: "Snacks Ltd" } })?.title).toBe("Your organization");
  });
});

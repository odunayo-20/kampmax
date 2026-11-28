import { describe, expect, it } from "vitest";
import { freelancerCallouts, freelancerNextStep, heldFooter, jobPipeline, verificationState } from "../freelancer-hub";
import { latestPaymentLine } from "../hub-common";

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const c = (status: string) => ({ status, paymentType: "FIXED" }) as never;

describe("freelancer hub rules", () => {
  it("counts the freelancer's moves, work with the client, and paid jobs", () => {
    expect(jobPipeline([c("IN_PROGRESS"), c("REVISION_REQUESTED"), c("SUBMITTED"), c("FUNDED"), c("COMPLETED")])).toEqual({ toDo: 2, withClient: 1, paid: 1 });
    expect(heldFooter({ count: 0 })).toBe("Nothing held right now");
    expect(heldFooter({ count: 2 })).toBe("2 jobs in progress");
  });

  it("says what needs the freelancer now, and nothing when nothing does", () => {
    const none = { toDo: 0, proposalsWon: 0, unavailable: false, verification: "unverified" as const };
    expect(freelancerCallouts(none)).toEqual([]);
    expect(freelancerCallouts({ ...none, toDo: 1, proposalsWon: 2, verification: "rejected" }).map((x) => x.title)).toEqual([
      "1 contract waiting for you",
      "Employers accepted 2 proposals",
      "Your verification was not approved",
    ]);
    expect(verificationState("PENDING_REVIEW")).toBe("pending");
    expect(verificationState(undefined)).toBe("unverified");
  });

  it("offers one profile step, then the latest payment reads plainly", () => {
    const empty = { skills: 0, experience: 0, education: 0, certifications: 0, portfolio: 0 };
    expect(freelancerNextStep(empty)).toEqual({ title: "A headline", detail: "One line that says what you do.", href: "/freelancer/profile", progress: "0 of 8 done" });
    expect(freelancerNextStep({ headline: "Designer", bio: "I design logos for campus brands.", skills: 2, experience: 1, education: 1, certifications: 1, portfolio: 0 })?.href).toBe("/freelancer/portfolio");
    expect(latestPaymentLine([{ status: "pending", direction: "credit", amount: 1, description: "x" }, { status: "completed", direction: "credit", amount: 12000, description: "Payment for Logo" }], naira)).toBe("Received ₦12,000 · Payment for Logo");
    expect(latestPaymentLine([], naira)).toBeNull();
  });
});

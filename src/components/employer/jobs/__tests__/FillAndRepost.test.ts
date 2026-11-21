import { describe, expect, it } from "vitest";
import type { Opportunity } from "@/types/opportunity";
import { canFill, canPostAgain } from "@/components/employer/jobs/EmployerJobActions";
import { fillText, waitingOn } from "@/components/employer/jobs/FillJobDialog";
import { opportunityToInput, repostInput } from "@/components/employer/jobs/JobForm";

const job = (over: Partial<Opportunity> = {}): Opportunity =>
  ({
    id: "j1",
    title: "Barista",
    status: "open",
    opportunityType: "part_time",
    categoryId: "c1",
    summary: "Make coffee",
    description: "Make good coffee on campus.",
    requirements: "Be on time.",
    skills: ["Coffee"],
    workArrangement: "onsite",
    location: { city: "Yaba", state: "Lagos", campusId: "", remote: false },
    budget: { type: "project", currency: "NGN" },
    duration: "few_weeks",
    experienceLevel: "entry_level",
    deadline: "2020-01-01T23:59:59.000Z",
    hiring: { isPaid: true, openings: 1, eligibility: "", offersCertificate: false, startDate: "2020-02-01" },
    screeningQuestions: [],
    attachments: [],
    ...over,
  }) as unknown as Opportunity;

describe("mark as filled and post again", () => {
  it("lets an open or lapsed vacancy be marked filled, never a gig or a closed job", () => {
    expect(canFill(job())).toBe(true);
    expect(canFill(job({ status: "expired" }))).toBe(true);
    expect(canFill(job({ status: "closed" }))).toBe(false);
    expect(canFill(job({ status: "draft" }))).toBe(false);
    expect(canFill(job({ opportunityType: "gig" }))).toBe(false);
  });

  it("lets an ended job be posted again, and nothing else", () => {
    expect(canPostAgain(job({ status: "closed" }))).toBe(true);
    expect(canPostAgain(job({ status: "expired" }))).toBe(true);
    expect(canPostAgain(job({ status: "open" }))).toBe(false);
    expect(canPostAgain(job({ status: "draft" }))).toBe(false);
  });

  it("counts everyone still waiting: new, seen, shortlisted and interviewing", () => {
    expect(waitingOn(undefined)).toBe(0);
    expect(waitingOn({ SUBMITTED: 2, VIEWED: 1, SHORTLISTED: 1, INTERVIEWING: 1, HIRED: 4, REJECTED: 3 })).toBe(5);
  });

  it("says plainly who is waiting", () => {
    expect(fillText(0)).toMatch(/Nobody is waiting/);
    expect(fillText(1)).toMatch(/1 person is still waiting/);
    expect(fillText(4)).toMatch(/4 people are still waiting/);
  });

  it("posts again with what was written but not the dates that have passed", () => {
    const again = repostInput(job());
    expect(again.title).toBe("Barista");
    expect(again.deadline).toBe("");
    expect(again.hiring?.startDate).toBeUndefined();
    expect(again.skills).toEqual(["Coffee"]);
    // Edited in place, the same job would keep its stale dates.
    expect(opportunityToInput(job()).deadline).toBe("2020-01-01");
  });
});

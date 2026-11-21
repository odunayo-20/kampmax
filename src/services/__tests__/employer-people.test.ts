import { describe, expect, it } from "vitest";
import {
  EMPTY_COUNTS,
  countsFrom,
  defaultStage,
  offerLine,
  personActions,
  personFrom,
  reviewHref,
} from "@/services/employer-people";

const raw = (over: Record<string, unknown> = {}) => ({
  kind: "APPLICATION",
  id: "a1",
  jobId: "j1",
  jobTitle: "Barista",
  opportunityType: "PART_TIME",
  stage: "NEW",
  status: "SUBMITTED",
  person: { id: "u1", name: "Tolu Bello", avatar: null },
  cvLabel: "My CV",
  amount: null,
  currency: null,
  sentAt: "2026-11-18T10:00:00Z",
  ...over,
});

describe("personFrom", () => {
  it("reads a person and drops a broken row", () => {
    expect(personFrom(raw())?.person.name).toBe("Tolu Bello");
    expect(personFrom(null)).toBeNull();
    expect(personFrom(raw({ id: "" }))).toBeNull();
    expect(personFrom(raw({ jobId: undefined }))).toBeNull();
  });

  it("reads an unknown stage as new and a missing name as Candidate", () => {
    const p = personFrom(raw({ stage: "WEIRD", person: { id: "u", name: "  " } }));
    expect(p?.stage).toBe("NEW");
    expect(p?.person.name).toBe("Candidate");
  });
});

describe("counts and stages", () => {
  it("reads missing and odd counts as zero", () => {
    expect(countsFrom(undefined)).toEqual(EMPTY_COUNTS);
    expect(countsFrom({ ALL: 5, NEW: 3, HIRED: -1, SHORTLISTED: "x" })).toEqual({
      ALL: 5,
      NEW: 3,
      SHORTLISTED: 0,
      INTERVIEWING: 0,
      HIRED: 0,
      DECLINED: 0,
    });
  });

  it("opens on whoever needs a look, then whoever is furthest along", () => {
    expect(defaultStage({ ...EMPTY_COUNTS, NEW: 2, SHORTLISTED: 1 })).toBe("NEW");
    expect(defaultStage({ ...EMPTY_COUNTS, INTERVIEWING: 2, HIRED: 1 })).toBe("INTERVIEWING");
    expect(defaultStage(EMPTY_COUNTS)).toBe("NEW");
  });
});

describe("what can be done in the list", () => {
  it("lets an applicant be interviewed but not a proposal", () => {
    expect(personActions({ kind: "APPLICATION", stage: "NEW" })).toEqual(["shortlist", "interview", "decline"]);
    expect(personActions({ kind: "PROPOSAL", stage: "NEW" })).toEqual(["shortlist", "decline"]);
    expect(personActions({ kind: "PROPOSAL", stage: "SHORTLISTED" })).toEqual(["decline"]);
    expect(personActions({ kind: "APPLICATION", stage: "INTERVIEWING" })).toEqual(["decline"]);
  });

  it("offers nothing once a decision is final, and never hiring or accepting", () => {
    for (const kind of ["APPLICATION", "PROPOSAL"] as const) {
      expect(personActions({ kind, stage: "HIRED" })).toEqual([]);
      expect(personActions({ kind, stage: "DECLINED" })).toEqual([]);
    }
  });

  it("opens the right screen for each kind", () => {
    expect(reviewHref({ kind: "APPLICATION", id: "a1", jobId: "j1" })).toBe("/employer/jobs/j1/applications");
    expect(reviewHref({ kind: "PROPOSAL", id: "p1", jobId: "j2" })).toBe("/employer/applications/p1");
  });

  it("shows a CV, a naira quote or a quote in another currency", () => {
    const n = (v: number) => `N${v}`;
    expect(offerLine({ cvLabel: "My CV", amount: null, currency: null }, n)).toBe("CV: My CV");
    expect(offerLine({ cvLabel: null, amount: 25000, currency: "NGN" }, n)).toBe("N25000");
    expect(offerLine({ cvLabel: null, amount: 40, currency: "USD" }, n)).toBe("40 USD");
  });
});

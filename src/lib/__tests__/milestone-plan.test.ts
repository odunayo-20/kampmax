import { describe, expect, it } from "vitest";
import {
  MAX_MILESTONES,
  finishedMilestones,
  planRemaining,
  planTotal,
  rowsFromMilestones,
  toProposalMilestones,
  todayISO,
  validatePlan,
  type MilestoneRow,
} from "../milestone-plan";

const row = (title: string, amount: string, description = "", dueDate = ""): MilestoneRow => ({
  title,
  description,
  amount,
  dueDate,
});

describe("planTotal / planRemaining", () => {
  it("adds amounts exactly, in whole kobo", () => {
    // 100.10 * 3 is 300.29999999999995 as floating point.
    const rows = [row("One", "100.10"), row("Two", "100.10"), row("Three", "100.10")];
    expect(planTotal(rows)).toBe(300.3);
    expect(planRemaining(rows, 300.3)).toBe(0);
    expect(planRemaining(rows, 300.31)).toBe(0.01);
  });

  it("ignores rows that have no usable amount yet", () => {
    expect(planTotal([row("One", "5000"), row("Two", ""), row("Three", "abc")])).toBe(5000);
  });

  it("goes negative when the plan is over", () => {
    expect(planRemaining([row("One", "6000"), row("Two", "6000")], 10000)).toBe(-2000);
  });
});

describe("validatePlan", () => {
  it("has nothing to say about no plan: that means one payment", () => {
    expect(validatePlan([], 250000)).toBeNull();
  });

  it("accepts a plan that adds up", () => {
    expect(validatePlan([row("Design", "100000"), row("Build", "150000")], 250000)).toBeNull();
  });

  it("says how much is left to assign, or how far over the plan is", () => {
    expect(validatePlan([row("Design", "100000"), row("Build", "100000")], 250000)?.plan).toMatch(
      /₦50,000 of ₦250,000 is not assigned/
    );
    expect(validatePlan([row("Design", "200000"), row("Build", "100000")], 250000)?.plan).toMatch(
      /₦50,000 over ₦250,000/
    );
  });

  it("points at the milestone that is incomplete", () => {
    const errors = validatePlan([row("Design", "100000"), row("  ", ""), row("Launch", "50")], 250000);
    expect(errors?.rows[0]).toBeUndefined();
    expect(errors?.rows[1]).toEqual({ title: "Give this milestone a title.", amount: "Enter an amount." });
    expect(errors?.rows[2]).toEqual({ amount: "At least ₦100." });
  });

  it("asks for at least two milestones", () => {
    expect(validatePlan([row("Everything", "250000")], 250000)?.plan).toMatch(/at least 2 milestones/);
  });

  it("limits how many milestones there can be", () => {
    const many = Array.from({ length: MAX_MILESTONES + 1 }, (_, i) => row(`Step ${i + 1}`, "1000"));
    expect(validatePlan(many, 11000)?.plan).toMatch(/at most 10/);
  });

  it("does not compare with the total until every milestone is itself valid", () => {
    // One missing amount: say that, not "not assigned".
    const errors = validatePlan([row("Design", "100000"), row("Build", "")], 250000);
    expect(errors?.plan).toBeUndefined();
    expect(errors?.rows[1]?.amount).toBe("Enter an amount.");
  });

  it("cannot judge the total when none has been entered yet", () => {
    expect(validatePlan([row("Design", "1000"), row("Build", "1000")], undefined)).toBeNull();
  });
});

describe("due dates", () => {
  const TODAY = "2026-11-03";
  const plan = (...dates: string[]) => dates.map((d, i) => row("Step " + (i + 1), "1000", "", d));

  it("is today's date on this device, as YYYY-MM-DD", () => {
    expect(todayISO(new Date(2026, 10, 3, 23, 59))).toBe("2026-11-03");
    expect(todayISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("accepts today or later, in order, and steps without a date", () => {
    expect(validatePlan(plan("2026-11-03", "", "2026-12-01"), 3000, TODAY)).toBeNull();
    expect(validatePlan(plan("", ""), 2000, TODAY)).toBeNull();
  });

  it("refuses a date that has already passed", () => {
    expect(validatePlan(plan("2026-11-02", ""), 2000, TODAY)?.rows[0]).toEqual({
      dueDate: "Pick today or a later date.",
    });
  });

  it("refuses a date before the milestone above it, and says which", () => {
    expect(validatePlan(plan("2026-12-10", "2026-12-01"), 2000, TODAY)?.rows[1]).toEqual({
      dueDate: "Can't be before milestone 1's date.",
    });
  });

  it("compares with the nearest earlier date even when a step in between has none", () => {
    expect(validatePlan(plan("2026-12-10", "", "2026-12-01"), 3000, TODAY)?.rows[2]?.dueDate).toMatch(
      /before milestone 1/
    );
  });

  it("refuses a date it cannot read", () => {
    expect(validatePlan(plan("2026-1-3", ""), 2000, TODAY)?.rows[0]?.dueDate).toBe("Pick a valid date.");
  });

  it("sends the date with the plan, and restores it into the form", () => {
    expect(toProposalMilestones([row("Design", "1000", "", "2026-12-01"), row("Build", "1000")])).toEqual([
      { title: "Design", description: undefined, amount: 1000, dueDate: "2026-12-01" },
      { title: "Build", description: undefined, amount: 1000, dueDate: undefined },
    ]);
    expect(rowsFromMilestones([{ title: "Design", amount: 1000, dueDate: "2026-12-01" }])[0].dueDate).toBe("2026-12-01");
  });

  it("leaves an unreadable date out of a draft rather than failing the whole save", () => {
    expect(
      finishedMilestones([row("Design", "1000", "", "2026-12-01"), row("Build", "1000", "", "2026-1-3")]).map(
        (m) => m.dueDate
      )
    ).toEqual(["2026-12-01", undefined]);
  });
});

describe("finishedMilestones (saving a draft)", () => {
  it("sends only the rows that are finished, because the backend validates every one it receives", () => {
    expect(
      finishedMilestones([
        row("Design", "100000"),
        row("", "5000"), // no title yet
        row("Build", ""), // no amount yet
        row("Tiny", "50"), // below the minimum
        row("Launch", "50000", " Go live "),
      ])
    ).toEqual([
      { title: "Design", description: undefined, amount: 100000 },
      { title: "Launch", description: "Go live", amount: 50000 },
    ]);
  });

  it("sends nothing for a plan that has only just been switched on", () => {
    expect(finishedMilestones([row("", ""), row("", "")])).toEqual([]);
  });
});

describe("converting", () => {
  it("builds the API plan, trimming text and dropping blank descriptions", () => {
    expect(
      toProposalMilestones([row(" Design ", "100000", "  Mockups "), row("Build", "150000.50")])
    ).toEqual([
      { title: "Design", description: "Mockups", amount: 100000 },
      { title: "Build", description: undefined, amount: 150000.5 },
    ]);
  });

  it("restores a saved plan into editable rows", () => {
    expect(rowsFromMilestones([{ title: "Design", amount: 100000 }, { title: "Build", description: "App", amount: 150000.5 }])).toEqual([
      { title: "Design", description: "", amount: "100000", dueDate: "" },
      { title: "Build", description: "App", amount: "150000.5", dueDate: "" },
    ]);
    expect(rowsFromMilestones(undefined)).toEqual([]);
  });
});

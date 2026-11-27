import { describe, expect, it } from "vitest";
import { describeProfileSaveError, nameProblem, validateProfile, yearsProblem } from "./provider-profile";

describe("provider profile", () => {
  it("needs a name of 2 to 150 characters, and years are optional whole numbers up to 60", () => {
    expect(nameProblem(" a ")).toMatch(/at least 2/);
    expect(nameProblem("Ada")).toBeNull();
    expect(nameProblem("x".repeat(151))).toMatch(/under 150/);
    expect(yearsProblem("")).toBeNull();
    expect(yearsProblem("4")).toBeNull();
    expect(yearsProblem("4.5")).toBe("Enter a whole number of years.");
    expect(yearsProblem("61")).toBe("Enter 60 years or fewer.");
  });

  it("names each problem in the form", () => {
    expect(validateProfile({ displayName: "Ada Cleaning", years: "3" })).toEqual({});
    expect(Object.keys(validateProfile({ displayName: "", years: "x" })).sort()).toEqual(["displayName", "years"]);
  });

  it("shows a server reason only for a rule it enforces", () => {
    expect(describeProfileSaveError("That name is taken.", 409)).toBe("That name is taken.");
    expect(describeProfileSaveError("displayName must be longer than or equal to 2 characters", 400)).toMatch(/Couldn't save your profile/);
    expect(describeProfileSaveError("x", 401)).toBe("Please sign in again.");
  });
});

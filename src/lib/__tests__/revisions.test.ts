import { describe, expect, it } from "vitest";
import {
  REVISION_KINDS,
  REVISIONS_SUPPORT_HREF,
  defaultRevisionKind,
  revisionsLeftLabel,
  revisionsUsedLabel,
} from "../revisions";

describe("revisions wording", () => {
  it("says how many are used, from the numbers the backend sent", () => {
    expect(revisionsUsedLabel({ used: 2, allowed: 3 })).toBe("2 of 3 revisions used");
    expect(revisionsUsedLabel({ used: 0, allowed: 3 })).toBe("0 of 3 revisions used");
    expect(revisionsUsedLabel({ used: 1, allowed: 1 })).toBe("1 of 1 revision used");
  });

  it("says how many are left, or that none are", () => {
    expect(revisionsLeftLabel({ remaining: 2 })).toBe("2 left");
    expect(revisionsLeftLabel({ remaining: 0 })).toBe("none left");
  });

  it("starts the request form on an ordinary change while there are revisions, and a mistake report when there are none", () => {
    expect(defaultRevisionKind({ remaining: 3 })).toBe("CHANGES");
    expect(defaultRevisionKind({ remaining: 1 })).toBe("CHANGES");
    expect(defaultRevisionKind({ remaining: 0 })).toBe("FIX");
  });

  it("explains what each kind does to the revision count", () => {
    expect(REVISION_KINDS.CHANGES.help({ allowed: 3, remaining: 2 })).toContain("uses 1 of your 2 remaining revisions");
    expect(REVISION_KINDS.CHANGES.help({ allowed: 3, remaining: 1 })).toContain("1 remaining revision.");
    expect(REVISION_KINDS.CHANGES.help({ allowed: 3, remaining: 0 })).toContain("used all 3 revisions");
    expect(REVISION_KINDS.FIX.help({ allowed: 3, remaining: 0 })).toContain("doesn't use a revision");
    expect(REVISION_KINDS.NEW_SCOPE.help({ allowed: 3, remaining: 3 })).toContain("isn't a revision");
  });

  it("tags each request in the history by whether it counted", () => {
    expect(REVISION_KINDS.CHANGES.tag).toContain("used a revision");
    expect(REVISION_KINDS.FIX.tag).toContain("no revision used");
    expect(REVISION_KINDS.NEW_SCOPE.tag).toContain("not a revision");
  });

  it("points support at a fixed subject, never at anything a person typed", () => {
    expect(REVISIONS_SUPPORT_HREF).toBe("/support/new?subject=Help%20with%20a%20delivery");
  });
});

import { describe, expect, it } from "vitest";
import { defaultProposalGroup, groupFromParams, proposalGroup } from "../proposal-groups";

describe("proposal groups", () => {
  it("puts each status in one plain group", () => {
    expect(proposalGroup("shortlisted")).toBe("waiting");
    expect(proposalGroup("accepted")).toBe("won");
    expect(proposalGroup("draft")).toBe("drafts");
    expect(proposalGroup("withdrawn")).toBe("closed");
  });

  it("opens on what needs attention, and reads old and new links", () => {
    expect(defaultProposalGroup(["draft", "rejected"])).toBe("drafts");
    expect(defaultProposalGroup(["draft", "submitted"])).toBe("waiting");
    expect(groupFromParams(new URLSearchParams("status=draft"))).toBe("drafts");
    expect(groupFromParams(new URLSearchParams("tab=won"))).toBe("won");
    expect(groupFromParams(new URLSearchParams(""))).toBeNull();
  });
});

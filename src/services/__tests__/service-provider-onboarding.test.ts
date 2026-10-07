import { describe, expect, it } from "vitest";
import { withoutInlineImages } from "../onboarding-draft";
import { newSpDraft, spDraftFromSaved, spDraftToSaved } from "../service-provider-onboarding";

describe("service provider wizard draft", () => {
  it("starts blank, editable, with a working week and no documents", () => {
    const { draft, completedSteps } = spDraftFromSaved("u1", null);
    expect(draft).toMatchObject({ userId: "u1", currentStep: 1, status: "IN_PROGRESS" });
    expect(draft.availability.days).toHaveLength(7);
    expect(draft.availability.days?.[6].isAvailable).toBe(false);
    expect(draft.documents).toEqual([]);
    expect(completedSteps).toEqual([]);
  });

  it("restores what was saved, keeping defaults for anything missing", () => {
    const original = newSpDraft("u1");
    original.currentStep = 4;
    original.profile = { displayName: "Tola Cuts", logo: null, coverImage: null };
    original.category = { primaryCategoryId: "beauty", secondaryCategoryIds: [] };
    const sent = spDraftToSaved(original, [1, 2, 3]);
    const back = spDraftFromSaved("u1", { ...sent, updatedAt: "2026-10-07T10:00:00Z" });
    expect(back.draft.currentStep).toBe(4);
    expect(back.draft.profile.displayName).toBe("Tola Cuts");
    expect(back.draft.category.primaryCategoryId).toBe("beauty");
    expect(back.draft.availability.days).toHaveLength(7);
    expect(back.completedSteps).toEqual([1, 2, 3]);
  });

  it("never saves a picture held as inline data, and ignores steps that no longer exist", () => {
    const original = newSpDraft("u1");
    original.profile = { displayName: "Tola", logo: "data:image/png;base64,AAAA", coverImage: "https://cdn.example.com/c.png" };
    original.portfolio = [{ image: "data:image/png;base64,BBBB", title: "Braids", description: "", categoryId: "beauty" }];
    const sent = spDraftToSaved(original, [1, 10]);
    expect(JSON.stringify(sent)).not.toContain("data:image");
    expect(sent.data.profile.coverImage).toBe("https://cdn.example.com/c.png");
    expect(sent.data.portfolio[0]).toMatchObject({ title: "Braids", image: "" });
    expect(sent.data.completedSteps).toEqual([1]);
    // An old 10-step draft that was left on the removed verification step.
    expect(spDraftFromSaved("u1", { currentStep: 10, data: {}, updatedAt: "x" }).draft.currentStep).toBe(1);
  });

  it("blanks inline images anywhere and drops them from lists", () => {
    expect(withoutInlineImages({ a: ["data:x", "keep"], b: { c: "data:y" }, d: 3 })).toEqual({
      a: ["keep"],
      b: { c: "" },
      d: 3,
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const put = vi.fn();
const del = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...a: unknown[]) => get(...a),
    put: (...a: unknown[]) => put(...a),
    delete: (...a: unknown[]) => del(...a),
  },
}));

import { discardOnboardingDraft, loadOnboardingDraft, saveOnboardingDraft } from "../onboarding-draft";
import { employerDraftFromSaved, employerDraftToSaved, newEmployerDraft } from "../employer-onboarding";

const ok = <T>(data: T) => Promise.resolve({ data, error: null });
const fail = (message = "down") => Promise.resolve({ data: null, error: new Error(message) });

beforeEach(() => vi.clearAllMocks());

describe("onboarding draft API", () => {
  it("loads the saved draft for the role, or null when none", async () => {
    get.mockImplementation(() =>
      ok({ draft: { currentStep: 3, data: { a: 1 }, updatedAt: "2026-10-07T10:00:00Z" } })
    );
    expect(await loadOnboardingDraft("service-provider")).toMatchObject({ currentStep: 3 });
    expect(get).toHaveBeenCalledWith("/onboarding-drafts/service-provider");
    get.mockImplementation(() => ok({ draft: null }));
    expect(await loadOnboardingDraft("employer")).toBeNull();
  });

  it("throws instead of pretending when the server can't load or save", async () => {
    get.mockImplementation(() => fail("down"));
    await expect(loadOnboardingDraft("employer")).rejects.toThrow("down");
    put.mockImplementation(() => fail("nope"));
    await expect(saveOnboardingDraft("employer", { currentStep: 2, data: {} })).rejects.toThrow("nope");
  });

  it("sends the step and the form values", async () => {
    put.mockImplementation(() => ok({}));
    await saveOnboardingDraft("freelancer", { currentStep: 4, data: { x: 1 } });
    expect(put).toHaveBeenCalledWith("/onboarding-drafts/freelancer", { currentStep: 4, data: { x: 1 } });
  });

  it("reports whether clearing worked without throwing", async () => {
    del.mockImplementation(() => ok({ success: true }));
    expect(await discardOnboardingDraft("employer")).toBe(true);
    del.mockImplementation(() => fail());
    expect(await discardOnboardingDraft("employer")).toBe(false);
  });
});

describe("employer wizard draft", () => {
  it("starts blank, editable and unverified when nothing was saved", () => {
    const { draft, completedSteps } = employerDraftFromSaved("u1", null);
    expect(draft).toMatchObject({ userId: "u1", currentStep: 1, status: "IN_PROGRESS", clientType: "" });
    expect(draft.preferences.categories).toEqual([]);
    expect(completedSteps).toEqual([]);
  });

  it("restores the saved values, step and finished steps", () => {
    const original = newEmployerDraft("u1");
    original.currentStep = 3;
    original.clientType = "business";
    original.profile = { displayName: "Ada" };
    original.preferences = { categories: ["c1"] };
    const sent = employerDraftToSaved(original, [1, 2, 2]);
    expect(sent.data.completedSteps).toEqual([1, 2]);

    const back = employerDraftFromSaved("u1", { ...sent, updatedAt: "2026-10-07T10:00:00Z" });
    expect(back.draft).toMatchObject({ currentStep: 3, clientType: "business", profile: { displayName: "Ada" } });
    expect(back.draft.preferences.categories).toEqual(["c1"]);
    expect(back.completedSteps).toEqual([1, 2]);
  });

  it("never sends status, verification or ids, and ignores a corrupt step", () => {
    const sent = employerDraftToSaved(newEmployerDraft("u1"), []);
    expect(Object.keys(sent.data)).not.toEqual(expect.arrayContaining(["status", "verification", "userId"]));
    const back = employerDraftFromSaved("u1", { currentStep: 99, data: { completedSteps: [0, 3, 7] }, updatedAt: "x" });
    expect(back.draft.currentStep).toBe(1);
    expect(back.completedSteps).toEqual([3]);
  });
});

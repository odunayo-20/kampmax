// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ServiceProviderOnboardingDraft } from "@/types/service-provider";
import { StepReview, isApplicationComplete } from "../StepReview";

afterEach(cleanup);

/** The smallest draft that has every required part. */
const completeDraft = {
  provider: { type: "individual", displayName: "Ada Repairs" },
  profile: { displayName: "Ada Repairs" },
  category: { primaryCategoryId: "repairs" },
  services: [
    {
      name: "Phone repair",
      description: "Screens and batteries",
      price: 5000,
      pricingModel: "fixed",
      durationMinutes: 60,
      status: "draft",
    },
  ],
  location: { primaryCampusId: "campus-1" },
  availability: { days: [{ dayIndex: 0, isAvailable: true }] },
} as unknown as ServiceProviderOnboardingDraft;

describe("isApplicationComplete", () => {
  it("is true when every required part is filled in", () => {
    expect(isApplicationComplete(completeDraft)).toBe(true);
  });

  it("is false without a draft", () => {
    expect(isApplicationComplete(null)).toBe(false);
  });

  it.each([
    ["a provider type", { provider: { displayName: "Ada Repairs" } }],
    ["a service", { services: [] }],
    ["a campus", { location: {} }],
    ["an available day", { availability: { days: [{ dayIndex: 0, isAvailable: false }] } }],
  ])("is false without %s", (_label, patch) => {
    expect(isApplicationComplete({ ...completeDraft, ...patch } as ServiceProviderOnboardingDraft)).toBe(false);
  });
});

describe("StepReview agreement", () => {
  it("asks for a single agreement and reports changes to it", () => {
    const onTermsChange = vi.fn();
    render(
      <StepReview
        draft={completeDraft}
        onEditStep={() => {}}
        termsAccepted={false}
        onTermsChange={onTermsChange}
      />
    );

    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(1);
    expect(screen.getByText(/tick the box to enable/i)).toBeTruthy();

    fireEvent.click(boxes[0]);
    expect(onTermsChange).toHaveBeenCalledWith(true);
  });

  it("shows the box as ticked, and drops the hint, once accepted", () => {
    render(
      <StepReview draft={completeDraft} onEditStep={() => {}} termsAccepted onTermsChange={() => {}} />
    );

    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByText(/tick the box to enable/i)).toBeNull();
  });

  it("leaves submitting to the layout footer, so there is only one submit button", () => {
    render(
      <StepReview draft={completeDraft} onEditStep={() => {}} termsAccepted onTermsChange={() => {}} />
    );

    expect(screen.queryByRole("button", { name: /submit application/i })).toBeNull();
  });
});

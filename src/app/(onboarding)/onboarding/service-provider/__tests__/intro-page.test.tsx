import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The client islands have their own tests; here we look at the page around them.
vi.mock("@/components/service-provider/intro/RedirectApprovedProvider", () => ({
  RedirectApprovedProvider: () => null,
}));
vi.mock("@/components/service-provider/intro/ServiceCategoryChips", () => ({
  ServiceCategoryChips: () => createElement("div", { "data-testid": "categories" }),
}));
vi.mock("@/components/service-provider/intro/StartApplicationCta", () => ({
  StartApplicationCta: () => createElement("div", { "data-testid": "cta" }),
  StickyStartApplicationBar: () => createElement("div", { "data-testid": "sticky-cta" }),
}));

import ServiceProviderIntroPage, { metadata } from "../page";
import {
  SP_ONBOARDING_STEP_LABELS,
  SP_OPTIONAL_ONBOARDING_STEPS,
} from "@/types/service-provider";

const html = renderToStaticMarkup(createElement(ServiceProviderIntroPage));

describe("service provider start page", () => {
  it("offers the call to action at the top, at the bottom and on mobile", () => {
    expect(html.match(/data-testid="cta"/g)).toHaveLength(2);
    expect(html).toContain('data-testid="sticky-cta"');
  });

  it("makes no claims the product can't back", () => {
    expect(html).not.toMatch(/thousands/i);
    expect(html).not.toMatch(/cancel anytime/i);
    // No hard-coded list of campuses.
    expect(html).not.toMatch(/RUGIPO|UNILAG|OAU/);
  });

  it("lists every onboarding step by its real name", () => {
    for (const label of Object.values(SP_ONBOARDING_STEP_LABELS)) {
      // Markup escapes "&" ("Review & Submit").
      expect(html).toContain(label.replace(/&/g, "&amp;"));
    }
  });

  it("marks the optional steps, and only those", () => {
    expect(SP_OPTIONAL_ONBOARDING_STEPS.length).toBeGreaterThan(0);
    expect(html.match(/>Optional</g)).toHaveLength(SP_OPTIONAL_ONBOARDING_STEPS.length);
    expect(html).toContain(`${9 - SP_OPTIONAL_ONBOARDING_STEPS.length} short steps`);
  });

  it("explains the money up front: the 8% fee, a worked example, and payment protection", () => {
    expect(html).toContain("8% service fee");
    // 5,000 booking -> 400 fee -> 4,600 earned.
    expect(html).toContain("₦5,000");
    expect(html).toContain("₦4,600");
    expect(html).toContain("Payment held until it&#x27;s done");
    expect(html).toContain("72 hours");
  });

  it("does not tell providers they can take bookings before they're approved", () => {
    expect(html).not.toMatch(/start taking bookings/i);
    expect(html).toContain("once you&#x27;re approved");
  });

  it("describes the provider types from the shared list", () => {
    expect(html).toContain("Individual");
    expect(html).toContain("Business");
    expect(html).toContain("Team / Agency");
  });

  it("answers the common objections", () => {
    expect(html).toContain("Do I need to upload any documents?");
    expect(html).toContain("Can I finish my application later?");
  });

  it("sets a title and a share preview", () => {
    expect(metadata.title).toBe("Become a Service Provider | Kampmax");
    expect(metadata.openGraph?.title).toBeTruthy();
    expect(metadata.description).not.toMatch(/thousands/i);
  });
});

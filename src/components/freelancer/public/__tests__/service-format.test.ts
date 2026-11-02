import { describe, expect, it } from "vitest";
import { deliveryLabel, priceText, serviceHref, serviceIdFromAddress } from "../service-format";

const ID = "4dede678-6936-4679-9e8b-6a1f9f00ac8b";

describe("service addresses", () => {
  it("joins the slug and the id, so two services with one slug stay apart", () => {
    expect(serviceHref({ id: ID, slug: "logo-design" })).toBe(`/freelancers/services/logo-design-${ID}`);
  });

  it("still works without a slug", () => {
    expect(serviceHref({ id: ID })).toBe(`/freelancers/services/${ID}`);
  });

  it("reads the id back from an address", () => {
    expect(serviceIdFromAddress(`logo-design-${ID}`)).toBe(ID);
    expect(serviceIdFromAddress(ID)).toBe(ID);
  });

  it("treats an old slug-only address as having no id", () => {
    expect(serviceIdFromAddress("logo-design")).toBeNull();
  });
});

describe("priceText", () => {
  it("shows a fixed price as is", () => {
    expect(priceText({ pricing: "fixed", price: 15000 })).toContain("15,000");
  });

  it("marks hourly and project prices", () => {
    expect(priceText({ pricing: "hourly", price: 2000 })).toMatch(/\/hr$/);
    expect(priceText({ pricing: "project", price: 90000 })).toMatch(/\/project$/);
  });

  it("shows a starting-at price with and without an upper bound", () => {
    expect(priceText({ pricing: "starting_at", price: 10000 })).toMatch(/^From /);
    const range = priceText({ pricing: "starting_at", price: 10000, priceMax: 40000 });
    expect(range).toMatch(/^From .*10,000 – .*40,000$/);
  });

  it("says so when no price is set", () => {
    expect(priceText({ pricing: "fixed" })).toBe("Price on request");
  });
});

describe("deliveryLabel", () => {
  it("counts once and pluralises", () => {
    expect(deliveryLabel({ deliveryValue: 1, deliveryUnit: "days" })).toBe("1 day");
    expect(deliveryLabel({ deliveryValue: 3, deliveryUnit: "weeks" })).toBe("3 weeks");
  });

  it("is null without an estimate", () => {
    expect(deliveryLabel({ deliveryValue: undefined, deliveryUnit: "days" })).toBeNull();
  });
});

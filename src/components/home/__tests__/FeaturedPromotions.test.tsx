import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeaturedPromotion } from "@/services/featured-promotions";

// The component reads its data through this hook; each test supplies it.
const state: { data: FeaturedPromotion[] | undefined } = { data: undefined };
vi.mock("@/hooks/use-home", () => ({
  useFeaturedPromotions: () => ({ data: state.data }),
}));

import { FeaturedItem, FeaturedPromotions } from "../FeaturedPromotions";

const base: FeaturedPromotion = {
  id: "f1",
  kind: "DISCOUNT",
  name: "Back to campus",
  description: "Save on essentials",
  code: "CAMPUS15",
  discountType: "PERCENTAGE",
  discountValue: 15,
  minimumOrderAmount: 5000,
  expiresAt: null,
  products: [],
  vendors: [],
};

const html = (item: FeaturedPromotion) =>
  renderToStaticMarkup(createElement(FeaturedItem, { item }));

beforeEach(() => {
  state.data = undefined;
});

describe("FeaturedItem", () => {
  it("shows a promo code with its discount, minimum spend and a copy button", () => {
    const out = html(base);
    expect(out).toContain("Back to campus");
    expect(out).toContain("Save on essentials");
    expect(out).toContain("CAMPUS15");
    expect(out).toContain("15% off");
    expect(out).toContain("Spend");
    expect(out).toContain("5,000");
    expect(out).toContain("Copy");
  });

  it("shows featured products as links to their pages, with name and price", () => {
    const out = html({
      ...base,
      kind: "FEATURED_PRODUCT",
      code: null,
      discountType: null,
      discountValue: null,
      products: [
        { id: "p1", name: "Desk lamp", slug: "desk-lamp", image: "https://img/lamp.png", price: 2500 },
        { id: "p2", name: "Notebook", slug: "notebook", image: null, price: 800 },
      ],
    });
    expect(out).toContain('href="/marketplace/p1"');
    expect(out).toContain('href="/marketplace/p2"');
    expect(out).toContain("Desk lamp");
    expect(out).toContain("2,500");
    expect(out).toContain("https://img/lamp.png");
    expect(out).not.toContain("Copy");
  });

  it("shows featured vendors as links to their stores", () => {
    const out = html({
      ...base,
      kind: "FEATURED_VENDOR",
      code: null,
      discountType: null,
      discountValue: null,
      vendors: [
        { id: "v1", storeName: "Lamps R Us", slug: "lamps-r-us", logo: null },
        { id: "v2", storeName: "No Slug Shop", slug: null, logo: null },
      ],
    });
    expect(out).toContain('href="/store/lamps-r-us"');
    expect(out).toContain('href="/marketplace?vendor=v2"');
    expect(out).toContain("Lamps R Us");
    expect(out).toContain("No Slug Shop");
  });

  it("shows a campus campaign as a banner into the marketplace", () => {
    const out = html({
      ...base,
      kind: "CAMPUS_CAMPAIGN",
      name: "Freshers week",
      description: "Deals for new students",
      code: null,
      discountType: null,
      discountValue: null,
    });
    expect(out).toContain("Freshers week");
    expect(out).toContain("Deals for new students");
    expect(out).toContain('href="/marketplace"');
    expect(out).not.toContain("Copy");
  });

  it("escapes markup in admin-written text", () => {
    const out = html({ ...base, name: "<script>alert(1)</script>" });
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });
});

describe("FeaturedPromotions", () => {
  const render = () =>
    renderToStaticMarkup(
      createElement(FeaturedPromotions, { placement: "homepage_banner", title: "Promo codes for you" })
    );

  it("renders nothing while loading or when nothing is featured", () => {
    state.data = undefined;
    expect(render()).toBe("");
    state.data = [];
    expect(render()).toBe("");
  });

  it("renders a titled list of every featured item", () => {
    state.data = [
      base,
      { ...base, id: "f2", kind: "CAMPUS_CAMPAIGN", name: "Freshers week", code: null, discountType: null, discountValue: null },
    ];
    const out = render();
    expect(out).toContain("Promo codes for you");
    expect(out).toContain("Back to campus");
    expect(out).toContain("Freshers week");
    expect(out.match(/<li/g)?.length).toBe(2);
  });
});

import { describe, expect, it } from "vitest";
import { mapBackendProductToFrontend, type BackendProductListItem } from "../products";

const raw = (over: Partial<BackendProductListItem> = {}): BackendProductListItem => ({
  id: "p1",
  vendorId: "v1",
  categoryId: "c1",
  campusId: "k1",
  name: "Desk lamp",
  slug: "desk-lamp",
  description: null,
  type: "PHYSICAL",
  condition: "NEW",
  price: 2500,
  compareAtPrice: null,
  stockQuantity: 3,
  sku: null,
  status: "ACTIVE",
  images: [],
  createdAt: "2026-01-01T00:00:00Z",
  ...over,
});

describe("mapBackendProductToFrontend sponsored flag", () => {
  it("carries a boosted product's sponsored flag", () => {
    expect(mapBackendProductToFrontend(raw({ sponsored: true })).sponsored).toBe(true);
  });

  it("leaves it unset for a normal product", () => {
    expect(mapBackendProductToFrontend(raw()).sponsored).toBeUndefined();
    expect(mapBackendProductToFrontend(raw({ sponsored: false })).sponsored).toBeUndefined();
  });
});

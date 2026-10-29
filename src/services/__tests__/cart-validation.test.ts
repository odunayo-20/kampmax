import { describe, it, expect } from "vitest";
import { validateCartItems } from "@/services/cart";
import type { CartLineItem } from "@/types/cart";

// The catalog cache is empty here, like on a freshly refreshed page.
const line = (product: Record<string, unknown>, extra: Partial<CartLineItem> = {}) =>
  ({
    id: "l1",
    productId: "p1",
    vendorId: "v1",
    quantity: 1,
    product: { id: "p1", vendorId: "v1", price: 1000, status: "available", ...product },
    ...extra,
  }) as unknown as CartLineItem;

describe("validateCartItems with a cold catalog cache", () => {
  it("keeps an available line valid after a refresh", () => {
    expect(validateCartItems([line({})])[0].status).toBe("valid");
  });

  it("does not flag a variant line priced differently from the base price", () => {
    const res = validateCartItems([
      line({}, { unitPrice: 1500, selectedVariants: { Size: "L" } } as Partial<CartLineItem>),
    ]);
    expect(res[0].status).toBe("valid");
  });

  it("trusts the server's out-of-stock verdict for a snapshot line", () => {
    const res = validateCartItems([line({}, { availabilityStatus: "out_of_stock" } as Partial<CartLineItem>)]);
    expect(res[0].status).toBe("out_of_stock");
  });

  it("still flags a product the server marked as removed or sold", () => {
    expect(validateCartItems([line({ status: "removed" })])[0].status).toBe("unavailable");
    expect(validateCartItems([line({ status: "sold" })])[0].status).toBe("unavailable");
  });
});

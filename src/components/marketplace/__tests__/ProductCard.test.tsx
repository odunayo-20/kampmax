// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Product } from "@/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/services/wishlist", () => ({
  useWishlist: () => ({ has: () => false, toggle: vi.fn().mockResolvedValue({ ok: true }) }),
}));
vi.mock("@/lib/cart-context", () => ({ useCart: () => ({ addItem: vi.fn() }) }));

import { ProductCard } from "../ProductCard";

const product = {
  id: "p1",
  title: "Scientific calculator",
  price: 8000,
  condition: "New",
  images: [],
  vendorId: "v1",
  stock: 5,
} as unknown as Product;

afterEach(cleanup);

describe("ProductCard quick view", () => {
  it("opens the quick view for this product without following the link", () => {
    const onQuickView = vi.fn();
    render(<ProductCard product={product} onQuickView={onQuickView} />);

    const button = screen.getByRole("button", { name: "Quick view: Scientific calculator" });
    const notPrevented = fireEvent.click(button);

    expect(onQuickView).toHaveBeenCalledWith(product);
    // The card is a link; the click must not carry on to it.
    expect(notPrevented).toBe(false);
  });

  it("has no quick view button where nothing can show one", () => {
    render(<ProductCard product={product} />);

    expect(screen.queryByRole("button", { name: /quick view/i })).toBeNull();
  });
});

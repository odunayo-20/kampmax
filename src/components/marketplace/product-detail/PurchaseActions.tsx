"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui";

interface PurchaseActionsProps {
  canAddToCart: boolean;
  isUnavailable: boolean;
  allVariantsSelected: boolean;
  inStock: boolean;
  added: boolean;
  buyLoading: boolean;
  onAddToCart: () => void;
  onBuyNow: () => void;
  mobile?: boolean;
}

export function PurchaseActions({
  canAddToCart,
  isUnavailable,
  allVariantsSelected,
  inStock,
  added,
  buyLoading,
  onAddToCart,
  onBuyNow,
  mobile = false,
}: PurchaseActionsProps) {
  if (isUnavailable) return null;

  const showError = !canAddToCart;
  const errorMessage = !allVariantsSelected
    ? "Select all variations before purchasing."
    : !inStock
    ? "This combination is out of stock."
    : "";

  if (mobile) {
    return (
      <div className="flex items-center gap-3">
        <Button onClick={onAddToCart} disabled={!canAddToCart} variant="outline" className="h-10 px-4">
          <ShoppingCart className="h-4 w-4 mr-1.5" /> Add
        </Button>
        <Button onClick={onBuyNow} disabled={!canAddToCart || buyLoading} variant="primary" className="h-10 px-5 font-bold flex-1">
          {buyLoading ? "..." : "Buy now"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Button onClick={onAddToCart} disabled={!canAddToCart} variant="outline" size="lg" className="flex-1 h-12 text-sm font-semibold">
        <ShoppingCart className="h-4 w-4 mr-2" />
        {added ? "Added!" : "Add to Cart"}
      </Button>
      <Button onClick={onBuyNow} disabled={!canAddToCart || buyLoading} variant="primary" size="lg" className="flex-1 h-12 text-sm font-bold">
        {buyLoading ? "Processing..." : "Buy Now"}
      </Button>
    </div>
  );
}
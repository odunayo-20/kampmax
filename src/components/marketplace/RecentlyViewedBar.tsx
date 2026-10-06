"use client";

import { useEffect, useState } from "react";
import { Clock, Trash2 } from "lucide-react";
import { Product } from "@/types";
import {
  getRecentlyViewed,
  clearRecentlyViewed,
  saveRecentlyViewed,
} from "@/services/recently-viewed";
import { fetchProductById } from "@/services/products";
import { ProductCard } from "./ProductCard";

interface RecentlyViewedBarProps {
  onQuickView?: (product: Product) => void;
  className?: string;
  /** The product being viewed right now; it is not listed as "recently viewed". */
  excludeId?: string;
}

const SHOWN = 6;

export function RecentlyViewedBar({ onQuickView, className = "", excludeId }: RecentlyViewedBarProps) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    const stored = getRecentlyViewed();
    setItems(stored);
    if (stored.length === 0) return;

    // What was saved can be days old: re-check each item with the live catalogue,
    // refresh its price and details, and drop what is gone or no longer for sale.
    Promise.all(
      stored.map(async (product) => {
        const { data, error } = await fetchProductById(product.id);
        if (error?.status === 404) return null;
        if (error) return product; // offline: keep what we have
        return data && data.status === "available" ? data : null;
      })
    ).then((checked) => {
      if (cancelled) return;
      const fresh = checked.filter((p): p is Product => p !== null);
      saveRecentlyViewed(fresh);
      setItems(fresh);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const visible = items.filter((p) => p.id !== excludeId);
  if (visible.length === 0) return null;

  function handleClear() {
    clearRecentlyViewed();
    setItems([]);
  }

  return (
    <div className={`space-y-3 pt-6 border-t border-neutral-200/80 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary-600" />
          <h2 className="text-base font-bold text-neutral-900">Recently Viewed Items</h2>
          <span className="text-xs text-neutral-400 font-medium">({visible.length})</span>
        </div>

        <button
          onClick={handleClear}
          className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-error-600 transition-colors font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear history
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {visible.slice(0, SHOWN).map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onQuickView={onQuickView}
          />
        ))}
      </div>
    </div>
  );
}

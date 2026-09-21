"use client";

import { useEffect, useState } from "react";
import { Clock, Trash2, ChevronRight } from "lucide-react";
import { Product } from "@/types";
import { getRecentlyViewed, clearRecentlyViewed } from "@/services/recently-viewed";
import { ProductCard } from "./ProductCard";

interface RecentlyViewedBarProps {
  onQuickView?: (product: Product) => void;
  className?: string;
}

export function RecentlyViewedBar({ onQuickView, className = "" }: RecentlyViewedBarProps) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    setItems(getRecentlyViewed());
  }, []);

  if (items.length === 0) return null;

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
          <span className="text-xs text-neutral-400 font-medium">({items.length})</span>
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
        {items.slice(0, 6).map((product) => (
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

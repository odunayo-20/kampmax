"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { formatNaira } from "@/lib/utils";

interface ProductHeaderProps {
  /** Undefined while the list is still loading. */
  totalCount?: number;
  onAddProduct: () => void;
}

export function ProductHeader({ totalCount, onAddProduct }: ProductHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div>
        <h1 className="text-xl font-bold text-kampmax-text">Products</h1>
        <p className="text-sm text-kampmax-text-secondary">
          {totalCount === undefined ? "Loading…" : `${totalCount} product${totalCount !== 1 ? "s" : ""}`}
        </p>
      </div>
      <Button onClick={onAddProduct} className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Add Product
      </Button>
    </div>
  );
}
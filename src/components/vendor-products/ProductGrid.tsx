"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Edit, MoreVertical, Archive, RotateCcw, Trash2 } from "lucide-react";
import { formatNaira, timeAgo } from "@/lib/utils";
import { ProductMenuItem, DELETE_DISABLED_HINT } from "./ProductMenuItem";
import { ProductPublishBadge, ProductStockBadge } from "./product-meta";
import type { Product } from "@/types";
import type { ProductPublishStatus } from "@/types/vendor-products";
import { getProductPublishAvailability } from "@/types/vendor-products";

interface ProductGridProps {
  products: Product[];
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onTogglePublish: (product: Product) => void;
  onArchive: (product: Product) => void;
  onRestore: (product: Product) => void;
  onDelete: (product: Product) => void;
}


export function ProductGrid({
  products,
  onView,
  onEdit,
  onTogglePublish,
  onArchive,
  onRestore,
  onDelete,
}: ProductGridProps) {
  const router = useRouter();

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-kampmax-border bg-white p-8 text-center">
        <div className="mx-auto mb-3 w-16 h-16 rounded-full bg-kampmax-muted flex items-center justify-center">
          <svg className="h-8 w-8 text-kampmax-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-sm font-medium text-kampmax-text">No products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:hidden">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onView={() => onView(product)}
          onEdit={() => onEdit(product)}
          onTogglePublish={() => onTogglePublish(product)}
          onArchive={() => onArchive(product)}
          onRestore={() => onRestore(product)}
          onDelete={() => onDelete(product)}
        />
      ))}
    </div>
  );
}

function ProductCard({
  product,
  onView,
  onEdit,
  onTogglePublish,
  onArchive,
  onRestore,
  onDelete,
}: {
  product: Product;
  onView: () => void;
  onEdit: () => void;
  onTogglePublish: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const availability = getProductPublishAvailability(product.publishedStatus ?? "active");

  return (
    <div className="bg-white rounded-xl border border-kampmax-border p-3 relative">
      <div className="flex items-start justify-between mb-2">
        <div className="w-14 h-14 rounded-lg bg-kampmax-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {product.images[0] ? (
            <img src={product.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <svg className="h-6 w-6 text-kampmax-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded hover:bg-kampmax-muted"
            aria-label="More actions"
          >
            <MoreVertical className="h-4 w-4 text-kampmax-text-secondary" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-10 w-40 rounded-lg border border-kampmax-border bg-white py-1 shadow-lg">
              <ProductMenuItem icon={Eye} label="View" onClick={() => { setMenuOpen(false); onView(); }} />
              <ProductMenuItem icon={Edit} label="Edit" onClick={() => { setMenuOpen(false); onEdit(); }} disabled={!availability.canEdit} />
              <ProductMenuItem
                icon={Eye}
                label={availability.canPublish ? "Publish" : "Unpublish"}
                onClick={() => { setMenuOpen(false); onTogglePublish(); }}
                disabled={!availability.canPublish && !availability.canUnpublish}
              />
              {availability.canArchive && <ProductMenuItem icon={Archive} label="Archive" onClick={() => { setMenuOpen(false); onArchive(); }} danger />}
              {availability.canRestore && <ProductMenuItem icon={RotateCcw} label="Restore" onClick={() => { setMenuOpen(false); onRestore(); }} />}
              <ProductMenuItem icon={Trash2} label="Delete" onClick={() => { setMenuOpen(false); onDelete(); }} danger disabled={!availability.canDelete} disabledHint={DELETE_DISABLED_HINT} />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="font-medium text-sm text-kampmax-text line-clamp-1">{product.title}</p>
        <p className="font-mono text-[11px] text-kampmax-text-secondary">{product.sku ?? "No SKU"}</p>
        <div className="flex items-center gap-2">
          <ProductPublishBadge status={product.publishedStatus ?? "active"} />
          <ProductStockBadge
            status={
              product.stock === undefined || product.stock === 0
                ? "out_of_stock"
                : product.stock <= (product.lowStockThreshold ?? 5)
                ? "low_stock"
                : "in_stock"
            }
          />
        </div>
        <div className="flex items-center justify-between text-xs text-kampmax-text-secondary">
          <span>{formatNaira(product.price)}</span>
          <span>{timeAgo(product.updatedAt ?? product.createdAt)}</span>
        </div>
      </div>

      <div className="flex gap-1.5 mt-2 pt-2 border-t border-kampmax-border">
        <button
          onClick={onView}
          className="flex-1 py-1.5 text-xs font-medium text-kampmax-text border border-kampmax-border rounded-lg hover:bg-kampmax-muted"
        >
          View
        </button>
        <button
          onClick={onEdit}
          disabled={!availability.canEdit}
          className="flex-1 py-1.5 text-xs font-medium text-kampmax-blue border border-kampmax-blue rounded-lg hover:bg-kampmax-blue/5 disabled:opacity-40"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
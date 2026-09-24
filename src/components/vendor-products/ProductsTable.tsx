"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MoreVertical,
  Eye,
  Edit,
  Archive,
  RotateCcw,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { cn, formatNaira, formatNairaCompact, timeAgo } from "@/lib/utils";
import { ProductPublishBadge, ProductStockBadge } from "./product-meta";
import type { Product } from "@/types";
import type { ProductPublishStatus } from "@/types/vendor-products";
import { getProductPublishAvailability } from "@/types/vendor-products";

interface ProductsTableProps {
  products: Product[];
  /** categoryId -> display name */
  categoryNames?: Record<string, string>;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onPublish: (product: Product) => void;
  onArchive: (product: Product) => void;
  onRestore: (product: Product) => void;
  onDelete: (product: Product) => void;
  bulkAction?: {
    selectedIds: string[];
    onSelectAll: (checked: boolean) => void;
    onSelectionChange: (ids: string[]) => void;
    onBulkPublish: () => void;
    onBulkUnpublish: () => void;
    onBulkArchive: () => void;
  };
}

const COLUMNS = [
  { key: "select", label: "", width: "w-10" },
  { key: "product", label: "Product", width: "min-w-[280px]" },
  { key: "sku", label: "SKU", width: "hidden lg:table-cell min-w-[120px]" },
  { key: "category", label: "Category", width: "hidden xl:table-cell min-w-[140px]" },
  { key: "price", label: "Price", width: "w-[110px]" },
  { key: "stock", label: "Stock", width: "w-[100px]" },
  { key: "status", label: "Status", width: "w-[130px]" },
  { key: "updated", label: "Updated", width: "hidden lg:table-cell w-[120px]" },
  { key: "actions", label: "Actions", width: "w-[200px] text-right" },
];

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("whitespace-nowrap px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-kampmax-text-secondary", className)}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("whitespace-nowrap px-4 py-2.5 text-sm", className)}>{children}</td>;
}

const MENU_WIDTH = 200;

function RowActionsMenu({
  product,
  onView,
  onEdit,
  onPublish,
  onArchive,
  onRestore,
  onDelete,
}: {
  product: Product;
  onView: () => void;
  onEdit: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const availability = getProductPublishAvailability(product.publishedStatus ?? "active");

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
      const below = rect.bottom + 6;
      const top = below + 300 > window.innerHeight && rect.top - 310 > 0 ? rect.top - 310 : below;
      setCoords({ top, left });
    }
    setOpen((v) => !v);
  }

  function run(fn: () => void) {
    return () => {
      setOpen(false);
      fn();
    };
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${product.title}`}
        onClick={toggle}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-text",
          open && "bg-kampmax-muted text-kampmax-text"
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && coords && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`${product.title} actions`}
          style={{ top: coords.top, left: coords.left, width: MENU_WIDTH }}
          className="fixed z-50 overflow-hidden rounded-lg border border-kampmax-border bg-white py-1 shadow-lg"
        >
          <MenuItem icon={Eye} label="View" onClick={run(onView)} />
          <MenuItem icon={Edit} label="Edit" onClick={run(onEdit)} disabled={!availability.canEdit} />
          <MenuItem icon={AlertTriangle} label={availability.canPublish ? "Publish" : "Unpublish"} onClick={run(onPublish)} disabled={!availability.canPublish && !availability.canUnpublish} />
          {availability.canArchive && <MenuItem icon={Archive} label="Archive" onClick={run(onArchive)} danger />}
          {availability.canRestore && <MenuItem icon={RotateCcw} label="Restore" onClick={run(onRestore)} />}
          <MenuItem icon={Trash2} label="Delete" onClick={run(onDelete)} danger disabled={!availability.canDelete} />
        </div>
      )}
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium transition-colors",
        disabled
          ? "opacity-40 cursor-not-allowed"
          : danger
          ? "text-kampmax-error hover:bg-kampmax-error/5"
          : "text-kampmax-text hover:bg-kampmax-muted"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  );
}

export function ProductsTable({
  products,
  categoryNames,
  onView,
  onEdit,
  onPublish,
  onArchive,
  onRestore,
  onDelete,
  bulkAction,
}: ProductsTableProps) {
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
    <div className="overflow-hidden rounded-lg border border-kampmax-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-kampmax-border bg-kampmax-muted/50 text-left text-xs uppercase tracking-wide text-kampmax-text-secondary">
              {COLUMNS.map((col) => (
                <Th key={col.key} className={col.width}>
                  {col.label}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-kampmax-border/70">
            {products.map((product) => (
              <tr key={product.id} className="group transition-colors hover:bg-kampmax-muted/40">
                {/* Select */}
                <Td className="w-10">
                  {bulkAction && (
                    <input
                      type="checkbox"
                      checked={bulkAction.selectedIds.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          bulkAction.onSelectionChange([...bulkAction.selectedIds, product.id]);
                        } else {
                          bulkAction.onSelectionChange(bulkAction.selectedIds.filter((id) => id !== product.id));
                        }
                      }}
                      className="h-4 w-4 rounded border-kampmax-border text-kampmax-blue focus:ring-kampmax-blue"
                    />
                  )}
                </Td>

                {/* Product */}
                <Td className={COLUMNS[1].width}>
                  <button
                    type="button"
                    onClick={() => onView(product)}
                    className="flex items-center gap-2.5 text-left w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue"
                  >
                    <div className="w-10 h-10 rounded-lg bg-kampmax-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <svg className="h-5 w-5 text-kampmax-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="block max-w-[220px] truncate font-medium text-kampmax-text group-hover:text-kampmax-blue">
                        {product.title}
                      </span>
                      <span className="block font-mono text-[11px] text-kampmax-text-secondary">
                        {product.id} · {product.condition}
                      </span>
                    </div>
                  </button>
                </Td>

                {/* SKU */}
                <Td className={COLUMNS[2].width}>
                  <span className="font-mono text-[11px] text-kampmax-text-secondary">
                    {product.sku ?? "—"}
                  </span>
                </Td>

                {/* Category */}
                <Td className={COLUMNS[3].width}>
                  <span className="max-w-[140px] truncate text-kampmax-text-secondary">{categoryNames?.[product.categoryId] ?? "—"}</span>
                </Td>

                {/* Price */}
                <Td className={COLUMNS[4].width}>
                  <span className="font-medium tabular-nums text-kampmax-text">{formatNaira(product.price)}</span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="ml-1.5 text-[11px] tabular-nums text-kampmax-text-secondary/70 line-through">
                      {formatNairaCompact(product.originalPrice)}
                    </span>
                  )}
                </Td>

                {/* Stock */}
                <Td className={COLUMNS[5].width}>
                  <ProductStockBadge
                    status={product.stock === undefined || product.stock === 0 ? "out_of_stock" : product.stock <= (product.lowStockThreshold ?? 5) ? "low_stock" : "in_stock"}
                  />
                </Td>

                {/* Status */}
                <Td className={COLUMNS[6].width}>
                  <ProductPublishBadge status={product.publishedStatus ?? "active"} />
                </Td>

                {/* Updated */}
                <Td className={COLUMNS[7].width}>
                  <span className="tabular-nums text-kampmax-text-secondary" title={product.updatedAt ?? product.createdAt}>
                    {timeAgo(product.updatedAt ?? product.createdAt)}
                  </span>
                </Td>

                {/* Actions */}
                <Td className={COLUMNS[8].width}>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onView(product)}
                      className="inline-flex h-8 items-center rounded-md border border-kampmax-border bg-white px-2.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted"
                    >
                      View
                    </button>
                    <RowActionsMenu
                      product={product}
                      onView={() => onView(product)}
                      onEdit={() => onEdit(product)}
                      onPublish={() => onPublish(product)}
                      onArchive={() => onArchive(product)}
                      onRestore={() => onRestore(product)}
                      onDelete={() => onDelete(product)}
                    />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="sr-only" aria-live="polite">
        Showing {products.length} products
      </p>
    </div>
  );
}
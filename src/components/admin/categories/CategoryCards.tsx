"use client";

import { ArrowDown, ArrowUp, Clock3, CornerDownRight, Layers, Package } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { CategoryReorderDirection, ManagedCategory } from "@/types/admin";
import { CategoryAvatar, CategoryStatusBadge } from "./CategoryBadges";
import { CategoryRowMenu, type CategoryRowActions } from "./CategoryRowMenu";

interface CategoryCardsProps extends CategoryRowActions {
  items: ManagedCategory[];
}

/**
 * Phone layout (< sm): each category is a full-bleed card instead of a
 * squashed 7-column table. Same actions as the desktop table, no horizontal
 * scroll, thumb-friendly tap targets. Hidden from `sm` up where the table
 * takes over.
 */
export function CategoryCards({ items, ...actions }: CategoryCardsProps) {
  return (
    <ol className="divide-y divide-kampmax-border/70 rounded-lg border border-kampmax-border bg-white">
      {items.map((category) => (
        <Card key={category.id} category={category} {...actions} />
      ))}
    </ol>
  );
}

function Card({
  category,
  onEdit,
  onCreateSub,
  onToggleStatus,
  onDelete,
  onReorder,
  readOnly,
}: { category: ManagedCategory } & CategoryRowActions) {
  const isChild = Boolean(category.parentId);
  const deletable = category.productCount === 0 && category.subcategoryCount === 0;
  const subProducts = category.totalProductCount - category.productCount;

  return (
    <li className="px-3 py-3">
      {/* Identity + status */}
      <div className="flex items-start gap-3">
        <CategoryAvatar category={category} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "truncate text-[15px] text-kampmax-text",
                !isChild && "font-semibold"
              )}
            >
              {category.name}
            </p>
            <CategoryStatusBadge status={category.status} />
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-kampmax-text-secondary">
            {isChild && (
              <>
                <CornerDownRight className="h-3 w-3 shrink-0" aria-hidden />
                <span className="max-w-[45%] truncate">in {category.parentName}</span>
                <span aria-hidden className="shrink-0 text-kampmax-text-muted">·</span>
              </>
            )}
            <span className="truncate font-mono">/{category.slug}</span>
          </div>
          {!isChild && category.description && (
            <p className="mt-1 truncate text-xs text-kampmax-text-secondary">
              {category.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-2.5 flex items-center gap-4 text-xs text-kampmax-text-secondary">
        <span className="inline-flex shrink-0 items-center gap-1">
          <Package className="h-3.5 w-3.5 text-kampmax-text-secondary/60" aria-hidden />
          <span className="font-medium tabular-nums text-kampmax-text">
            {category.productCount.toLocaleString("en-NG")}
          </span>
          Products
          {subProducts > 0 && (
            <span className="text-kampmax-text-muted">(+{subProducts.toLocaleString("en-NG")} sub)</span>
          )}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <Layers className="h-3.5 w-3.5 text-kampmax-text-secondary/60" aria-hidden />
          <span className="font-medium tabular-nums text-kampmax-text">
            {isChild ? "—" : category.subcategoryCount}
          </span>
          Sub
        </span>
        <span className="ml-auto inline-flex items-center gap-1 whitespace-nowrap">
          <Clock3 className="h-3.5 w-3.5 text-kampmax-text-secondary/60" aria-hidden />
          {formatDate(category.updatedAt)}
        </span>
      </div>

      {/* Footer: reorder + menu */}
      <div className="mt-2.5 flex items-center justify-between border-t border-kampmax-border/60 pt-2">
        <div className="flex items-center gap-0.5">
          {!readOnly && (
            <>
              <button
                type="button"
                aria-label={`Move ${category.name} up`}
                onClick={() => onReorder(category, "up")}
                className="rounded p-1.5 text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-text"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Move ${category.name} down`}
                onClick={() => onReorder(category, "down")}
                className="rounded p-1.5 text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-text"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </>
          )}
          <span className="ml-1 text-[11px] tabular-nums text-kampmax-text-secondary">
            Order #{category.sortOrder}
          </span>
        </div>
        {!readOnly && (
          <CategoryRowMenu
            category={category}
            deletable={deletable}
            onEdit={onEdit}
            onCreateSub={onCreateSub}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
          />
        )}
      </div>
    </li>
  );
}
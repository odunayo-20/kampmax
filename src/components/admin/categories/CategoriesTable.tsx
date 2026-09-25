"use client";

import {
  ArrowDown,
  ArrowUp,
  CornerDownRight,
  PlusCircle,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import type { ManagedCategory } from "@/types/admin";
import { CategoryAvatar, CategoryStatusBadge } from "./CategoryBadges";
import { CategoryCards } from "./CategoryCards";
import { CategoryRowMenu, type CategoryRowActions } from "./CategoryRowMenu";

interface CategoriesTableProps extends CategoryRowActions {
  items: ManagedCategory[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function CategoriesTable({
  items,
  loading,
  error,
  onRetry,
  hasActiveFilters,
  onClearFilters,
  ...actions
}: CategoriesTableProps) {
  if (loading) return <LoadingSkeleton variant="table" rows={6} />;

  if (error) {
    return (
      <div className="rounded-lg border border-kampmax-border bg-white p-4">
        <ErrorState onRetry={onRetry} />
      </div>
    );
  }

  if (items.length === 0) {
    return hasActiveFilters ? (
      <EmptyState
        icon={PlusCircle}
        title="No categories match"
        message="No category matches the current search or status filter."
        action={
          <button
            type="button"
            onClick={onClearFilters}
            className="h-9 rounded-md bg-kampmax-blue px-3.5 text-sm font-medium text-white hover:bg-kampmax-blue/90"
          >
            Clear filters
          </button>
        }
      />
    ) : (
      <EmptyState
        icon={PlusCircle}
        title="No categories yet"
        message="Create your first top-level category to structure the marketplace."
      />
    );
  }

  const topLevelCount = items.filter((c) => !c.parentId).length;

  return (
    <>
      {/* Phone: cards are far more legible than a squashed 7-column table. */}
      <div className="sm:hidden">
        <CategoryCards items={items} {...actions} />
      </div>

      {/* Tablet and up: the full table. */}
      <div className="hidden overflow-hidden rounded-lg border border-kampmax-border bg-white sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] table-fixed text-left text-sm">
            <colgroup>
              <col />
              <col className="hidden w-28 md:table-column" />
              <col className="hidden w-24 xl:table-column" />
              <col className="w-[5.5rem]" />
              <col className="w-24" />
              <col className="hidden w-32 xl:table-column" />
              <col className="w-16" />
            </colgroup>
            <thead className="border-b border-kampmax-border bg-kampmax-muted/40 text-[11px] uppercase tracking-wide text-kampmax-text-secondary">
              <tr>
                <th scope="col" className="px-2.5 py-2.5 font-medium sm:px-4">Category</th>
                <th scope="col" className="hidden px-2.5 py-2.5 text-right font-medium md:table-cell sm:px-4">Products</th>
                <th scope="col" className="hidden px-2.5 py-2.5 text-right font-medium xl:table-cell sm:px-4">
                  Subcategories
                </th>
                <th scope="col" className="px-2.5 py-2.5 text-center font-medium sm:px-4">Order</th>
                <th scope="col" className="px-2.5 py-2.5 font-medium sm:px-4">Status</th>
                <th scope="col" className="hidden px-2.5 py-2.5 font-medium xl:table-cell sm:px-4">Updated</th>
                <th scope="col" className="px-2.5 py-2.5 text-right font-medium sm:px-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kampmax-border/70">
              {items.map((category) => (
                <Row key={category.id} category={category} {...actions} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="sr-only" aria-live="polite">
          Showing {items.length} categories across {topLevelCount} top-level groups.
        </p>
      </div>
    </>
  );
}

// ------------------------------------------------------------
// Rows (tree: children indented under their parent)
// ------------------------------------------------------------

function Row({
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

  return (
    <tr
      className={cn(
        "group transition-colors hover:bg-kampmax-muted/40",
        isChild && "bg-kampmax-muted/20"
      )}
    >
      {/* Category */}
      <td className="px-2.5 py-2.5 sm:px-4">
        <div className={cn("flex min-w-0 items-center gap-2", isChild && "pl-3 sm:pl-6")}>
          {isChild ? (
            <>
              <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-kampmax-text-secondary/60" />
              <CategoryAvatar category={category} size="sm" />
            </>
          ) : (
            <CategoryAvatar category={category} />
          )}
          <div className="min-w-0">
            <p
              className={cn(
                "truncate text-kampmax-text",
                isChild ? "text-[13px]" : "font-medium"
              )}
            >
              {category.name}
              {isChild && (
                <span className="ml-1.5 text-[11px] font-normal text-kampmax-text-secondary">
                  in {category.parentName}
                </span>
              )}
            </p>
            <p className="truncate font-mono text-[11px] text-kampmax-text-secondary">
              /{category.slug}
              {!isChild && category.description ? ` · ${category.description}` : ""}
            </p>
          </div>
        </div>
      </td>

      {/* Products */}
      <td className="hidden whitespace-nowrap px-2.5 py-2.5 text-right tabular-nums md:table-cell sm:px-4">
        <span className="font-medium text-kampmax-text">
          {category.productCount.toLocaleString("en-NG")}
        </span>
        {category.totalProductCount > category.productCount && (
          <span className="ml-1 text-[11px] text-kampmax-text-secondary">
            (+{(category.totalProductCount - category.productCount).toLocaleString("en-NG")} sub)
          </span>
        )}
      </td>

      {/* Subcategories */}
      <td className="hidden whitespace-nowrap px-2.5 py-2.5 text-right tabular-nums text-kampmax-text-secondary xl:table-cell sm:px-4">
        {isChild ? "—" : category.subcategoryCount}
      </td>

      {/* Order controls */}
      <td className="px-2.5 py-2.5 sm:px-4">
        <div className="flex items-center justify-center gap-1">
          {!readOnly && (
            <>
              <button
                type="button"
                aria-label={`Move ${category.name} up`}
                onClick={() => onReorder(category, "up")}
                className="rounded p-1 text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-text"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Move ${category.name} down`}
                onClick={() => onReorder(category, "down")}
                className="rounded p-1 text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-text"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <span className="ml-1 w-10 text-center text-[11px] tabular-nums text-kampmax-text-secondary">
            #{category.sortOrder}
          </span>
        </div>
      </td>

      {/* Status */}
      <td className="px-2.5 py-2.5 sm:px-4">
        <CategoryStatusBadge status={category.status} />
      </td>

      {/* Updated */}
      <td
        className="hidden whitespace-nowrap px-2.5 py-2.5 text-kampmax-text-secondary xl:table-cell sm:px-4"
        title={category.updatedAt}
      >
        {formatDate(category.updatedAt)}
      </td>

      {/* Actions */}
      <td className="relative px-2.5 py-2.5 text-right sm:px-4">
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
      </td>
    </tr>
  );
}
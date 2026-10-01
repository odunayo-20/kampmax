"use client";

import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Select } from "@/components/ui/Select";
import { useCategories } from "@/hooks/use-taxonomy";
import type { Campus } from "@/types";
import type { TaxonomyType } from "@/services/taxonomy";
import { DATE_PRESET_OPTIONS, SORT_OPTIONS, type NearbyDatePreset, type NearbySort } from "@/services/nearby-api";
import { cn } from "@/lib/utils";

export interface NearbyFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Taxonomy of the currently selected entity type, or null when it has none (or "All" is selected). */
  categoryTaxonomy: TaxonomyType | null;
  categoryId: string;
  onCategoryChange: (id: string) => void;
  /** All campuses (see services/campus) — never hardcoded. Hidden if empty. */
  campuses: Campus[];
  campusId: string;
  onCampusIdChange: (id: string) => void;
  /** Whether the selected entity type has a schedule (currently events only). */
  hasSchedule: boolean;
  datePreset: NearbyDatePreset | "";
  onDatePresetChange: (v: NearbyDatePreset | "") => void;
  sort: NearbySort;
  onSortChange: (v: NearbySort) => void;
  activeCount: number;
  onClear: () => void;
}

/**
 * Compact bottom sheet for the filter dimensions that don't fit in the
 * always-visible row (type chips, search, distance): category, campus, date
 * (events only) and sort. Mirrors the existing marketplace filter drawer's
 * layout for consistency.
 */
export function NearbyFilterDrawer({
  open,
  onClose,
  categoryTaxonomy,
  categoryId,
  onCategoryChange,
  campuses,
  campusId,
  onCampusIdChange,
  hasSchedule,
  datePreset,
  onDatePresetChange,
  sort,
  onSortChange,
  activeCount,
  onClear,
}: NearbyFilterDrawerProps) {
  const categories = useCategories(categoryTaxonomy ?? "PRODUCT", !!categoryTaxonomy);
  // "Upcoming" only makes sense for a scheduled type (soonest start first).
  const sortOptions = hasSchedule ? SORT_OPTIONS : SORT_OPTIONS.filter((o) => o.value !== "upcoming");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden rounded-t-2xl bg-white sm:inset-0 sm:m-auto sm:h-fit sm:max-w-sm sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-neutral-700" aria-hidden />
            <span className="font-semibold text-neutral-900">More filters</span>
            {activeCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white">
                {activeCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="rounded-full p-1 hover:bg-neutral-100"
          >
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto p-4">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Category</h3>
            {!categoryTaxonomy ? (
              <p className="text-sm text-neutral-500">
                Choose a specific type above to filter by category.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={!categoryId}
                  onClick={() => onCategoryChange("")}
                  className={cn(
                    "h-9 rounded-full border px-3.5 text-sm font-medium",
                    !categoryId
                      ? "border-primary-600 bg-primary-600 text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
                  )}
                >
                  All categories
                </button>
                {categories.categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={categoryId === c.id}
                    onClick={() => onCategoryChange(categoryId === c.id ? "" : c.id)}
                    className={cn(
                      "h-9 rounded-full border px-3.5 text-sm font-medium",
                      categoryId === c.id
                        ? "border-primary-600 bg-primary-600 text-white"
                        : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
                    )}
                  >
                    {c.depth > 0 ? "— " : ""}
                    {c.name}
                  </button>
                ))}
                {categories.isLoading && <p className="text-xs text-neutral-400">Loading categories…</p>}
              </div>
            )}
          </div>

          {campuses.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Campus</h3>
              <Select aria-label="Campus" value={campusId} onChange={(e) => onCampusIdChange(e.target.value)}>
                <option value="">All campuses</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {hasSchedule && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">When</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={!datePreset}
                  onClick={() => onDatePresetChange("")}
                  className={cn(
                    "h-9 rounded-full border px-3.5 text-sm font-medium",
                    !datePreset
                      ? "border-primary-600 bg-primary-600 text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
                  )}
                >
                  Any time
                </button>
                {DATE_PRESET_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={datePreset === o.value}
                    onClick={() => onDatePresetChange(datePreset === o.value ? "" : o.value)}
                    className={cn(
                      "h-9 rounded-full border px-3.5 text-sm font-medium",
                      datePreset === o.value
                        ? "border-primary-600 bg-primary-600 text-white"
                        : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Sort by</h3>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={sort === o.value}
                  onClick={() => onSortChange(o.value)}
                  className={cn(
                    "h-9 rounded-full border px-3.5 text-sm font-medium",
                    sort === o.value
                      ? "border-primary-600 bg-primary-600 text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-neutral-200 p-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onClear}>
            Clear
          </Button>
          <Button type="button" className="flex-1" onClick={onClose}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

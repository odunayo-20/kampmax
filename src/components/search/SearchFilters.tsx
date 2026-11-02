"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SearchFilterType, SearchSortOption } from "@/types";
import {
  SearchFilterPanel,
  SearchFilterPanelProps,
} from "./SearchFilterPanel";

interface SearchFiltersProps extends SearchFilterPanelProps {
  activeType: SearchFilterType;
  sortBy: SearchSortOption;
  resultCount?: number;
  onTypeChange: (type: SearchFilterType) => void;
  onSortChange: (sort: SearchSortOption) => void;
  className?: string;
}

export const SEARCH_TYPE_FILTERS: { value: SearchFilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "product", label: "Products" },
  { value: "vendor", label: "Vendors" },
  { value: "job", label: "Jobs" },
  { value: "service", label: "Services" },
  { value: "freelance", label: "Freelance" },
  { value: "provider", label: "Providers" },
  { value: "freelancer", label: "Freelancers" },
  { value: "category", label: "Categories" },
  { value: "post", label: "Posts" },
  { value: "event", label: "Events" },
];

const sortOptions: { value: SearchSortOption; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "recent", label: "Recent" },
  { value: "popular", label: "Popular" },
  { value: "price_low", label: "Price: Low" },
  { value: "price_high", label: "Price: High" },
];

/**
 * Top controls for search results: entity type tabs, sort pills, and the
 * (mobile-only) Filters button that opens a bottom-sheet drawer reusing the
 * same SearchFilterPanel rendered in the desktop sidebar.
 */
export function SearchFilters({
  activeType,
  sortBy,
  resultCount,
  onTypeChange,
  onSortChange,
  className,
  ...panelProps
}: SearchFiltersProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Filters
        </p>
        {typeof resultCount === "number" && resultCount > 0 && (
          <p className="text-xs text-neutral-500">
            {resultCount.toLocaleString()} result{resultCount !== 1 ? "s" : ""}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto lg:hidden"
          onClick={() => setDrawerOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="Search results type"
        className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1"
      >
        {SEARCH_TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={activeType === f.value}
            onClick={() => onTypeChange(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0",
              activeType === f.value
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
        <span className="text-[11px] text-neutral-500 shrink-0 mr-1">Sort:</span>
        {sortOptions.map((s) => (
          <button
            key={s.value}
            onClick={() => onSortChange(s.value)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 border",
              sortBy === s.value
                ? "border-primary-600 bg-primary-50 text-primary-700"
                : "border-neutral-200 text-neutral-600 hover:bg-neutral-100"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Search filters"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-white rounded-t-2xl p-5 safe-bottom">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-neutral-900">
                Filters
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close filters"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
              >
                <X className="h-4 w-4 text-neutral-600" />
              </button>
            </div>
            <SearchFilterPanel {...panelProps} idPrefix="search-filters-drawer" />
            <Button
              className="w-full mt-6"
              onClick={() => setDrawerOpen(false)}
            >
              Show results{typeof resultCount === "number" ? ` (${resultCount.toLocaleString()})` : ""}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button, Select, Input } from "@/components/ui";
import { TaxonomySelect } from "@/components/taxonomy";
import {
  JOB_EXPERIENCE_LEVELS,
  JOB_WORK_ARRANGEMENT_OPTIONS,
  OPPORTUNITY_SORT_OPTIONS,
} from "@/config/opportunity";
import type { OpportunitySortKey, OpportunityWorkArrangement } from "@/types/opportunity";

export interface OpportunityFilterValues {
  search: string;
  categoryId: string;
  experience: string;
  arrangement: string;
  sort: OpportunitySortKey;
}

interface OpportunityFiltersProps {
  values: OpportunityFilterValues;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onExperienceChange: (value: string) => void;
  onArrangementChange: (value: string) => void;
  onSortChange: (value: OpportunitySortKey) => void;
  onReset: () => void;
}

function FilterFields({
  values,
  onCategoryChange,
  onExperienceChange,
  onArrangementChange,
}: Pick<
  OpportunityFiltersProps,
  "values" | "onCategoryChange" | "onExperienceChange" | "onArrangementChange"
>) {
  return (
    <>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700">Category</label>
        <TaxonomySelect
          type="JOB"
          value={values.categoryId}
          onChange={onCategoryChange}
          placeholder="All categories"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700">Experience</label>
        <Select
          value={values.experience}
          onChange={(e) => onExperienceChange(e.target.value)}
          placeholder="Any level"
        >
          {JOB_EXPERIENCE_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700">Work arrangement</label>
        <Select
          value={values.arrangement}
          onChange={(e) => onArrangementChange(e.target.value)}
          placeholder="Any"
        >
          {JOB_WORK_ARRANGEMENT_OPTIONS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </Select>
      </div>
    </>
  );
}

export function OpportunityFilters({
  values,
  onSearchChange,
  onCategoryChange,
  onExperienceChange,
  onArrangementChange,
  onSortChange,
  onReset,
}: OpportunityFiltersProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeFilterCount = ["categoryId", "experience", "arrangement"].filter(
    (k) => values[k as keyof OpportunityFilterValues]
  ).length;

  return (
    <div className="space-y-3">
      {/* Search + top controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input
            type="search"
            value={values.search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search jobs by title, skill or keyword"
            aria-label="Search jobs"
            className="w-full rounded-md border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <Select value={values.sort} onChange={(e) => onSortChange(e.target.value as OpportunitySortKey)}>
              {OPPORTUNITY_SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onReset} aria-label="Clear filters">
              Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" aria-hidden />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Desktop inline filter row */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-3">
        <FilterFields
          values={values}
          onCategoryChange={onCategoryChange}
          onExperienceChange={onExperienceChange}
          onArrangementChange={onArrangementChange}
        />
      </div>

      {/* Mobile filter sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden
            onClick={() => setSheetOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter opportunities"
            className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">Filters</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close filters"
                className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <FilterFields
                values={values}
                onCategoryChange={onCategoryChange}
                onExperienceChange={onExperienceChange}
                onArrangementChange={onArrangementChange}
              />
            </div>
            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onReset();
                  setSheetOpen(false);
                }}
              >
                Clear all
              </Button>
              <Button className="flex-1" onClick={() => setSheetOpen(false)}>
                Show results
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

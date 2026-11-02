"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { getCampuses } from "@/services/campus";
import { cn } from "@/lib/utils";

export interface SearchFilterPanelProps {
  campusId: string;
  priceMin?: number;
  priceMax?: number;
  onCampusChange: (campusId: string) => void;
  onPriceMinChange: (value?: number) => void;
  onPriceMaxChange: (value?: number) => void;
  onClear: () => void;
  className?: string;
  /** Unique id prefix so sidebar + mobile drawer instances don't duplicate DOM ids. */
  idPrefix?: string;
}

function parsePrice(input: string): number | undefined {
  const value = Number(input);
  return input.trim() === "" || !Number.isFinite(value) || value < 0
    ? undefined
    : value;
}

/** How long a price waits after the last keystroke before it searches. */
const PRICE_SETTLE_MS = 450;

/**
 * A price box that searches after a pause, not on every digit (typing "5000" would
 * otherwise run four searches, each asking every source). Returns the text to show and
 * the function to call as the person types.
 *
 * The text follows the address when it changes from elsewhere (a cleared filter, back and
 * forward) but not while a change is still waiting to be sent, so a reply to an earlier
 * digit can't overwrite what has been typed since.
 */
function usePriceInput(
  value: number | undefined,
  onCommit: (value?: number) => void
): [string, (text: string) => void] {
  const [text, setText] = useState(value?.toString() ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const commit = useRef(onCommit);
  commit.current = onCommit;

  useEffect(() => {
    if (timer.current === undefined) setText(value?.toString() ?? "");
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return [
    text,
    (next) => {
      setText(next);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = undefined;
        commit.current(parsePrice(next));
      }, PRICE_SETTLE_MS);
    },
  ];
}

/**
 * Shared filter content for the unified search: campus + price range.
 * Used in the desktop sidebar and inside the mobile filter drawer. Price
 * applies to priced entities only (products & services) — jobs, vendors,
 * providers, categories, posts and events have no list price, so they're
 * simply not matched when a range is set (backend-authoritative, honest).
 */
export function SearchFilterPanel({
  campusId,
  priceMin,
  priceMax,
  onCampusChange,
  onPriceMinChange,
  onPriceMaxChange,
  onClear,
  className,
  idPrefix = "search-filters",
}: SearchFilterPanelProps) {
  const [minInput, minTyping] = usePriceInput(priceMin, onPriceMinChange);
  const [maxInput, maxTyping] = usePriceInput(priceMax, onPriceMaxChange);

  const hasActiveFilters =
    !!campusId || priceMin !== undefined || priceMax !== undefined;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 uppercase tracking-wider">
          <SlidersHorizontal className="h-3.5 w-3.5 text-neutral-400" />
          Filters
        </h2>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      <Select
        label="Campus"
        id={`${idPrefix}-campus`}
        value={campusId}
        onChange={(e) => onCampusChange(e.target.value)}
        placeholder="All campuses"
      >
        {getCampuses().map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.abbreviation})
          </option>
        ))}
      </Select>

      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-neutral-700">
          Price range (₦)
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Min"
            aria-label="Minimum price"
            value={minInput}
            onChange={(e) => minTyping(e.target.value)}
          />
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Max"
            aria-label="Maximum price"
            value={maxInput}
            onChange={(e) => maxTyping(e.target.value)}
          />
        </div>
        <p className="text-[11px] text-neutral-500">
          Filters apply to priced listings (products &amp; services).
        </p>
      </fieldset>

      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          className="w-full lg:hidden"
          onClick={onClear}
        >
          Reset filters
        </Button>
      )}
    </div>
  );
}
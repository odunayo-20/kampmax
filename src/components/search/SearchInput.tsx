"use client";

import {
  FormEvent,
  KeyboardEvent,
  useId,
  useRef,
  useState,
} from "react";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchSuggestions } from "@/hooks/use-search";
import type { SearchSuggestion } from "@/types";

interface SearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit?: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

const SUGGESTION_TYPE_LABEL: Record<string, string> = {
  product: "Product",
  vendor: "Vendor",
  category: "Category",
  job: "Job",
  service: "Service",
  provider: "Provider",
  post: "Post",
  event: "Event",
};

/**
 * Controlled global-search input with type-ahead suggestions rendered as a
 * combobox (spec §18/§33 — keyboard navigable listbox, no focus trap).
 * Suggestions come from useSearchSuggestions ≥2 chars; selecting one
 * submits that text as the query, so the results URL always uses our exact
 * term.
 */
export function SearchInput({
  value,
  onValueChange,
  onSubmit,
  placeholder = "Search products, services, jobs, vendors…",
  autoFocus,
  className,
}: SearchInputProps) {
  const listboxId = useId();
  const optionIds = useRef(new Map<number, string>());
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const { data: suggestions = [], isFetching } = useSearchSuggestions(value);

  const showSuggestions = open && suggestions.length > 0;

  function optionId(index: number): string {
    if (!optionIds.current.has(index)) {
      optionIds.current.set(index, `${listboxId}-suggestion-${index}`);
    }
    return optionIds.current.get(index)!;
  }

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (activeIndex >= 0 && activeIndex < suggestions.length) {
      onSubmit?.(suggestions[activeIndex].text);
    } else {
      onSubmit?.(value);
    }
    optionIds.current.clear();
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) {
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-stretch overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
        <div className="flex items-center pl-3.5 text-neutral-400">
          <Search className="h-4 w-4" aria-hidden />
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex items-center">
          <input
            type="text"
            role="combobox"
            aria-label="Search Kampmax"
            aria-expanded={showSuggestions}
            aria-controls={showSuggestions ? listboxId : undefined}
            aria-activedescendant={
              showSuggestions && activeIndex >= 0
                ? optionId(activeIndex)
                : undefined
            }
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            value={value}
            autoFocus={autoFocus}
            onChange={(e) => {
              onValueChange(e.target.value);
              setActiveIndex(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={handleKeyDown}
            className="w-full min-w-0 bg-transparent px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          />
        </form>
        {isFetching && (
          <span className="flex items-center pr-2" role="status" aria-label="Looking for suggestions">
            <Loader2 className="h-4 w-4 animate-spin text-primary-500" aria-hidden />
          </span>
        )}
        {value && (
          <button
            onClick={() => {
              onValueChange("");
              setActiveIndex(-1);
              setOpen(false);
            }}
            aria-label="Clear search"
            className="flex items-center px-3 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showSuggestions && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-full mt-1.5 z-30 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
        >
          <ul className="py-1 max-h-80 overflow-y-auto">
            {suggestions.map((s: SearchSuggestion, index) => (
              <li role="option" id={optionId(index)} key={`${s.type}-${s.text}`}>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setActiveIndex(index);
                  }}
                  onClick={() => {
                    onSubmit?.(s.text);
                    optionIds.current.clear();
                    setOpen(false);
                    setActiveIndex(-1);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-3.5 py-2 text-left text-sm transition-colors",
                    activeIndex === index
                      ? "bg-primary-50 text-primary-800"
                      : "text-neutral-800"
                  )}
                >
                  <span className="truncate font-medium">{s.text}</span>
                  <span className="text-[11px] text-neutral-400 shrink-0">
                    {SUGGESTION_TYPE_LABEL[s.type] ?? s.type}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
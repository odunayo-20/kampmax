"use client";

import { ChevronDown } from "lucide-react";
import type { StoreSortOption } from "@/types/storefront";
import { cn } from "@/lib/utils";

interface StoreSortDropdownProps {
  value: StoreSortOption;
  onChange: (value: StoreSortOption) => void;
  className?: string;
}

const sortOptions: { value: StoreSortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

/** Store-scoped product sort control: the backend orders by newest or by price. */
export function StoreSortDropdown({ value, onChange, className }: StoreSortDropdownProps) {
  return (
    <div className={cn("relative", className)}>
      <label htmlFor="store-sort" className="sr-only">
        Sort products
      </label>
      <select
        id="store-sort"
        value={value}
        onChange={(e) => onChange(e.target.value as StoreSortOption)}
        className="appearance-none bg-white border border-kampmax-border rounded-lg px-3 py-2 pr-8 text-sm text-kampmax-text focus:outline-none focus:border-kampmax-blue cursor-pointer"
      >
        {sortOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-kampmax-text-secondary pointer-events-none" />
    </div>
  );
}

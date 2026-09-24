"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui";

interface OrdersToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function OrdersToolbar({
  searchValue,
  onSearchChange,
  hasActiveFilters,
  onClearFilters,
}: OrdersToolbarProps) {
  const [debouncedSearch, setDebouncedSearch] = useState(searchValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(debouncedSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [debouncedSearch, onSearchChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <label htmlFor="vendor-orders-search" className="sr-only">
          Search orders
        </label>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-kampmax-text-secondary" />
        <input
          id="vendor-orders-search"
          type="search"
          value={debouncedSearch}
          onChange={(e) => setDebouncedSearch(e.target.value)}
          placeholder="Search by order number or buyer…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-kampmax-border text-sm bg-white focus:outline-none focus:border-kampmax-blue"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters} className="gap-1.5">
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
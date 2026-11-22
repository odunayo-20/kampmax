"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFilterClick?: () => void;
  className?: string;
}

export function SearchBar({
  placeholder = "Search products, sellers...",
  value,
  onChange,
  onFilterClick,
  className,
}: SearchBarProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-kampmax-text-secondary" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full h-10 pl-9 pr-4 text-sm bg-white border border-kampmax-border rounded-lg focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue placeholder:text-kampmax-text-secondary"
        />
      </div>
      {onFilterClick && (
        <button
          onClick={onFilterClick}
          className="h-10 w-10 flex items-center justify-center bg-white border border-kampmax-border rounded-lg hover:bg-kampmax-muted transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4 text-kampmax-text-secondary" />
        </button>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { Package, SearchX } from "lucide-react";
import { Button } from "@/components/ui";
import { getCategories } from "@/services/categories";
import { useServiceCategories } from "@/hooks/useServiceMarketplace";
import { cn } from "@/lib/utils";

interface SearchEmptyStateProps {
  query: string;
  /** Whether any non-term filter is active (campus / price / type). */
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  className?: string;
}

/**
 * Honest empty state (spec §22): when nothing matches we say so, then offer
 * a path forward — Clear Filters when a filter reduced results to zero, and
 * category browsing whenever there are zero results at all. Never fabricates
 * results.
 */
export function SearchEmptyState({
  query,
  hasActiveFilters,
  onClearFilters,
  className,
}: SearchEmptyStateProps) {
  const serviceCategories = useServiceCategories();
  const browseLinks: { label: string; href: string }[] = [
    {
      label: "Marketplace",
      href: "/marketplace",
    },
    ...getCategories()
      .slice(0, 4)
      .map((c) => ({
        label: `${c.name} products`,
        href: `/marketplace?category=${c.id}`,
      })),
    ...serviceCategories.slice(0, 4).map((c) => ({
      label: `${c.name} services`,
      href: `/services/categories/${c.slug}`,
    })),
  ];

  return (
    <div className={cn("py-10 text-center", className)}>
      <div className="mx-auto w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
        <SearchX className="h-6 w-6 text-neutral-400" />
      </div>
      <h2 className="text-base font-semibold text-neutral-900">
        No results for &quot;{query}&quot;
      </h2>
      <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
        Try a different keyword, check the spelling, or browse by category
        below.
      </p>

      {hasActiveFilters && onClearFilters && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onClearFilters}>
          <Package className="h-3.5 w-3.5" />
          Clear filters
        </Button>
      )}

      <div className="mt-6 pt-6 border-t border-neutral-200">
        <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-3">
          Browse categories
        </h3>
        <div className="flex flex-wrap justify-center gap-2">
          {browseLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-full bg-neutral-50 border border-neutral-200 text-xs font-medium text-neutral-700 hover:border-primary-300 hover:text-primary-700 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
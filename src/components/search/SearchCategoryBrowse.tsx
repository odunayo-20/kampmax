"use client";

import Link from "next/link";
import { Briefcase, Package, Wrench } from "lucide-react";
import { getCategories } from "@/services/categories";
import { useServiceCategories } from "@/hooks/useServiceMarketplace";
import { cn } from "@/lib/utils";

/**
 * Landing hub shown before any search is performed (no query in URL).
 * Browse links reuse the authoritative category stores and route to the
 * existing category pages — a single source of truth, never duplicated
 * (Module 31 §12, §13).
 */
export function SearchCategoryBrowse({ className }: { className?: string }) {
  const marketplaceCategories = getCategories();
  const serviceCategories = useServiceCategories();

  return (
    <div className={cn("space-y-8", className)}>
      <section aria-label="Marketplace categories">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-neutral-100 flex items-center justify-center">
            <Package className="h-3.5 w-3.5 text-neutral-500" />
          </div>
          <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
            Browse products by category
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {marketplaceCategories.map((c) => (
            <Link
              key={c.id}
              href={`/marketplace/category/${c.id}`}
              className="group flex items-center gap-3 p-3 bg-white border border-neutral-200 rounded-xl hover:border-primary-300 hover:shadow-sm transition-all"
            >
              <span className="text-xl">{c.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate group-hover:text-primary-700 transition-colors">
                  {c.name}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {c.productCount} products
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Service categories">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-neutral-100 flex items-center justify-center">
            <Wrench className="h-3.5 w-3.5 text-neutral-500" />
          </div>
          <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
            Browse services by category
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {serviceCategories.map((c) => (
            <Link
              key={c.id}
              href={`/services/categories/${c.slug}`}
              className="group flex items-center gap-2 p-3 bg-white border border-neutral-200 rounded-xl hover:border-primary-300 hover:shadow-sm transition-all"
            >
              <span className="w-8 h-8 rounded-md bg-primary-50 flex items-center justify-center text-primary-700 text-sm font-bold shrink-0">
                {c.name.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate group-hover:text-primary-700 transition-colors">
                  {c.name}
                </p>
                <p className="text-[11px] text-neutral-500">{c.group}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Link
        href="/jobs"
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm font-semibold text-primary-700 hover:bg-primary-50 transition-colors w-fit"
      >
        <Briefcase className="h-4 w-4" />
        Browse all jobs
      </Link>
    </div>
  );
}
"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { ProductCard } from "@/components/marketplace";
import { SectionHeader } from "@/components/layout";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import { CardGridSkeleton } from "./Skeleton";
import { splitProducts, type ProductTabId } from "./product-lists";

const TABS: { id: ProductTabId; label: string }[] = [
  { id: "picks", label: "Picks" },
  { id: "new", label: "New" },
  { id: "deals", label: "Deals" },
];

/**
 * One marketplace section with a switch between Picks, New and Deals, in place of three
 * separate sections stacked down the page. A tab with nothing in it is left out.
 */
export function ProductShowcase({
  products,
  loading,
  campusAbbreviation,
}: {
  products: Product[];
  loading: boolean;
  campusAbbreviation?: string;
}) {
  const [selected, setSelected] = useState<ProductTabId>("picks");

  if (loading) return <CardGridSkeleton label="marketplace picks" />;

  const lists = splitProducts(products);
  const tabs = TABS.filter((tab) => lists[tab.id].length > 0);
  if (tabs.length === 0) return null;

  // If the chosen tab has emptied (new data, another campus), fall back to the first one.
  const active = tabs.find((tab) => tab.id === selected) ?? tabs[0];

  return (
    <section aria-label="Marketplace picks" className="space-y-3">
      <SectionHeader
        title="From the marketplace"
        subtitle={campusAbbreviation ? `Listed by ${campusAbbreviation} students and stores` : "Listed by students and stores"}
        icon={<Package className="h-4 w-4 text-primary-600" aria-hidden />}
        action={{ label: "See all", href: "/marketplace" }}
        className="mb-0"
      />

      {tabs.length > 1 && (
        <div role="group" aria-label="Choose a list" className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelected(tab.id)}
              aria-pressed={tab.id === active.id}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2",
                tab.id === active.id
                  ? "bg-primary-600 text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {lists[active.id].map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

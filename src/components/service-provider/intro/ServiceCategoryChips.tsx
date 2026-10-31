"use client";

import { useCategoryTree } from "@/hooks/use-taxonomy";
import { Skeleton } from "@/components/ui/Skeleton";

const PLACEHOLDER_CHIPS = 8;

/**
 * "What can you offer?" — the real service categories, the same ones the category
 * step lets a provider choose from, so this list can't drift from what is on offer.
 * If they can't be loaded the whole section is left out rather than showing a guess.
 */
export function ServiceCategoryChips() {
  const { data: categories = [], isPending, isError } = useCategoryTree("SERVICE");

  if (isError || (!isPending && categories.length === 0)) return null;

  return (
    <section className="mb-12 lg:mb-16" aria-labelledby="offer-heading">
      <h2 id="offer-heading" className="mb-2 text-center text-2xl font-bold text-kampmax-text">
        What can you offer?
      </h2>
      <p className="mx-auto mb-8 max-w-2xl text-center text-kampmax-text-secondary">
        If it&apos;s a service students need, there&apos;s probably a place for it. You choose your
        categories in step 3.
      </p>

      {isPending ? (
        <div className="flex flex-wrap justify-center gap-2" role="status" aria-label="Loading categories">
          {Array.from({ length: PLACEHOLDER_CHIPS }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-36 rounded-full" />
          ))}
        </div>
      ) : (
        <ul className="flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className="inline-flex items-center gap-2 rounded-full border border-kampmax-border bg-white px-4 py-2 text-sm font-medium text-kampmax-text"
            >
              {category.icon && <span aria-hidden>{category.icon}</span>}
              {category.name}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

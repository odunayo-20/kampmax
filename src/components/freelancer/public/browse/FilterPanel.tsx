import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaxonomyNode } from "@/services/taxonomy";
import {
  PRICING_FILTERS,
  browseHref,
  showCategory,
  subtreeCount,
  type BrowseFilters,
  type CategoryCounts,
} from "./filters";

function Option({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
        active ? "bg-primary-50 font-semibold text-primary-700" : "text-kampmax-text hover:bg-neutral-100"
      )}
    >
      <span className="truncate">{children}</span>
      {count !== undefined && (
        <span className={cn("shrink-0 text-xs tabular-nums", active ? "text-primary-600" : "text-kampmax-text-secondary")}>
          {count}
        </span>
      )}
    </Link>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="px-3 text-xs font-bold uppercase tracking-wide text-kampmax-text-secondary">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

interface OptionsProps {
  tree: TaxonomyNode[];
  /** Live services per category; null if unavailable (numbers are then left out). */
  counts: CategoryCounts | null;
  filters: BrowseFilters;
  selected?: TaxonomyNode;
  activeRoot?: TaxonomyNode;
}

/** The filter choices themselves: a category list that opens the chosen category, and pricing types. */
function FilterOptions({ tree, counts, filters, selected, activeRoot }: OptionsProps) {
  // The category you're in stays listed even if a search left it empty.
  const keep = [selected?.id, activeRoot?.id].filter((id): id is string => !!id);
  const countOf = (node: TaxonomyNode) => (counts ? subtreeCount(node, counts) : undefined);
  const allCount = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined;

  return (
    <div className="space-y-6">
      {tree.length > 0 && (
        <Group title="Category">
          <ul>
            <li>
              <Option href={browseHref(filters, { category: "" })} active={!selected} count={allCount}>
                All categories
              </Option>
            </li>
            {tree
              .filter((root) => showCategory(root, counts, keep))
              .map((root) => (
                <li key={root.id}>
                  <Option
                    href={browseHref(filters, { category: root.slug })}
                    active={selected?.id === root.id}
                    count={countOf(root)}
                  >
                    {root.name}
                  </Option>
                  {activeRoot?.id === root.id && (
                    <ul className="my-1 ml-4 border-l border-kampmax-border pl-2">
                      {root.children
                        .filter((child) => showCategory(child, counts, keep))
                        .map((child) => (
                          <li key={child.id}>
                            <Option
                              href={browseHref(filters, { category: child.slug })}
                              active={selected?.id === child.id}
                              count={countOf(child)}
                            >
                              {child.name}
                            </Option>
                          </li>
                        ))}
                    </ul>
                  )}
                </li>
              ))}
          </ul>
        </Group>
      )}

      <Group title="Pricing">
        <ul>
          {[["", "Any"] as const, ...PRICING_FILTERS].map(([value, label]) => (
            <li key={value || "any"}>
              <Option href={browseHref(filters, { pricing: value })} active={filters.pricing === value}>
                {label}
              </Option>
            </li>
          ))}
        </ul>
      </Group>
    </div>
  );
}

/**
 * Filters for the browse page. On large screens they sit in a sidebar beside the
 * results; on phones the same options fold into a "Filters" panel so results stay
 * at the top. (A <details> element, so it needs no JavaScript.)
 */
export function FilterPanel({ activeCount, ...options }: OptionsProps & { activeCount: number }) {
  return (
    <>
      <aside aria-label="Filters" className="hidden lg:sticky lg:top-6 lg:block lg:self-start">
        <FilterOptions {...options} />
      </aside>

      <details className="group rounded-lg border border-kampmax-border bg-white lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-kampmax-text [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-primary-600 px-2 py-0.5 text-[11px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </span>
          <span className="text-xs font-medium text-primary-600 group-open:hidden">Show</span>
          <span className="hidden text-xs font-medium text-primary-600 group-open:inline">Hide</span>
        </summary>
        <div className="border-t border-kampmax-border p-3">
          <FilterOptions {...options} />
        </div>
      </details>
    </>
  );
}

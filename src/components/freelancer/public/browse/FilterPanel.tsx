import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaxonomyNode } from "@/services/taxonomy";
import { PRICING_FILTERS, browseHref, type BrowseFilters } from "./filters";

function Option({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "block rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
        active
          ? "bg-primary-50 font-semibold text-primary-700"
          : "text-kampmax-text hover:bg-neutral-100"
      )}
    >
      {children}
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

/** The filter choices themselves: a category list that opens the chosen category, and pricing types. */
function FilterOptions({
  tree,
  filters,
  selected,
  activeRoot,
}: {
  tree: TaxonomyNode[];
  filters: BrowseFilters;
  selected?: TaxonomyNode;
  activeRoot?: TaxonomyNode;
}) {
  return (
    <div className="space-y-6">
      {tree.length > 0 && (
        <Group title="Category">
          <ul>
            <li>
              <Option href={browseHref(filters, { category: "" })} active={!selected}>
                All categories
              </Option>
            </li>
            {tree.map((root) => {
              const open = activeRoot?.id === root.id;
              return (
                <li key={root.id}>
                  <Option href={browseHref(filters, { category: root.slug })} active={selected?.id === root.id}>
                    {root.name}
                  </Option>
                  {open && root.children.length > 0 && (
                    <ul className="my-1 ml-4 border-l border-kampmax-border pl-2">
                      {root.children.map((child) => (
                        <li key={child.id}>
                          <Option href={browseHref(filters, { category: child.slug })} active={selected?.id === child.id}>
                            {child.name}
                          </Option>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
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
export function FilterPanel(props: React.ComponentProps<typeof FilterOptions> & { activeCount: number }) {
  const { activeCount, ...options } = props;
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

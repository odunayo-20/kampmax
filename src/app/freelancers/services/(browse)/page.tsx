import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { BrowseTabs } from "@/components/freelancer/public/BrowseTabs";
import { PublicServiceCard } from "@/components/freelancer/public/PublicServiceCard";
import { ActiveFilters } from "@/components/freelancer/public/browse/ActiveFilters";
import { FilterPanel } from "@/components/freelancer/public/browse/FilterPanel";
import { SearchBox } from "@/components/freelancer/public/SearchBox";
import { SortSelect } from "@/components/freelancer/public/browse/SortSelect";
import { SORTS, browseHref, parseFilters } from "@/components/freelancer/public/browse/filters";
import { fetchPublicCategoryCounts, fetchPublicServices } from "@/services/freelancer-services";
import { fetchTaxonomyTree, findTaxonomyNode, subtreeNodes, type TaxonomyNode } from "@/services/taxonomy";

export const metadata: Metadata = {
  title: "Freelancer services | Kampmax",
  description: "Browse services offered by campus freelancers — design, development, writing and more.",
};

const PAGE_SIZE = 12;

export default async function FreelancerServicesBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filters = parseFilters(await searchParams);

  // Categories and their counts are optional decoration: if they fail to load, the listing still works.
  const [tree, counts]: [TaxonomyNode[], Record<string, number> | null] = await Promise.all([
    fetchTaxonomyTree("SERVICE").catch((): TaxonomyNode[] => []),
    fetchPublicCategoryCounts({ q: filters.q || undefined, pricing: filters.pricing || undefined }),
  ]);
  const selected = filters.category ? findTaxonomyNode(tree, filters.category) : undefined;
  const activeRoot = selected
    ? tree.find((root) => subtreeNodes(root).some((n) => n.id === selected.id))
    : undefined;

  const { items, total, totalPages, failed } = await fetchPublicServices({
    q: filters.q || undefined,
    // Picking a category also matches everything inside it.
    categoryIds: selected ? subtreeNodes(selected).map((n) => n.id) : undefined,
    pricing: filters.pricing || undefined,
    sort: filters.sort,
    page: filters.page,
    limit: PAGE_SIZE,
  });

  const activeCount = [filters.q, selected, filters.pricing].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <BrowseTabs active="services" />
      <h1 className="mt-5 text-2xl font-bold text-kampmax-text sm:text-3xl">Freelancer services</h1>
      <p className="mt-1 text-sm text-kampmax-text-secondary">
        Ready-made services from campus freelancers. Open one to see what&apos;s included, then message them.
      </p>

      <div className="mt-5">
        <SearchBox
          action="/freelancers/services"
          value={filters.q}
          params={{
            category: filters.category,
            pricing: filters.pricing,
            sort: filters.sort === "newest" ? "" : filters.sort,
          }}
          placeholder="What do you need? e.g. logo design, website"
          label="Search services"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        <FilterPanel
          tree={tree}
          counts={counts}
          filters={filters}
          selected={selected}
          activeRoot={activeRoot}
          activeCount={activeCount}
        />

        <section aria-label="Results" className="min-w-0 space-y-4">
          {!failed && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-kampmax-text-secondary" aria-live="polite">
                <span className="font-semibold text-kampmax-text">{total}</span> service{total === 1 ? "" : "s"}
                {selected ? ` in ${selected.name}` : ""}
              </p>
              <SortSelect
                value={filters.sort}
                options={SORTS.map((s) => ({ ...s, href: browseHref(filters, { sort: s.value }) }))}
              />
            </div>
          )}

          <ActiveFilters filters={filters} categoryName={selected?.name} />

          {failed ? (
            <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-8 text-center text-sm text-kampmax-text-secondary">
              We couldn&apos;t load services right now.{" "}
              <Link href={browseHref(filters)} className="font-semibold text-primary-600 hover:underline">
                Try again
              </Link>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-kampmax-border bg-white px-6 py-14 text-center">
              <SearchX className="h-8 w-8 text-neutral-300" aria-hidden />
              <h2 className="mt-3 text-base font-bold text-kampmax-text">
                {activeCount > 0 ? "No services match your filters" : "No services yet"}
              </h2>
              <p className="mt-1 max-w-sm text-sm text-kampmax-text-secondary">
                {activeCount > 0
                  ? "Try a different word, or remove a filter."
                  : "Freelancers are still setting up. In the meantime you can browse the freelancers themselves."}
              </p>
              <Link
                href={activeCount > 0 ? "/freelancers/services" : "/freelancers"}
                className="mt-5 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                {activeCount > 0 ? "Clear all filters" : "Browse freelancers"}
              </Link>
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((service) => (
                <li key={service.id}>
                  <PublicServiceCard service={service} />
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-3 pt-4 text-sm">
              {filters.page > 1 && (
                <Link href={browseHref(filters, { page: filters.page - 1 })} className="rounded-md border border-kampmax-border px-3 py-1.5 hover:bg-neutral-50">
                  Previous
                </Link>
              )}
              <span className="text-kampmax-text-secondary">
                Page {filters.page} of {totalPages}
              </span>
              {filters.page < totalPages && (
                <Link href={browseHref(filters, { page: filters.page + 1 })} className="rounded-md border border-kampmax-border px-3 py-1.5 hover:bg-neutral-50">
                  Next
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}

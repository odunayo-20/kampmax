import type { Metadata } from "next";
import Link from "next/link";
import { Search, SearchX } from "lucide-react";
import { BrowseTabs } from "@/components/freelancer/public/BrowseTabs";
import { PublicServiceCard } from "@/components/freelancer/public/PublicServiceCard";
import { ActiveFilters } from "@/components/freelancer/public/browse/ActiveFilters";
import { FilterPanel } from "@/components/freelancer/public/browse/FilterPanel";
import { SortSelect } from "@/components/freelancer/public/browse/SortSelect";
import { SORTS, browseHref, parseFilters } from "@/components/freelancer/public/browse/filters";
import { fetchPublicServices } from "@/services/freelancer-services";
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

  // Categories are optional decoration: if they fail to load, the listing still works.
  const tree: TaxonomyNode[] = await fetchTaxonomyTree("SERVICE").catch(() => []);
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

      <form method="get" action="/freelancers/services" role="search" className="mt-5 flex gap-2">
        {filters.category && <input type="hidden" name="category" value={filters.category} />}
        {filters.pricing && <input type="hidden" name="pricing" value={filters.pricing} />}
        {filters.sort !== "newest" && <input type="hidden" name="sort" value={filters.sort} />}
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="What do you need? e.g. logo design, website"
            aria-label="Search services"
            className="h-11 w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 text-sm shadow-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
          />
        </div>
        <button type="submit" className="h-11 rounded-md bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700">
          Search
        </button>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        <FilterPanel tree={tree} filters={filters} selected={selected} activeRoot={activeRoot} activeCount={activeCount} />

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

"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AccommodationListingCard } from "@/components/accommodation/AccommodationListingCard";
import {
  useAccommodationCatalog,
  useAccommodationListings,
  useSaveAccommodationListing,
  useSavedAccommodationListings,
  useUnsaveAccommodationListing,
} from "@/hooks/use-accommodation";
import { useAuth } from "@/lib/auth-context";
import { BEDROOM_FILTERS, HOUSING_EMPTY, HOUSING_LOAD_ERROR, HOUSING_SAFETY_NOTE } from "@/lib/accommodation-text";
import type { AccommodationSearchQuery } from "@/services/accommodation";

const PAGE_SIZE = 12;

export function AccommodationBrowser() {
  const [text, setText] = useState("");
  const [city, setCity] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [category, setCategory] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [sort, setSort] = useState<AccommodationSearchQuery["sort"]>("newest");
  const [page, setPage] = useState(1);
  const catalog = useAccommodationCatalog();
  const query: AccommodationSearchQuery = {
    ...(text.trim() ? { q: text.trim() } : {}),
    ...(city.trim() ? { city: city.trim() } : {}),
    ...(maxRent && Number.isFinite(Number(maxRent)) ? { maxRent: Number(maxRent) } : {}),
    ...(category ? { category } : {}),
    ...(bedrooms ? { bedrooms: Number(bedrooms) } : {}),
    sort,
    page,
    limit: PAGE_SIZE,
  };
  const listings = useAccommodationListings(query);
  const router = useRouter();
  const { status } = useAuth();
  const signedIn = status === "authenticated";
  // The saved list's first page, as on the listing page.
  const saved = useSavedAccommodationListings();
  const save = useSaveAccommodationListing();
  const unsave = useUnsaveAccommodationListing();
  const savedIds = new Set((saved.data?.items ?? []).flatMap((entry) => (entry.available ? [entry.listing.id] : [])));
  const filtered = !!(text.trim() || city.trim() || maxRent || category || bedrooms || sort !== "newest");

  function toggleSave(id: string) {
    if (!signedIn) {
      router.push(`/login?returnTo=${encodeURIComponent("/accommodation")}`);
      return;
    }
    if (savedIds.has(id)) unsave.mutate(id);
    else save.mutate(id);
  }

  function clearFilters() {
    setText("");
    setCity("");
    setMaxRent("");
    setCategory("");
    setBedrooms("");
    setSort("newest");
    setPage(1);
  }

  function resetPage() {
    setPage(1);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-kampmax-text">Find a place to live</h1>
          <p className="mt-2 max-w-2xl text-sm text-kampmax-text-secondary">{HOUSING_SAFETY_NOTE}</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-lg border border-kampmax-border px-3 py-2 text-sm hover:bg-white" href="/accommodation/saved">
            Saved
          </Link>
          <Link className="rounded-lg border border-kampmax-border px-3 py-2 text-sm hover:bg-white" href="/accommodation/my-enquiries">
            My enquiries
          </Link>
          <Link className="rounded-lg bg-kampmax-blue px-3 py-2 text-sm font-semibold text-white hover:opacity-90" href="/onboarding/agent">
            List a property
          </Link>
        </div>
      </div>

      <section aria-label="Search accommodation" className="mb-6 grid gap-3 rounded-xl border border-kampmax-border bg-white p-4 sm:grid-cols-3 lg:grid-cols-6">
        <label className="text-xs font-medium text-kampmax-text-secondary">
          Search
          <input
            className="mt-1 block w-full rounded-md border border-kampmax-border px-3 py-2 text-sm text-kampmax-text"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              resetPage();
            }}
            placeholder="Title or neighbourhood"
          />
        </label>
        <label className="text-xs font-medium text-kampmax-text-secondary">
          City
          <input
            className="mt-1 block w-full rounded-md border border-kampmax-border px-3 py-2 text-sm text-kampmax-text"
            value={city}
            onChange={(event) => {
              setCity(event.target.value);
              resetPage();
            }}
            placeholder="Any city"
          />
        </label>
        <label className="text-xs font-medium text-kampmax-text-secondary">
          Property type
          <select
            className="mt-1 block w-full rounded-md border border-kampmax-border bg-white px-3 py-2 text-sm text-kampmax-text"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              resetPage();
            }}
          >
            <option value="">All types</option>
            {(catalog.data?.categories ?? []).map((item) => (
              <option key={item.id} value={item.slug}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-kampmax-text-secondary">
          Maximum rent (₦)
          <input
            inputMode="numeric"
            min="0"
            type="number"
            className="mt-1 block w-full rounded-md border border-kampmax-border px-3 py-2 text-sm text-kampmax-text"
            value={maxRent}
            onChange={(event) => {
              setMaxRent(event.target.value);
              resetPage();
            }}
            placeholder="No limit"
          />
        </label>
        <label className="text-xs font-medium text-kampmax-text-secondary">
          Bedrooms
          <select
            className="mt-1 block w-full rounded-md border border-kampmax-border bg-white px-3 py-2 text-sm text-kampmax-text"
            value={bedrooms}
            onChange={(event) => {
              setBedrooms(event.target.value);
              resetPage();
            }}
          >
            {BEDROOM_FILTERS.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-kampmax-text-secondary">
          Sort by
          <select
            className="mt-1 block w-full rounded-md border border-kampmax-border bg-white px-3 py-2 text-sm text-kampmax-text"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as AccommodationSearchQuery["sort"]);
              resetPage();
            }}
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Rent: low to high</option>
            <option value="price_desc">Rent: high to low</option>
          </select>
        </label>
      </section>

      {listings.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-xl bg-kampmax-muted" />
          ))}
        </div>
      ) : listings.isError ? (
        <section role="alert" className="rounded-xl border border-kampmax-border bg-white p-6 text-center text-sm">
          <p className="font-semibold text-kampmax-text">{HOUSING_LOAD_ERROR.title}</p>
          <p className="mt-1 text-kampmax-text-secondary">{HOUSING_LOAD_ERROR.text}</p>
          <button type="button" className="mt-3 font-semibold text-kampmax-blue hover:underline" onClick={() => void listings.refetch()}>
            Try again
          </button>
        </section>
      ) : listings.data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-kampmax-border bg-white p-10 text-center">
          <h2 className="font-semibold text-kampmax-text">{HOUSING_EMPTY.title}</h2>
          <p className="mt-2 text-sm text-kampmax-text-secondary">{HOUSING_EMPTY.text}</p>
          {filtered && (
            <button type="button" onClick={clearFilters} className="mt-4 rounded-lg border border-kampmax-border px-4 py-2 text-sm font-semibold hover:bg-kampmax-muted/40">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-kampmax-text-secondary">
            {listings.data.meta.total} {listings.data.meta.total === 1 ? "place" : "places"}
          </p>
          {(save.isError || unsave.isError) && (
            <p role="alert" className="mb-3 text-sm text-error-600">
              Couldn&apos;t update your saved homes. Check your connection and try again.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.data.items.map((listing) => (
              <AccommodationListingCard
                key={listing.id}
                listing={listing}
                saved={savedIds.has(listing.id)}
                saving={(save.isPending && save.variables === listing.id) || (unsave.isPending && unsave.variables === listing.id)}
                onToggleSave={() => toggleSave(listing.id)}
              />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-lg border border-kampmax-border px-4 py-2 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-kampmax-text-secondary">
              Page {listings.data.meta.page} of {Math.max(1, listings.data.meta.totalPages)}
            </span>
            <button
              type="button"
              disabled={page >= listings.data.meta.totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg border border-kampmax-border px-4 py-2 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </main>
  );
}

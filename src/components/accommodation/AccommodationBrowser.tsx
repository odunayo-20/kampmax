"use client";

import Link from "next/link";
import { useState } from "react";
import { AccommodationListingCard } from "@/components/accommodation/AccommodationListingCard";
import { useAccommodationCatalog, useAccommodationListings } from "@/hooks/use-accommodation";
import type { AccommodationSearchQuery } from "@/services/accommodation";

const PAGE_SIZE = 12;

export function AccommodationBrowser() {
  const [text, setText] = useState("");
  const [city, setCity] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<AccommodationSearchQuery["sort"]>("newest");
  const [page, setPage] = useState(1);
  const catalog = useAccommodationCatalog();
  const query: AccommodationSearchQuery = {
    ...(text.trim() ? { q: text.trim() } : {}),
    ...(city.trim() ? { city: city.trim() } : {}),
    ...(maxRent && Number.isFinite(Number(maxRent)) ? { maxRent: Number(maxRent) } : {}),
    ...(category ? { category } : {}),
    sort,
    page,
    limit: PAGE_SIZE,
  };
  const listings = useAccommodationListings(query);

  function resetPage() {
    setPage(1);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-kampmax-blue">
            Kampmax accommodation
          </p>
          <h1 className="text-3xl font-bold text-kampmax-text">Find a place to live</h1>
          <p className="mt-2 max-w-2xl text-sm text-kampmax-text-secondary">
            Browse current rooms and apartments from approved accommodation agents.
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-lg border border-kampmax-border px-3 py-2 text-sm hover:bg-white" href="/accommodation/saved">
            Saved
          </Link>
          <Link className="rounded-lg bg-kampmax-blue px-3 py-2 text-sm font-semibold text-white hover:opacity-90" href="/accommodation/agent">
            List a property
          </Link>
        </div>
      </div>

      <section aria-label="Search accommodation" className="mb-6 grid gap-3 rounded-xl border border-kampmax-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
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
        <section role="alert" className="rounded-xl border border-red-200 bg-white p-6 text-sm text-red-700">
          <p>Accommodation listings could not be loaded: {listings.error.message}</p>
          <button type="button" className="mt-3 underline" onClick={() => void listings.refetch()}>
            Try again
          </button>
        </section>
      ) : listings.data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-kampmax-border bg-white p-10 text-center">
          <h2 className="font-semibold text-kampmax-text">No places match those filters</h2>
          <p className="mt-2 text-sm text-kampmax-text-secondary">Try another city, property type or rent range.</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-kampmax-text-secondary">
            {listings.data.meta.total} {listings.data.meta.total === 1 ? "place" : "places"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.data.items.map((listing) => (
              <AccommodationListingCard key={listing.id} listing={listing} />
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

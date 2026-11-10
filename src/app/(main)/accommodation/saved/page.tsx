"use client";

import Link from "next/link";
import { AccommodationListingCard } from "@/components/accommodation/AccommodationListingCard";
import { useSavedAccommodationListings, useUnsaveAccommodationListing } from "@/hooks/use-accommodation";

export default function SavedAccommodationPage() {
  const saved = useSavedAccommodationListings();
  const unsave = useUnsaveAccommodationListing();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/accommodation" className="text-sm text-kampmax-blue hover:underline">← Find accommodation</Link>
      <h1 className="mt-3 text-3xl font-bold text-kampmax-text">Saved places</h1>
      <p className="mt-2 text-sm text-kampmax-text-secondary">Listings you saved for later.</p>

      {saved.isPending ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-72 animate-pulse rounded-xl bg-kampmax-muted" />)}
        </div>
      ) : saved.isError ? (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-white p-5 text-sm text-red-700">
          Your saved places could not be loaded: {saved.error.message}
        </p>
      ) : saved.data.items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-kampmax-border bg-white p-10 text-center">
          <p className="font-semibold text-kampmax-text">Nothing saved yet</p>
          <Link href="/accommodation" className="mt-3 inline-block text-sm text-kampmax-blue underline">Browse accommodation</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {saved.data.items.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-kampmax-border bg-white p-4">
              {entry.available ? (
                <>
                  <AccommodationListingCard listing={entry.listing} />
                  <button
                    type="button"
                    disabled={unsave.isPending}
                    onClick={() => unsave.mutate(entry.listing.id)}
                    className="mt-3 text-sm text-red-700 underline disabled:opacity-50"
                  >
                    Remove saved place
                  </button>
                </>
              ) : (
                <div className="rounded-lg bg-kampmax-bg p-4">
                  <p className="font-medium text-kampmax-text">{entry.listing.title || "Listing no longer available"}</p>
                  <p className="mt-1 text-xs text-kampmax-text-secondary">This place is no longer available to view.</p>
                  <button
                    type="button"
                    disabled={unsave.isPending}
                    onClick={() => unsave.mutate(entry.listing.id)}
                    className="mt-3 text-xs text-red-700 underline disabled:opacity-50"
                  >
                    Remove from saved
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {unsave.error && <p role="alert" className="mt-4 text-sm text-red-700">{unsave.error.message}</p>}
    </main>
  );
}

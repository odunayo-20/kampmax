"use client";

import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ImageIcon, Plus } from "lucide-react";
import {
  useAccommodationCatalog,
  useAccommodationProperties,
  useAgentAccommodationListings,
} from "@/hooks/use-accommodation";
import { AccommodationListingManager } from "@/components/accommodation/AccommodationListingManager";
import { ListingFormPanel } from "@/components/accommodation/ListingFormPanel";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoadError, Pill } from "@/components/accommodation/enquiry-parts";
import { LISTING_FILTERS, LISTINGS_EMPTY, listingMatches, listingStatus, NEEDS_PROPERTY, placeLine, rentLine, type ListingFilter } from "@/lib/agent-listings";
import { formatNaira } from "@/lib/utils";

/**
 * The agent's listings: a filtered list of cards, and the one picked open beside it. `?new=1` opens the form for a
 * new listing straight away, for "Add a room" on the hub; `?open=<id>` opens that listing. The same screen as the mobile app's agent-listings.
 */
export default function AgentListingsPage({ searchParams }: { searchParams: Promise<{ new?: string; open?: string }> }) {
  const { new: openNew, open: openId } = use(searchParams);
  const [showForm, setShowForm] = useState(openNew === "1");
  const [filter, setFilter] = useState<ListingFilter>("all");
  const [picked, setPicked] = useState<string | undefined>(openId);
  const catalogQuery = useAccommodationCatalog();
  const propertiesQuery = useAccommodationProperties(1, true);
  const listingsQuery = useAgentAccommodationListings(1, true);

  const properties = propertiesQuery.data?.items ?? [];
  const packages = catalogQuery.data?.packages ?? [];
  const items = listingsQuery.data?.items ?? [];
  const shown = items.filter((l) => listingMatches(l, filter));
  const open = items.find((l) => l.id === (picked ?? shown[0]?.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-kampmax-text">Listings</h1>
          <p className="mt-1 text-sm text-kampmax-text-secondary">One listing per room. Students see it once it is approved and paid for.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((c) => !c)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-kampmax-blue px-4 py-2 text-xs font-semibold text-white hover:bg-kampmax-blue/90"
        >
          {showForm ? "Close" : <><Plus className="h-4 w-4" aria-hidden /> New listing</>}
        </button>
      </div>

      {showForm &&
        (properties.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <h2 className="text-sm font-bold text-amber-900">{NEEDS_PROPERTY.title}</h2>
            <p className="mt-1 text-xs text-amber-800">{NEEDS_PROPERTY.text}</p>
            <Link href="/agent/properties" className="mt-3 inline-flex rounded-xl bg-kampmax-blue px-4 py-2 text-xs font-semibold text-white">
              Add a property
            </Link>
          </div>
        ) : (
          <ListingFormPanel
            mode="create"
            properties={properties}
            listings={items}
            onCancel={() => setShowForm(false)}
            onCreated={(id) => {
              // The new draft opens in the panel, ready to publish.
              setShowForm(false);
              setFilter("all");
              setPicked(id);
            }}
          />
        ))}

      {listingsQuery.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : listingsQuery.isError ? (
        <LoadError what="load your listings" error={listingsQuery.error} onRetry={() => void listingsQuery.refetch()} />
      ) : items.length === 0 ? (
        !showForm && (
          <div className="rounded-2xl border border-dashed border-kampmax-border bg-white p-10 text-center">
            <h2 className="text-base font-bold text-kampmax-text">{LISTINGS_EMPTY.title}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-kampmax-text-secondary">{LISTINGS_EMPTY.text}</p>
            <button type="button" onClick={() => setShowForm(true)} className="mt-4 rounded-xl bg-kampmax-blue px-4 py-2 text-xs font-semibold text-white">
              Create a listing
            </button>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Show">
            {LISTING_FILTERS.map((f) => {
              const count = items.filter((l) => listingMatches(l, f.id)).length;
              const on = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => { setFilter(f.id); setPicked(undefined); }}
                  className={`rounded-full border px-3 py-1 text-sm ${on ? "border-kampmax-blue bg-kampmax-blue text-white" : "border-kampmax-border bg-white text-kampmax-text hover:bg-kampmax-bg"}`}
                >
                  {f.label}
                  {count > 0 && <span className="ml-1.5 opacity-80">{count}</span>}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
            <ul className="space-y-2" aria-label="Listings">
              {shown.length === 0 && <li className="text-sm text-kampmax-text-secondary">Nothing here.</li>}
              {shown.map((l) => {
                const s = listingStatus(l);
                const on = l.id === open?.id;
                const photo = l.media[0]?.url;
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      aria-current={on ? "true" : undefined}
                      onClick={() => setPicked(l.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${on ? "border-kampmax-blue bg-blue-50/40" : "border-kampmax-border bg-white hover:bg-kampmax-bg"}`}
                    >
                      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-kampmax-muted">
                        {photo ? (
                          <Image src={photo} alt="" fill unoptimized sizes="64px" className="object-cover" />
                        ) : (
                          <ImageIcon className="absolute inset-0 m-auto h-5 w-5 text-kampmax-text-secondary" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 block text-sm font-semibold text-kampmax-text">{l.title}</span>
                        <span className="block truncate text-xs text-kampmax-text-secondary">{placeLine(l)}</span>
                        <span className="block text-xs font-semibold text-kampmax-blue">{rentLine(l, formatNaira)}</span>
                        <span className="mt-1 block"><Pill label={s.label} tone={s.tone} /></span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {open && (
              <div className="rounded-2xl border border-kampmax-border bg-white px-4">
                <AccommodationListingManager key={open.id} listing={open} packages={packages} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

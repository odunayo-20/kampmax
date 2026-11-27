"use client";

import { FormEvent, use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ClipboardList, ImageIcon, Plus } from "lucide-react";
import {
  useAccommodationCatalog,
  useAccommodationProperties,
  useAgentAccommodationListings,
  useCreateAccommodationListing,
} from "@/hooks/use-accommodation";
import { accommodationApi } from "@/services/accommodation";
import type { AccommodationPaymentFrequency } from "@/types/accommodation";
import { AccommodationListingManager } from "@/components/accommodation/AccommodationListingManager";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoadError, Pill } from "@/components/accommodation/enquiry-parts";
import { LISTING_FILTERS, LISTINGS_EMPTY, listingMatches, listingStatus, NEEDS_PROPERTY, placeLine, rentLine, type ListingFilter } from "@/lib/agent-listings";
import { formatNaira } from "@/lib/utils";

function ListingForm({
  properties,
  amenities,
  onSuccess,
}: {
  properties: { id: string; title: string; units: { id: string; unitName: string; unitType: string }[] }[];
  amenities: { id: string; name: string }[];
  onSuccess?: () => void;
}) {
  const create = useCreateAccommodationListing();
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [unitId, setUnitId] = useState("");
  const [amenityIds, setAmenityIds] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [data, setData] = useState({
    title: "",
    description: "",
    rentAmount: "",
    paymentFrequency: "ANNUALLY" as AccommodationPaymentFrequency,
    cautionFee: "",
    agencyFee: "",
    agreementFee: "",
    otherCharges: "",
  });

  const selectedProperty = properties.find((p) => p.id === propertyId);
  const units = selectedProperty?.units ?? [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    try {
      const uploaded = await Promise.all(
        files.map((file) => accommodationApi.uploadListingImage(file))
      );
      await create.mutateAsync({
        propertyId,
        unitId,
        title: data.title.trim(),
        description: data.description.trim() || undefined,
        rentAmount: Number(data.rentAmount),
        paymentFrequency: data.paymentFrequency as AccommodationPaymentFrequency,
        cautionFee: Number(data.cautionFee || 0),
        agencyFee: Number(data.agencyFee || 0),
        agreementFee: Number(data.agreementFee || 0),
        otherCharges: Number(data.otherCharges || 0),
        media: uploaded.map((m) => ({ mediaId: m.id })),
        amenityIds,
      });
      setData({
        title: "",
        description: "",
        rentAmount: "",
        paymentFrequency: "ANNUALLY" as AccommodationPaymentFrequency,
        cautionFee: "",
        agencyFee: "",
        agreementFee: "",
        otherCharges: "",
      });
      setFiles([]);
      setAmenityIds([]);
      onSuccess?.();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "The listing could not be saved.");
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="rounded-2xl border border-kampmax-border bg-white p-6 shadow-xs">
      <div className="flex items-center gap-2 border-b border-kampmax-border pb-4">
        <ClipboardList className="h-5 w-5 text-kampmax-blue" />
        <div>
          <h2 className="text-base font-bold text-kampmax-text">Create Unit Listing</h2>
          <p className="text-xs text-kampmax-text-secondary">
            Saved as a draft. You can preview, edit, and publish it with a subscription package when ready.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-kampmax-text">
          Property *
          <select
            required
            value={propertyId}
            onChange={(e) => {
              setPropertyId(e.target.value);
              setUnitId("");
            }}
            className="mt-1 block w-full rounded-xl border border-kampmax-border bg-white px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
          >
            <option value="">Select a property...</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold text-kampmax-text">
          Unit / Room *
          <select
            required
            value={unitId}
            disabled={!propertyId || units.length === 0}
            onChange={(e) => setUnitId(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-kampmax-border bg-white px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none disabled:bg-neutral-100"
          >
            <option value="">Select a unit...</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.unitName} · {u.unitType}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold text-kampmax-text sm:col-span-2">
          Public Listing Headline *
          <input
            required
            placeholder="e.g. Spacious Self-Contain with Constant Water, 5 Mins to UNILAG Gate"
            value={data.title}
            onChange={(e) => setData((c) => ({ ...c, title: e.target.value }))}
            className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold text-kampmax-text">
          Rent Amount (₦) *
          <input
            required
            type="number"
            min="0"
            placeholder="e.g. 350000"
            value={data.rentAmount}
            onChange={(e) => setData((c) => ({ ...c, rentAmount: e.target.value }))}
            className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold text-kampmax-text">
          Payment Frequency
          <select
            value={data.paymentFrequency}
            onChange={(e) =>
              setData((c) => ({
                ...c,
                paymentFrequency: e.target.value as AccommodationPaymentFrequency,
              }))
            }
            className="mt-1 block w-full rounded-xl border border-kampmax-border bg-white px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
          >
            <option value="ANNUALLY">Per Year (Annually)</option>
            <option value="BIANNUALLY">Every 6 Months (Biannually)</option>
            <option value="PER_SEMESTER">Per Semester</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="PER_NIGHT">Per Night</option>
          </select>
        </label>

        <label className="text-xs font-semibold text-kampmax-text">
          Caution Fee (₦, Optional)
          <input
            type="number"
            min="0"
            placeholder="e.g. 50000"
            value={data.cautionFee}
            onChange={(e) => setData((c) => ({ ...c, cautionFee: e.target.value }))}
            className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold text-kampmax-text">
          Agency / Agreement Fee (₦, Optional)
          <input
            type="number"
            min="0"
            placeholder="e.g. 30000"
            value={data.agencyFee}
            onChange={(e) => setData((c) => ({ ...c, agencyFee: e.target.value }))}
            className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold text-kampmax-text sm:col-span-2">
          Detailed Listing Description
          <textarea
            rows={3}
            placeholder="Describe room features, balcony, tiles, electricity prepaid meter, proximity to campus faculty, etc."
            value={data.description}
            onChange={(e) => setData((c) => ({ ...c, description: e.target.value }))}
            className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold text-kampmax-text sm:col-span-2">
          Listing Photos (JPEG/PNG, up to 10 MB each)
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="mt-1 block w-full rounded-xl border border-kampmax-border bg-neutral-50 px-3 py-2 text-xs text-kampmax-text-secondary"
          />
          {files.length > 0 && (
            <p className="mt-1 text-[11px] text-emerald-600 font-medium">
              {files.length} photo(s) selected
            </p>
          )}
        </label>

        {amenities.length > 0 && (
          <fieldset className="sm:col-span-2 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
            <legend className="text-xs font-bold uppercase tracking-wider text-kampmax-text-secondary">
              Available Facilities & Amenities
            </legend>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {amenities.map((amenity) => {
                const checked = amenityIds.includes(amenity.id);
                return (
                  <label
                    key={amenity.id}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                      checked
                        ? "border-kampmax-blue bg-kampmax-blue/10 text-kampmax-blue font-semibold"
                        : "border-kampmax-border bg-white text-kampmax-text-secondary hover:bg-neutral-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={(e) => {
                        setAmenityIds((curr) =>
                          e.target.checked
                            ? [...curr, amenity.id]
                            : curr.filter((id) => id !== amenity.id)
                        );
                      }}
                    />
                    <span>{amenity.name}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
      </div>

      {(formError || create.error?.message) && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">
          {formError || create.error?.message}
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={create.isPending || !propertyId || !unitId}
          className="rounded-xl bg-kampmax-blue px-6 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-kampmax-blue/90 disabled:opacity-50"
        >
          {create.isPending ? "Uploading Photos & Saving…" : "Save Draft Listing"}
        </button>
      </div>
    </form>
  );
}

/**
 * The agent's listings: a filtered list of cards, and the one picked open beside it. `?new=1` opens the form for a
 * new listing straight away, for "Add a room" on the hub. The same screen as the mobile app's agent-listings.
 */
export default function AgentListingsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: openNew } = use(searchParams);
  const [showForm, setShowForm] = useState(openNew === "1");
  const [filter, setFilter] = useState<ListingFilter>("all");
  const [picked, setPicked] = useState<string | undefined>();
  const catalogQuery = useAccommodationCatalog();
  const propertiesQuery = useAccommodationProperties(1, true);
  const listingsQuery = useAgentAccommodationListings(1, true);

  const properties = propertiesQuery.data?.items ?? [];
  const packages = catalogQuery.data?.packages ?? [];
  const amenities = catalogQuery.data?.amenities ?? [];
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
          <ListingForm properties={properties} amenities={amenities} onSuccess={() => setShowForm(false)} />
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
                <AccommodationListingManager key={open.id} listing={open} packages={packages} amenities={amenities} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

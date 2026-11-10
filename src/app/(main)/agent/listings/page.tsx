"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ClipboardList, Plus, Building2, AlertCircle } from "lucide-react";
import {
  useAccommodationCatalog,
  useAccommodationProperties,
  useAgentAccommodationListings,
  useCreateAccommodationListing,
} from "@/hooks/use-accommodation";
import { accommodationApi } from "@/services/accommodation";
import { AccommodationListingManager } from "@/components/accommodation/AccommodationListingManager";
import { Skeleton } from "@/components/ui/Skeleton";

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
    paymentFrequency: "ANNUAL",
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
        paymentFrequency: data.paymentFrequency as "MONTHLY" | "QUARTERLY" | "BIANNUAL" | "ANNUAL",
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
        paymentFrequency: "ANNUAL",
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
            onChange={(e) => setData((c) => ({ ...c, paymentFrequency: e.target.value }))}
            className="mt-1 block w-full rounded-xl border border-kampmax-border bg-white px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
          >
            <option value="ANNUAL">Per Year (Annual)</option>
            <option value="BIANNUAL">Every 6 Months (Biannual)</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="MONTHLY">Monthly</option>
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

export default function AgentListingsPage() {
  const [showForm, setShowForm] = useState(false);
  const catalogQuery = useAccommodationCatalog();
  const propertiesQuery = useAccommodationProperties(1, true);
  const listingsQuery = useAgentAccommodationListings(1, true);

  const properties = propertiesQuery.data?.items ?? [];
  const packages = catalogQuery.data?.packages ?? [];
  const amenities = catalogQuery.data?.amenities ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-kampmax-text">
            Accommodation Listings
          </h1>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            Publish student listings, manage drafts, subscription packages, and pricing terms.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((c) => !c)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-kampmax-blue px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-kampmax-blue/90"
        >
          <Plus className="h-4 w-4" />
          <span>{showForm ? "Close Form" : "Create Listing"}</span>
        </button>
      </div>

      {showForm && (
        properties.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-amber-600" />
            <h2 className="mt-2 text-sm font-bold text-amber-900">Add a Property First</h2>
            <p className="mt-1 text-xs text-amber-800">
              Listings require a property and unit. Please add a property before creating a listing.
            </p>
            <Link
              href="/agent/properties"
              className="mt-3 inline-flex rounded-xl bg-kampmax-blue px-4 py-2 text-xs font-semibold text-white"
            >
              Go to Properties →
            </Link>
          </div>
        ) : (
          <ListingForm
            properties={properties}
            amenities={amenities}
            onSuccess={() => setShowForm(false)}
          />
        )
      )}

      {/* Listings List */}
      <section className="space-y-4">
        {listingsQuery.isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : listingsQuery.isError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            Could not load listings: {listingsQuery.error.message}
          </p>
        ) : listingsQuery.data.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-kampmax-border bg-white p-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-neutral-300" />
            <h2 className="mt-3 text-base font-bold text-kampmax-text">No Listings Created Yet</h2>
            <p className="mt-1 text-xs text-kampmax-text-secondary">
              Listings are drafts until you subscribe to a publication package. Start creating listings for your rooms.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-kampmax-blue px-4 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Listing</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-kampmax-border rounded-2xl border border-kampmax-border bg-white p-4">
            {listingsQuery.data.items.map((listing) => (
              <AccommodationListingManager
                key={listing.id}
                listing={listing}
                packages={packages}
                amenities={amenities}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


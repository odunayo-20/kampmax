"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Building2, Plus, Home, Trash2, Edit2, AlertCircle } from "lucide-react";
import {
  useAccommodationCatalog,
  useAccommodationProperties,
  useCreateAccommodationProperty,
  useUpdateAccommodationProperty,
  useArchiveAccommodationProperty,
  useAddAccommodationUnit,
  useUpdateAccommodationUnit,
  useArchiveAccommodationUnit,
} from "@/hooks/use-accommodation";
import type { AccommodationProperty, AccommodationUnit } from "@/types/accommodation";
import type { CreateAccommodationProperty } from "@/services/accommodation";
import { Skeleton } from "@/components/ui/Skeleton";

function PropertyForm({
  categories,
  onSuccess,
}: {
  categories: { id: string; name: string }[];
  onSuccess?: () => void;
}) {
  const create = useCreateAccommodationProperty();
  const [data, setData] = useState({
    title: "",
    categoryId: "",
    address: "",
    state: "",
    city: "",
    neighbourhood: "",
    description: "",
    unitName: "",
    unitType: "Single Room",
    bedrooms: "1",
    bathrooms: "1",
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: CreateAccommodationProperty = {
      title: data.title.trim(),
      categoryId: data.categoryId,
      address: data.address.trim(),
      state: data.state.trim(),
      city: data.city.trim(),
      neighbourhood: data.neighbourhood.trim() || undefined,
      description: data.description.trim() || undefined,
      units: [
        {
          unitName: data.unitName.trim(),
          unitType: data.unitType.trim(),
          bedrooms: Number(data.bedrooms),
          bathrooms: Number(data.bathrooms),
        },
      ],
    };
    create.mutate(input, {
      onSuccess: () => {
        setData({
          title: "",
          categoryId: "",
          address: "",
          state: "",
          city: "",
          neighbourhood: "",
          description: "",
          unitName: "",
          unitType: "Single Room",
          bedrooms: "1",
          bathrooms: "1",
        });
        onSuccess?.();
      },
    });
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-kampmax-border bg-white p-6 shadow-xs">
      <div className="flex items-center gap-2 border-b border-kampmax-border pb-4">
        <Building2 className="h-5 w-5 text-kampmax-blue" />
        <div>
          <h2 className="text-base font-bold text-kampmax-text">Add New Property</h2>
          <p className="text-xs text-kampmax-text-secondary">
            Set up the building or hostel details and create its first rentable unit.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-kampmax-text">
          Property / Hostel Name *
          <input
            required
            placeholder="e.g. Royal Heights Lodge"
            value={data.title}
            onChange={(e) => setData((c) => ({ ...c, title: e.target.value }))}
            className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold text-kampmax-text">
          Property Type *
          <select
            required
            value={data.categoryId}
            onChange={(e) => setData((c) => ({ ...c, categoryId: e.target.value }))}
            className="mt-1 block w-full rounded-xl border border-kampmax-border bg-white px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
          >
            <option value="">Select type...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold text-kampmax-text sm:col-span-2">
          Private Physical Address *
          <input
            required
            placeholder="Street address (kept private until an inspection is scheduled)"
            value={data.address}
            onChange={(e) => setData((c) => ({ ...c, address: e.target.value }))}
            className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold text-kampmax-text">
          City *
          <input
            required
            placeholder="e.g. Akoka / Yaba"
            value={data.city}
            onChange={(e) => setData((c) => ({ ...c, city: e.target.value }))}
            className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold text-kampmax-text">
          State *
          <input
            required
            placeholder="e.g. Lagos"
            value={data.state}
            onChange={(e) => setData((c) => ({ ...c, state: e.target.value }))}
            className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold text-kampmax-text sm:col-span-2">
          Neighbourhood / Landmark (Public)
          <input
            placeholder="e.g. 5 minutes from UNILAG Back Gate"
            value={data.neighbourhood}
            onChange={(e) => setData((c) => ({ ...c, neighbourhood: e.target.value }))}
            className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold text-kampmax-text sm:col-span-2">
          General Property Description
          <textarea
            rows={3}
            placeholder="Overview of the compound, security features, water supply, power backup, etc."
            value={data.description}
            onChange={(e) => setData((c) => ({ ...c, description: e.target.value }))}
            className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
          />
        </label>

        {/* First Unit Configuration */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wider text-kampmax-blue">
            First Unit / Room Details
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <label className="text-xs font-medium text-kampmax-text-secondary sm:col-span-2">
              Unit / Room Label *
              <input
                required
                placeholder="e.g. Room 101, Flat 3B"
                value={data.unitName}
                onChange={(e) => setData((c) => ({ ...c, unitName: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-kampmax-border bg-white px-3 py-1.5 text-xs text-kampmax-text"
              />
            </label>
            <label className="text-xs font-medium text-kampmax-text-secondary sm:col-span-2">
              Unit Type *
              <input
                required
                placeholder="e.g. Self Contain, Single Room"
                value={data.unitType}
                onChange={(e) => setData((c) => ({ ...c, unitType: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-kampmax-border bg-white px-3 py-1.5 text-xs text-kampmax-text"
              />
            </label>
            <label className="text-xs font-medium text-kampmax-text-secondary sm:col-span-2">
              Bedrooms
              <input
                type="number"
                min="0"
                value={data.bedrooms}
                onChange={(e) => setData((c) => ({ ...c, bedrooms: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-kampmax-border bg-white px-3 py-1.5 text-xs text-kampmax-text"
              />
            </label>
            <label className="text-xs font-medium text-kampmax-text-secondary sm:col-span-2">
              Bathrooms
              <input
                type="number"
                min="0"
                value={data.bathrooms}
                onChange={(e) => setData((c) => ({ ...c, bathrooms: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-kampmax-border bg-white px-3 py-1.5 text-xs text-kampmax-text"
              />
            </label>
          </div>
        </div>
      </div>

      {create.error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">
          {create.error.message}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-xl bg-kampmax-blue px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-kampmax-blue/90 disabled:opacity-50"
        >
          {create.isPending ? "Saving Property…" : "Save Property"}
        </button>
      </div>
    </form>
  );
}

function UnitRow({
  propertyId,
  unit,
}: {
  propertyId: string;
  unit: AccommodationUnit;
}) {
  const update = useUpdateAccommodationUnit();
  const archive = useArchiveAccommodationUnit();
  const [editing, setEditing] = useState(false);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    update.mutate(
      {
        propertyId,
        unitId: unit.id,
        input: {
          unitName: String(form.get("unitName") ?? ""),
          unitType: String(form.get("unitType") ?? ""),
          bedrooms: Number(form.get("bedrooms")),
          bathrooms: Number(form.get("bathrooms")),
        },
      },
      {
        onSuccess: () => setEditing(false),
      }
    );
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-wrap items-end gap-2 rounded-xl bg-neutral-100 p-3 text-xs">
        <label className="min-w-32 flex-1">
          Unit Name
          <input
            name="unitName"
            defaultValue={unit.unitName}
            required
            className="mt-1 block w-full rounded-lg border border-kampmax-border bg-white px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="min-w-32 flex-1">
          Unit Type
          <input
            name="unitType"
            defaultValue={unit.unitType}
            required
            className="mt-1 block w-full rounded-lg border border-kampmax-border bg-white px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="w-20">
          Beds
          <input
            name="bedrooms"
            type="number"
            min="0"
            defaultValue={unit.bedrooms}
            className="mt-1 block w-full rounded-lg border border-kampmax-border bg-white px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="w-20">
          Baths
          <input
            name="bathrooms"
            type="number"
            min="0"
            defaultValue={unit.bathrooms}
            className="mt-1 block w-full rounded-lg border border-kampmax-border bg-white px-2.5 py-1.5 text-xs"
          />
        </label>
        <div className="flex gap-1.5">
          <button
            type="submit"
            disabled={update.isPending}
            className="rounded-lg bg-kampmax-blue px-3 py-1.5 text-xs font-semibold text-white"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-kampmax-border bg-white px-3 py-1.5 text-xs"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-kampmax-border bg-neutral-50/50 px-3.5 py-2.5 text-xs">
      <div>
        <p className="font-semibold text-kampmax-text">{unit.unitName}</p>
        <p className="text-[11px] text-kampmax-text-secondary">
          {unit.unitType} · {unit.bedrooms} bed(s) · {unit.bathrooms} bath(s)
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-kampmax-text-secondary hover:bg-white hover:text-kampmax-blue"
          title="Edit Unit"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={archive.isPending}
          onClick={() => {
            if (window.confirm(`Archive ${unit.unitName}?`)) {
              archive.mutate({ propertyId, unitId: unit.id });
            }
          }}
          className="rounded-md p-1.5 text-kampmax-text-secondary hover:bg-white hover:text-red-600"
          title="Archive Unit"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function PropertyCard({ property }: { property: AccommodationProperty }) {
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [unitName, setUnitName] = useState("");
  const [unitType, setUnitType] = useState("Single Room");
  const addUnit = useAddAccommodationUnit();
  const archiveProperty = useArchiveAccommodationProperty();

  return (
    <article className="rounded-2xl border border-kampmax-border bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-kampmax-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-kampmax-text">{property.title}</h3>
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-kampmax-text-secondary">
              {property.city}, {property.state}
            </span>
          </div>
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            {property.address} {property.neighbourhood ? `(${property.neighbourhood})` : ""}
          </p>
        </div>

        <button
          type="button"
          disabled={archiveProperty.isPending}
          onClick={() => {
            if (window.confirm(`Archive ${property.title} and all its units?`)) {
              archiveProperty.mutate(property.id);
            }
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3" />
          <span>Archive</span>
        </button>
      </div>

      {/* Units List */}
      <div className="mt-4">
        <div className="flex items-center justify-between pb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-kampmax-text-secondary">
            Rentable Units ({property.units.length})
          </p>
          <button
            type="button"
            onClick={() => setShowAddUnit((c) => !c)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-kampmax-blue hover:underline"
          >
            <Plus className="h-3 w-3" />
            <span>Add Unit</span>
          </button>
        </div>

        {showAddUnit && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addUnit.mutate(
                { propertyId: property.id, input: { unitName: unitName.trim(), unitType: unitType.trim() } },
                {
                  onSuccess: () => {
                    setUnitName("");
                    setUnitType("Single Room");
                    setShowAddUnit(false);
                  },
                }
              );
            }}
            className="mb-3 flex flex-wrap items-end gap-2 rounded-xl bg-kampmax-blue/5 p-3 text-xs"
          >
            <input
              required
              placeholder="Unit name (e.g. Room 204)"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              className="min-w-32 flex-1 rounded-lg border border-kampmax-border bg-white px-3 py-1.5 text-xs"
            />
            <input
              required
              placeholder="Unit type (e.g. Self Contain)"
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
              className="min-w-32 flex-1 rounded-lg border border-kampmax-border bg-white px-3 py-1.5 text-xs"
            />
            <button
              type="submit"
              disabled={addUnit.isPending}
              className="rounded-lg bg-kampmax-blue px-3 py-1.5 text-xs font-semibold text-white"
            >
              {addUnit.isPending ? "Adding…" : "Add"}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {property.units.map((unit) => (
            <UnitRow key={unit.id} propertyId={property.id} unit={unit} />
          ))}
          {property.units.length === 0 && (
            <p className="py-2 text-xs text-neutral-400">No units added yet.</p>
          )}
        </div>
      </div>
    </article>
  );
}

export default function AgentPropertiesPage() {
  const [showForm, setShowForm] = useState(false);
  const catalogQuery = useAccommodationCatalog();
  const propertiesQuery = useAccommodationProperties(1, true);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-kampmax-text">
            Properties & Units Inventory
          </h1>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            Manage your buildings, student hostels, and create individual rentable units.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((c) => !c)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-kampmax-blue px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-kampmax-blue/90"
        >
          <Plus className="h-4 w-4" />
          <span>{showForm ? "Close Form" : "Add Property"}</span>
        </button>
      </div>

      {showForm && catalogQuery.data && (
        <PropertyForm
          categories={catalogQuery.data.categories}
          onSuccess={() => setShowForm(false)}
        />
      )}

      {/* Properties List */}
      <section className="space-y-4">
        {propertiesQuery.isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : propertiesQuery.isError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            Could not load properties: {propertiesQuery.error.message}
          </p>
        ) : propertiesQuery.data.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-kampmax-border bg-white p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-neutral-300" />
            <h2 className="mt-3 text-base font-bold text-kampmax-text">No Properties Added Yet</h2>
            <p className="mt-1 text-xs text-kampmax-text-secondary">
              Add your first property above to organize rooms and start advertising listings to students.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-kampmax-blue px-4 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              <span>Add Your First Property</span>
            </button>
          </div>
        ) : (
          propertiesQuery.data.items.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))
        )}
      </section>
    </div>
  );
}


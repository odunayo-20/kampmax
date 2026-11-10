"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AccommodationEnquiries } from "@/components/accommodation/AccommodationEnquiries";
import { AccommodationListingManager } from "@/components/accommodation/AccommodationListingManager";
import {
  useAccommodationAgentProfile,
  useAccommodationAgentStatus,
  useAccommodationCatalog,
  useAccommodationPayments,
  useAccommodationProperties,
  useAccommodationSubscriptions,
  useArchiveAccommodationProperty,
  useArchiveAccommodationUnit,
  useAddAccommodationUnit,
  useAgentAccommodationListings,
  useApplyAsAccommodationAgent,
  useCreateAccommodationListing,
  useCreateAccommodationProperty,
  useUpdateAccommodationProperty,
  useUpdateAccommodationUnit,
  useUpdateAccommodationAgent,
  useUploadAccommodationDocument,
  useRemoveAccommodationDocument,
} from "@/hooks/use-accommodation";
import { accommodationApi, type CreateAccommodationProperty } from "@/services/accommodation";
import {
  AGENT_DOCUMENT_TYPE_LABELS,
  AGENT_STATUS_LABELS,
  missingForApproval,
  type AgentDocumentType,
  type AccommodationProperty,
  type AccommodationUnit,
} from "@/types/accommodation";

const DOCUMENT_TYPES: AgentDocumentType[] = [
  "IDENTITY",
  "OWNERSHIP_PROOF",
  "AUTHORIZATION_LETTER",
  "BUSINESS_REGISTRATION",
  "OTHER",
];

function money(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ApplyForm({ initial }: { initial?: { fullName?: string; phone?: string; email?: string; operatingLocation?: string; agencyName?: string | null; businessAddress?: string | null } }) {
  const apply = useApplyAsAccommodationAgent();
  const [values, setValues] = useState({
    fullName: initial?.fullName ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    operatingLocation: initial?.operatingLocation ?? "",
    agencyName: initial?.agencyName ?? "",
    businessAddress: initial?.businessAddress ?? "",
    accepted: false,
  });
  const error = apply.error?.message;

  function update(field: keyof typeof values, value: string | boolean) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply.mutate({
      fullName: values.fullName.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      operatingLocation: values.operatingLocation.trim(),
      agencyName: values.agencyName.trim() || undefined,
      businessAddress: values.businessAddress.trim() || undefined,
      acceptAgreement: true,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-kampmax-border bg-white p-5">
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">{initial ? "Reapply as an agent" : "Apply to list accommodation"}</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">Provide your contact details and operating area. You can upload identity and property-authority documents after applying.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ["fullName", "Full name", "text"],
          ["phone", "Phone number", "tel"],
          ["email", "Email address", "email"],
          ["operatingLocation", "Operating location", "text"],
          ["agencyName", "Agency name (optional)", "text"],
          ["businessAddress", "Business address (optional)", "text"],
        ] as const).map(([field, label, type]) => (
          <label key={field} className="text-xs font-medium text-kampmax-text-secondary">
            {label}
            <input
              required={!["agencyName", "businessAddress"].includes(field)}
              type={type}
              maxLength={field === "businessAddress" ? 300 : 254}
              value={values[field]}
              onChange={(event) => update(field, event.target.value)}
              className="mt-1 block w-full rounded-md border border-kampmax-border px-3 py-2 text-sm text-kampmax-text"
            />
          </label>
        ))}
      </div>
      <label className="flex items-start gap-2 text-xs text-kampmax-text-secondary">
        <input required type="checkbox" checked={values.accepted} onChange={(event) => update("accepted", event.target.checked)} />
        <span>I accept the Kampmax accommodation agent agreement and understand applications are reviewed before listings can be published.</span>
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={apply.isPending || !values.accepted} className="rounded-lg bg-kampmax-blue px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {apply.isPending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}

function PropertyForm({ categories }: { categories: { id: string; name: string }[] }) {
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
    unitType: "",
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
      units: [{
        unitName: data.unitName.trim(),
        unitType: data.unitType.trim(),
        bedrooms: Number(data.bedrooms),
        bathrooms: Number(data.bathrooms),
      }],
    };
    create.mutate(input);
  }

  const fields: { key: keyof typeof data; label: string; required?: boolean; type?: string }[] = [
    { key: "title", label: "Property name", required: true },
    { key: "address", label: "Street address (private)", required: true },
    { key: "state", label: "State", required: true },
    { key: "city", label: "City", required: true },
    { key: "neighbourhood", label: "Neighbourhood" },
    { key: "unitName", label: "First room/unit name", required: true },
    { key: "unitType", label: "Unit type (e.g. single room)", required: true },
    { key: "bedrooms", label: "Bedrooms", required: true, type: "number" },
    { key: "bathrooms", label: "Bathrooms", required: true, type: "number" },
  ];

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-kampmax-border bg-white p-5">
      <h2 className="text-lg font-semibold text-kampmax-text">Add a property and its first unit</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(({ key, label, required, type }) => (
          <label key={key} className="text-xs font-medium text-kampmax-text-secondary">
            {label}
            <input required={required} type={type ?? "text"} min={type === "number" ? 0 : undefined} value={data[key]} onChange={(event) => setData((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 block w-full rounded-md border border-kampmax-border px-3 py-2 text-sm text-kampmax-text" />
          </label>
        ))}
        <label className="text-xs font-medium text-kampmax-text-secondary">
          Property type
          <select required value={data.categoryId} onChange={(event) => setData((current) => ({ ...current, categoryId: event.target.value }))} className="mt-1 block w-full rounded-md border border-kampmax-border bg-white px-3 py-2 text-sm text-kampmax-text">
            <option value="">Choose a type</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-kampmax-text-secondary sm:col-span-2">
          Description
          <textarea maxLength={5000} rows={3} value={data.description} onChange={(event) => setData((current) => ({ ...current, description: event.target.value }))} className="mt-1 block w-full rounded-md border border-kampmax-border px-3 py-2 text-sm text-kampmax-text" />
        </label>
      </div>
      {create.error && <p role="alert" className="text-sm text-red-700">{create.error.message}</p>}
      <button disabled={create.isPending} className="rounded-lg bg-kampmax-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {create.isPending ? "Saving…" : "Save property"}
      </button>
    </form>
  );
}

function AddUnitForm({ propertyId }: { propertyId: string }) {
  const add = useAddAccommodationUnit();
  const [unitName, setUnitName] = useState("");
  const [unitType, setUnitType] = useState("");
  return (
    <form
      className="mt-3 flex flex-wrap gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        add.mutate({ propertyId, input: { unitName: unitName.trim(), unitType: unitType.trim() } }, {
          onSuccess: () => { setUnitName(""); setUnitType(""); },
        });
      }}
    >
      <input required maxLength={80} aria-label="Unit name" value={unitName} onChange={(event) => setUnitName(event.target.value)} placeholder="Unit name" className="min-w-0 flex-1 rounded-md border border-kampmax-border px-3 py-2 text-xs" />
      <input required maxLength={60} aria-label="Unit type" value={unitType} onChange={(event) => setUnitType(event.target.value)} placeholder="Unit type" className="min-w-0 flex-1 rounded-md border border-kampmax-border px-3 py-2 text-xs" />
      <button disabled={add.isPending} className="rounded-md border border-kampmax-border px-3 py-2 text-xs disabled:opacity-50">Add unit</button>
      {add.error && <p role="alert" className="w-full text-xs text-red-700">{add.error.message}</p>}
    </form>
  );
}

function UnitManager({ propertyId, unit }: { propertyId: string; unit: AccommodationUnit }) {
  const update = useUpdateAccommodationUnit();
  const archive = useArchiveAccommodationUnit();
  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-md bg-kampmax-bg p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        update.mutate({
          propertyId,
          unitId: unit.id,
          input: {
            unitName: String(form.get("unitName") ?? ""),
            unitType: String(form.get("unitType") ?? ""),
            bedrooms: Number(form.get("bedrooms")),
            bathrooms: Number(form.get("bathrooms")),
          },
        });
      }}
    >
      <label className="text-[11px] text-kampmax-text-secondary">Unit name<input name="unitName" defaultValue={unit.unitName} required className="mt-1 block w-full rounded border border-kampmax-border px-2 py-1.5 text-xs" /></label>
      <label className="text-[11px] text-kampmax-text-secondary">Unit type<input name="unitType" defaultValue={unit.unitType} required className="mt-1 block w-full rounded border border-kampmax-border px-2 py-1.5 text-xs" /></label>
      <label className="text-[11px] text-kampmax-text-secondary">Bedrooms<input name="bedrooms" type="number" min="0" max="50" defaultValue={unit.bedrooms} className="mt-1 block w-20 rounded border border-kampmax-border px-2 py-1.5 text-xs" /></label>
      <label className="text-[11px] text-kampmax-text-secondary">Bathrooms<input name="bathrooms" type="number" min="0" max="50" defaultValue={unit.bathrooms} className="mt-1 block w-20 rounded border border-kampmax-border px-2 py-1.5 text-xs" /></label>
      <button disabled={update.isPending} className="rounded border border-kampmax-border px-3 py-1.5 text-xs disabled:opacity-50">{update.isPending ? "Saving…" : "Save unit"}</button>
      <button type="button" disabled={archive.isPending} onClick={() => {
        if (window.confirm(`Archive ${unit.unitName}? Its listing will no longer be manageable.`)) {
          archive.mutate({ propertyId, unitId: unit.id });
        }
      }} className="text-xs text-red-700 underline disabled:opacity-50">Archive unit</button>
      {(update.error || archive.error) && <p role="alert" className="w-full text-xs text-red-700">{update.error?.message ?? archive.error?.message}</p>}
    </form>
  );
}

function PropertyManager({ property }: { property: AccommodationProperty }) {
  const update = useUpdateAccommodationProperty();
  const archive = useArchiveAccommodationProperty();
  return (
    <article className="rounded-lg border border-kampmax-border p-4">
      <form
        className="grid gap-2 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          update.mutate({
            id: property.id,
            input: {
              title: String(form.get("title") ?? ""),
              address: String(form.get("address") ?? ""),
              city: String(form.get("city") ?? ""),
              state: String(form.get("state") ?? ""),
              neighbourhood: String(form.get("neighbourhood") ?? ""),
            },
          });
        }}
      >
        <label className="text-xs text-kampmax-text-secondary">Property name<input name="title" defaultValue={property.title} required className="mt-1 block w-full rounded border border-kampmax-border px-2 py-1.5 text-sm text-kampmax-text" /></label>
        <label className="text-xs text-kampmax-text-secondary">Private street address<input name="address" defaultValue={property.address} required className="mt-1 block w-full rounded border border-kampmax-border px-2 py-1.5 text-sm text-kampmax-text" /></label>
        <label className="text-xs text-kampmax-text-secondary">City<input name="city" defaultValue={property.city} required className="mt-1 block w-full rounded border border-kampmax-border px-2 py-1.5 text-sm text-kampmax-text" /></label>
        <label className="text-xs text-kampmax-text-secondary">State<input name="state" defaultValue={property.state} required className="mt-1 block w-full rounded border border-kampmax-border px-2 py-1.5 text-sm text-kampmax-text" /></label>
        <label className="text-xs text-kampmax-text-secondary">Neighbourhood<input name="neighbourhood" defaultValue={property.neighbourhood ?? ""} className="mt-1 block w-full rounded border border-kampmax-border px-2 py-1.5 text-sm text-kampmax-text" /></label>
        <div className="flex items-end gap-3">
          <button disabled={update.isPending} className="rounded border border-kampmax-border px-3 py-2 text-xs disabled:opacity-50">{update.isPending ? "Saving…" : "Save property"}</button>
          <button type="button" disabled={archive.isPending} onClick={() => {
            if (window.confirm(`Archive ${property.title} and all its units?`)) archive.mutate(property.id);
          }} className="text-xs text-red-700 underline disabled:opacity-50">Archive property</button>
        </div>
      </form>
      {(update.error || archive.error) && <p role="alert" className="mt-2 text-xs text-red-700">{update.error?.message ?? archive.error?.message}</p>}
      <div className="mt-4 space-y-2">
        {property.units.map((unit) => <UnitManager key={unit.id} propertyId={property.id} unit={unit} />)}
      </div>
      <AddUnitForm propertyId={property.id} />
    </article>
  );
}

function ListingForm({
  properties,
  amenities,
}: {
  properties: { id: string; title: string; units: { id: string; unitName: string; unitType: string }[] }[];
  amenities: { id: string; name: string }[];
}) {
  const create = useCreateAccommodationListing();
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [unitId, setUnitId] = useState("");
  const [amenityIds, setAmenityIds] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [data, setData] = useState({ title: "", description: "", rentAmount: "", paymentFrequency: "MONTHLY", cautionFee: "", agencyFee: "", agreementFee: "", otherCharges: "" });
  const selectedProperty = properties.find((property) => property.id === propertyId);
  const units = selectedProperty?.units ?? [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    try {
      const uploaded = await Promise.all(files.map((file) => accommodationApi.uploadListingImage(file)));
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
        media: uploaded.map((media) => ({ mediaId: media.id })),
        amenityIds,
      });
      setData({ title: "", description: "", rentAmount: "", paymentFrequency: "MONTHLY", cautionFee: "", agencyFee: "", agreementFee: "", otherCharges: "" });
      setFiles([]);
      setAmenityIds([]);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "The listing could not be saved.");
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-xl border border-kampmax-border bg-white p-5">
      <h2 className="text-lg font-semibold text-kampmax-text">Create a unit listing</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-kampmax-text-secondary">Property
          <select required value={propertyId} onChange={(event) => { setPropertyId(event.target.value); setUnitId(""); }} className="mt-1 block w-full rounded-md border border-kampmax-border bg-white px-3 py-2 text-sm">
            <option value="">Choose a property</option>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-kampmax-text-secondary">Unit
          <select required value={unitId} onChange={(event) => setUnitId(event.target.value)} className="mt-1 block w-full rounded-md border border-kampmax-border bg-white px-3 py-2 text-sm">
            <option value="">Choose a unit</option>
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unitName} · {unit.unitType}</option>)}
          </select>
        </label>
        {([
          ["title", "Listing title"],
          ["rentAmount", "Rent (₦)"],
          ["cautionFee", "Caution fee (₦)"],
          ["agencyFee", "Agency fee (₦)"],
          ["agreementFee", "Agreement fee (₦)"],
          ["otherCharges", "Other compulsory charges (₦)"],
        ] as const).map(([field, label]) => (
          <label key={field} className="text-xs font-medium text-kampmax-text-secondary">{label}
            <input required={field === "title" || field === "rentAmount"} min={field !== "title" ? 0 : undefined} type={field === "title" ? "text" : "number"} value={data[field]} onChange={(event) => setData((current) => ({ ...current, [field]: event.target.value }))} className="mt-1 block w-full rounded-md border border-kampmax-border px-3 py-2 text-sm" />
          </label>
        ))}
        <label className="text-xs font-medium text-kampmax-text-secondary">Rent frequency
          <select value={data.paymentFrequency} onChange={(event) => setData((current) => ({ ...current, paymentFrequency: event.target.value }))} className="mt-1 block w-full rounded-md border border-kampmax-border bg-white px-3 py-2 text-sm">
            <option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="BIANNUAL">Every six months</option><option value="ANNUAL">Annually</option>
          </select>
        </label>
        <label className="text-xs font-medium text-kampmax-text-secondary sm:col-span-2">Description
          <textarea rows={3} maxLength={5000} value={data.description} onChange={(event) => setData((current) => ({ ...current, description: event.target.value }))} className="mt-1 block w-full rounded-md border border-kampmax-border px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-medium text-kampmax-text-secondary sm:col-span-2">Photos (image files, up to 10 MB each)
          <input type="file" accept="image/*" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} className="mt-1 block w-full text-sm" />
        </label>
      </div>
      {amenities.length > 0 && (
        <fieldset>
          <legend className="text-xs font-medium text-kampmax-text-secondary">Facilities</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {amenities.map((amenity) => (
              <label key={amenity.id} className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={amenityIds.includes(amenity.id)} onChange={(event) => setAmenityIds((current) => event.target.checked ? [...current, amenity.id] : current.filter((id) => id !== amenity.id))} />
                {amenity.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {(formError || create.error?.message) && <p role="alert" className="text-sm text-red-700">{formError || create.error?.message}</p>}
      <button disabled={create.isPending || !propertyId || !unitId} className="rounded-lg bg-kampmax-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {create.isPending ? "Uploading and saving…" : "Save draft listing"}
      </button>
    </form>
  );
}

export function AccommodationAgentDashboard() {
  const status = useAccommodationAgentStatus();
  const profile = useAccommodationAgentProfile(Boolean(status.data?.applied));
  const catalog = useAccommodationCatalog();
  const approved = status.data?.status === "APPROVED";
  const properties = useAccommodationProperties(1, approved);
  const listings = useAgentAccommodationListings(1, approved);
  const subscriptions = useAccommodationSubscriptions(1, approved);
  const payments = useAccommodationPayments(1, approved);
  const upload = useUploadAccommodationDocument();
  const removeDocument = useRemoveAccommodationDocument();
  const update = useUpdateAccommodationAgent();

  if (status.isPending) {
    return <main className="mx-auto max-w-5xl px-4 py-10"><div className="h-52 animate-pulse rounded-xl bg-kampmax-muted" /></main>;
  }
  if (status.isError) {
    return <main className="mx-auto max-w-5xl px-4 py-10"><p role="alert" className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700">Could not check your agent application: {status.error.message}</p></main>;
  }
  if (!status.data.applied) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-kampmax-text">Become an accommodation agent</h1>
        <p className="mt-2 text-sm text-kampmax-text-secondary">
          Complete your agent application and verification documents before listing rooms and apartments.
        </p>
        <Link
          href="/accommodation/agent/onboarding"
          className="mt-5 inline-flex rounded-lg bg-kampmax-blue px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Start agent onboarding
        </Link>
      </main>
    );
  }
  if (profile.isPending) {
    return <main className="mx-auto max-w-5xl px-4 py-10"><div className="h-52 animate-pulse rounded-xl bg-kampmax-muted" /></main>;
  }
  if (profile.isError) {
    return <main className="mx-auto max-w-5xl px-4 py-10"><p role="alert" className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700">Could not load your agent profile: {profile.error.message}</p></main>;
  }

  const agent = profile.data;
  const missing = missingForApproval(agent.documents);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/accommodation" className="text-sm text-kampmax-blue hover:underline">← Find accommodation</Link>
          <h1 className="mt-3 text-3xl font-bold text-kampmax-text">Agent workspace</h1>
          <p className="mt-2 text-sm text-kampmax-text-secondary">Manage your verification, properties, rooms and accommodation listings.</p>
        </div>
        <Link href="#agent-enquiries" className="rounded-lg border border-kampmax-border bg-white px-3 py-2 text-sm">Enquiries about my listings</Link>
      </div>

      <section id="agent-profile" className="rounded-xl border border-kampmax-border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-kampmax-text">{agent.fullName}</h2>
            <p className="text-sm text-kampmax-text-secondary">{agent.operatingLocation}{agent.agencyName ? ` · ${agent.agencyName}` : ""}</p>
          </div>
          <span className="rounded-full bg-kampmax-muted px-3 py-1 text-sm font-medium">{AGENT_STATUS_LABELS[agent.status]}</span>
        </div>
        {agent.infoRequest && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Information requested: {agent.infoRequest}</p>}
        {agent.rejectionReason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">Previous decision: {agent.rejectionReason}</p>}
        {agent.suspensionReason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">Account suspended: {agent.suspensionReason}</p>}

        <form
          className="mt-4 grid gap-2 sm:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            update.mutate({
              phone: String(form.get("phone") ?? ""),
              email: String(form.get("email") ?? ""),
              operatingLocation: String(form.get("location") ?? ""),
              agencyName: String(form.get("agency") ?? ""),
            });
          }}
        >
          <label className="text-xs text-kampmax-text-secondary">Phone<input name="phone" required defaultValue={agent.phone} className="mt-1 block w-full rounded-md border border-kampmax-border px-3 py-2 text-sm text-kampmax-text" /></label>
          <label className="text-xs text-kampmax-text-secondary">Email<input name="email" type="email" required defaultValue={agent.email} className="mt-1 block w-full rounded-md border border-kampmax-border px-3 py-2 text-sm text-kampmax-text" /></label>
          <label className="text-xs text-kampmax-text-secondary">Operating location<input name="location" required defaultValue={agent.operatingLocation} className="mt-1 block w-full rounded-md border border-kampmax-border px-3 py-2 text-sm text-kampmax-text" /></label>
          <label className="text-xs text-kampmax-text-secondary sm:col-span-2">Agency name<input name="agency" defaultValue={agent.agencyName ?? ""} className="mt-1 block w-full rounded-md border border-kampmax-border px-3 py-2 text-sm text-kampmax-text" /></label>
          <div className="flex items-end"><button disabled={update.isPending} className="rounded-lg border border-kampmax-border px-4 py-2 text-sm disabled:opacity-50">{update.isPending ? "Saving…" : "Update profile"}</button></div>
        </form>
        {update.error && <p role="alert" className="mt-2 text-xs text-red-700">{update.error.message}</p>}
      </section>

      <section id="agent-verification" className="rounded-xl border border-kampmax-border bg-white p-5">
        <h2 className="text-lg font-semibold text-kampmax-text">Verification documents</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">Upload PDF, JPEG or PNG files up to 5 MB. Private files are visible only to you and the review team.</p>
        {agent.status === "PENDING" && missing.length > 0 && <p className="mt-3 text-sm text-amber-800">Still needed for review: {missing.join(" and ")}.</p>}
        <div className="mt-4 divide-y divide-kampmax-border">
          {agent.documents.map((document) => (
            <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium text-kampmax-text">{AGENT_DOCUMENT_TYPE_LABELS[document.documentType]}</p>
                <p className="text-xs text-kampmax-text-secondary">{document.originalFilename || "Uploaded file"} · {document.status.toLowerCase()}{document.rejectionReason ? ` · ${document.rejectionReason}` : ""}</p>
              </div>
              {document.status !== "ACCEPTED" && (
                <button type="button" disabled={removeDocument.isPending} onClick={() => removeDocument.mutate(document.id)} className="text-xs text-red-700 underline disabled:opacity-50">Remove</button>
              )}
            </div>
          ))}
          {agent.documents.length === 0 && <p className="py-3 text-sm text-kampmax-text-secondary">No documents uploaded yet.</p>}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {DOCUMENT_TYPES.map((documentType) => (
            <label key={documentType} className="text-xs font-medium text-kampmax-text-secondary">
              Upload {AGENT_DOCUMENT_TYPE_LABELS[documentType]}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                disabled={upload.isPending || agent.documents.length >= 10 || agent.status === "REVOKED"}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) upload.mutate({ file, documentType }, { onSuccess: () => { event.target.value = ""; } });
                }}
                className="mt-1 block w-full text-xs"
              />
            </label>
          ))}
        </div>
        {upload.error && <p role="alert" className="mt-2 text-sm text-red-700">{upload.error.message}</p>}
        {removeDocument.error && <p role="alert" className="mt-2 text-sm text-red-700">{removeDocument.error.message}</p>}
      </section>

      {agent.status === "REJECTED" && <ApplyForm initial={agent} />}
      {agent.status === "APPROVED" && (
        <>
          {catalog.isError && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Accommodation categories and facilities could not be loaded: {catalog.error.message}</p>}
          {catalog.isPending && !catalog.data ? (
            <div className="h-48 animate-pulse rounded-xl bg-kampmax-muted" />
          ) : catalog.data ? (
            <PropertyForm categories={catalog.data.categories} />
          ) : null}

          <section id="agent-properties" className="rounded-xl border border-kampmax-border bg-white p-5">
            <h2 className="text-lg font-semibold text-kampmax-text">Your properties and units</h2>
            {properties.isPending ? <p className="mt-3 text-sm text-kampmax-text-secondary">Loading properties…</p> : properties.isError ? <p role="alert" className="mt-3 text-sm text-red-700">{properties.error.message}</p> : properties.data.items.length === 0 ? <p className="mt-3 text-sm text-kampmax-text-secondary">Add a property above to start listing rooms.</p> : (
              <div className="mt-3 space-y-3">
                {properties.data.items.map((property) => <PropertyManager key={property.id} property={property} />)}
              </div>
            )}
          </section>

          {properties.data?.items.length ? (
            catalog.isPending ? <div className="h-48 animate-pulse rounded-xl bg-kampmax-muted" /> : (
              <ListingForm properties={properties.data.items} amenities={catalog.data?.amenities ?? []} />
            )
          ) : null}

          <section id="agent-listings" className="rounded-xl border border-kampmax-border bg-white p-5">
            <h2 className="text-lg font-semibold text-kampmax-text">Your listings</h2>
            <label className="mt-3 flex items-start gap-2 text-xs text-kampmax-text-secondary">
              Listings are drafts until you subscribe to a package. Automatic renewal is optional and is confirmed when you choose a package.
            </label>
            {listings.isPending ? <p className="mt-3 text-sm text-kampmax-text-secondary">Loading listings…</p> : listings.isError ? <p role="alert" className="mt-3 text-sm text-red-700">{listings.error.message}</p> : listings.data.items.length === 0 ? <p className="mt-3 text-sm text-kampmax-text-secondary">Your saved listing drafts will appear here.</p> : (
              <div className="mt-4 divide-y divide-kampmax-border">
                {listings.data.items.map((listing) => (
                  <AccommodationListingManager
                    key={listing.id}
                    listing={listing}
                    packages={catalog.data?.packages ?? []}
                    amenities={catalog.data?.amenities ?? []}
                  />
                ))}
              </div>
            )}
          </section>

          <section id="agent-billing" className="rounded-xl border border-kampmax-border bg-white p-5">
            <h2 className="text-lg font-semibold text-kampmax-text">Subscriptions and payment history</h2>
            {subscriptions.isPending || payments.isPending ? (
              <p className="mt-3 text-sm text-kampmax-text-secondary">Loading billing activity…</p>
            ) : subscriptions.isError || payments.isError ? (
              <p role="alert" className="mt-3 text-sm text-red-700">{subscriptions.error?.message ?? payments.error?.message}</p>
            ) : (
              <>
                <div className="mt-3 space-y-2">
                  {subscriptions.data.items.map((subscription) => (
                    <div key={subscription.id} className="flex flex-wrap justify-between gap-2 rounded-md bg-kampmax-bg p-3 text-sm">
                      <span>Listing subscription · {subscription.status.toLowerCase()} · {subscription.autoRenew ? "auto-renew on" : "auto-renew off"}</span>
                      <span>{money(subscription.amount, subscription.currency)} / {subscription.durationDays} days</span>
                    </div>
                  ))}
                  {subscriptions.data.items.length === 0 && <p className="text-sm text-kampmax-text-secondary">No subscriptions yet.</p>}
                </div>
                <div className="mt-4 divide-y divide-kampmax-border">
                  {payments.data.items.map((payment) => (
                    <div key={payment.id} className="flex flex-wrap justify-between gap-2 py-3 text-xs">
                      <span>{payment.paymentType.replaceAll("_", " ").toLowerCase()} · {payment.status.toLowerCase()} · {new Date(payment.createdAt).toLocaleDateString()}</span>
                      <span>{money(payment.amount, payment.currency)}</span>
                    </div>
                  ))}
                  {payments.data.items.length === 0 && <p className="py-2 text-sm text-kampmax-text-secondary">No payments yet.</p>}
                </div>
              </>
            )}
          </section>

          <section id="agent-enquiries">
            <h2 className="mb-3 text-xl font-semibold text-kampmax-text">Enquiries about your listings</h2>
            <AccommodationEnquiries role="AGENT" />
          </section>
        </>
      )}
    </main>
  );
}

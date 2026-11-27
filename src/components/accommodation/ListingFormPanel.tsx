"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccommodationCatalog, useCreateAccommodationListing, useUpdateAccommodationListing } from "@/hooks/use-accommodation";
import { describeHousingError } from "@/lib/accommodation-text";
import {
  emptyListing,
  formFromListing,
  FREQUENCY_OPTIONS,
  freeRooms,
  listingBody,
  listingPatch,
  listingProblems,
  LOST_DRAFT,
  MAX_LISTING_PHOTOS,
  sendsBackForReview,
  suggestedTitle,
  totalUpfront,
  type ListingErrors,
  type ListingForm,
  type PaymentFrequency,
} from "@/lib/agent-listings";
import { publicAccommodationKeys } from "@/lib/query-keys";
import { formatNaira } from "@/lib/utils";
import type { AccommodationListing } from "@/types/accommodation";
import { useAsk } from "./enquiry-parts";
import { ListingPhotos } from "./ListingPhotos";

type Property = { id: string; title: string; units: { id: string; unitName: string; unitType: string }[] };

type Props =
  | { mode: "create"; properties: Property[]; listings: AccommodationListing[]; onCreated: (id: string) => void; onCancel: () => void }
  | { mode: "edit"; listing: AccommodationListing; onSaved: (note: string | null) => void; onCancel: () => void };

const field = "mt-1 block w-full rounded-md border border-kampmax-border px-3 py-2 text-sm text-kampmax-text";

/**
 * Starting a draft listing for one room, or editing one: photos, details, rent and charges, facilities. One form
 * for both, as on the mobile app's agent-listing-form.
 */
export function ListingFormPanel(props: Props) {
  const queryClient = useQueryClient();
  const catalog = useAccommodationCatalog();
  const create = useCreateAccommodationListing();
  const update = useUpdateAccommodationListing();
  const editing = props.mode === "edit";
  const [form, setForm] = useState<ListingForm>(() => (props.mode === "edit" ? formFromListing(props.listing) : emptyListing()));
  const [roomId, setRoomId] = useState("");
  const [errors, setErrors] = useState<ListingErrors>({});
  const [sendError, setSendError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const titled = useRef(false);
  const { confirm, dialog } = useAsk(update.isPending);

  const rooms = props.mode === "create" ? freeRooms(props.properties, props.listings) : [];
  const room = rooms.find((r) => r.id === roomId);
  const total = totalUpfront(form);
  const pending = create.isPending || update.isPending;

  function set<K extends keyof ListingForm>(key: K, value: ListingForm[K]) {
    setErrors((e) => ({ ...e, [key]: undefined }));
    setForm((f) => ({ ...f, [key]: value }));
  }

  function chooseRoom(id: string) {
    setRoomId(id);
    const r = rooms.find((x) => x.id === id);
    // A new draft starts with a sensible title, unless the agent has typed their own.
    if (r && (!form.title.trim() || titled.current)) {
      titled.current = true;
      setForm((f) => ({ ...f, title: suggestedTitle(r.unit, r.property) }));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendError(null);
    const found = listingProblems(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (props.mode === "create") {
      if (!room) return;
      try {
        const created = await create.mutateAsync({ propertyId: room.property.id, unitId: room.unit.id, ...listingBody(form) });
        props.onCreated(created.id);
      } catch (reason) {
        // Unclear outcome: the draft may exist. Refresh so the list shows it before another try.
        if ((reason as { code?: string }).code === "NETWORK_ERROR") {
          void queryClient.invalidateQueries({ queryKey: publicAccommodationKeys.all });
          setSendError(LOST_DRAFT);
        } else setSendError(describeHousingError(reason));
      }
      return;
    }

    const { listing, onSaved } = props;
    const patch = listingPatch(form, listing);
    if (Object.keys(patch).length === 0) return onSaved(null);
    const save = async () => {
      try {
        await update.mutateAsync({ id: listing.id, input: patch });
        onSaved(sendsBackForReview(listing, patch) ? "Saved. It is off the site until the Kampmax team approves the change." : "Saved.");
      } catch (reason) {
        setSendError(describeHousingError(reason));
      }
    };
    if (!sendsBackForReview(listing, patch)) return void save();
    confirm({
      title: "This will take it off the site for review",
      body: "Your listing is live. Changing the title, description, price or photos hides it from students until the Kampmax team approves the change. Your paid time keeps running.",
      confirmLabel: "Save and send for review",
      cancelLabel: "Keep editing",
      destructive: false,
      run: save,
    });
  }

  if (props.mode === "create" && rooms.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h2 className="text-sm font-bold text-amber-900">Every room already has a listing</h2>
        <p className="mt-1 text-xs text-amber-800">Each room can have one listing. Add another room to a property to list it.</p>
        <Link href="/agent/properties" className="mt-3 inline-flex rounded-xl bg-kampmax-blue px-4 py-2 text-xs font-semibold text-white">Go to my properties</Link>
      </div>
    );
  }

  const money = (key: "rentAmount" | "cautionFee" | "agencyFee" | "agreementFee" | "otherCharges", label: string, hint?: string) => (
    <label className="text-xs text-kampmax-text-secondary">
      {label}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 mt-0.5 -translate-y-1/2 text-sm text-kampmax-text-secondary">₦</span>
        <input inputMode="decimal" value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={key === "rentAmount" ? "250,000" : ""} className={`${field} pl-7`} aria-invalid={!!errors[key]} />
      </div>
      {hint && <span className="mt-0.5 block">{hint}</span>}
      {errors[key] && <span role="alert" className="mt-0.5 block text-red-700">{errors[key]}</span>}
    </label>
  );

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5 rounded-2xl border border-kampmax-border bg-white p-5">
      <h2 className="text-base font-bold text-kampmax-text">{editing ? "Edit listing" : "New listing"}</h2>

      {props.mode === "create" && (
        <fieldset>
          <legend className="text-sm font-semibold text-kampmax-text">Which room?</legend>
          <p className="text-xs text-kampmax-text-secondary">Each room has its own listing, with its own rent and photos.</p>
          <select value={roomId} onChange={(e) => chooseRoom(e.target.value)} className={`${field} bg-white`} aria-label="Room">
            <option value="">Choose the room this listing is for</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.property.title} · {r.unit.unitName}</option>)}
          </select>
        </fieldset>
      )}

      <fieldset>
        <legend className="text-sm font-semibold text-kampmax-text">Photos</legend>
        <p className="mb-2 text-xs text-kampmax-text-secondary">Clear photos get the most enquiries. The first one is the cover. Up to {MAX_LISTING_PHOTOS}.</p>
        <ListingPhotos value={form.photos} onChange={(photos) => set("photos", photos)} onBusyChange={setUploading} />
        {errors.photos && <p role="alert" className="mt-1 text-xs text-red-700">{errors.photos}</p>}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-kampmax-text">About the place</legend>
        <label className="block text-xs text-kampmax-text-secondary">
          Listing title
          <input value={form.title} maxLength={160} onChange={(e) => { titled.current = false; set("title", e.target.value); }} placeholder="Self-contain near UNILAG gate" className={field} aria-invalid={!!errors.title} />
          {errors.title && <span role="alert" className="mt-0.5 block text-red-700">{errors.title}</span>}
        </label>
        <label className="block text-xs text-kampmax-text-secondary">
          Description
          <textarea rows={5} maxLength={5000} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Water and light, security, how far from campus, house rules." className={field} />
          <span className="mt-0.5 block text-right">{form.description.length}/5000</span>
          {errors.description && <span role="alert" className="block text-red-700">{errors.description}</span>}
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-kampmax-text">Rent and charges</legend>
        <p className="text-xs text-kampmax-text-secondary">Show every compulsory charge. Students see the total they must pay up front.</p>
        <label className="block text-xs text-kampmax-text-secondary">
          How often is rent paid?
          <select value={form.paymentFrequency} onChange={(e) => set("paymentFrequency", e.target.value as PaymentFrequency)} className={`${field} bg-white`}>
            {FREQUENCY_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {money("rentAmount", "Rent")}
          {money("cautionFee", "Caution fee (optional)", "Refundable deposit.")}
          {money("agencyFee", "Agency fee (optional)")}
          {money("agreementFee", "Agreement fee (optional)")}
          {money("otherCharges", "Other compulsory charges (optional)")}
        </div>
        {total !== null && total > 0 && (
          <div className="flex items-center justify-between rounded-md bg-blue-50 p-3">
            <span className="text-xs text-kampmax-text-secondary">Students pay up front</span>
            <span className="font-bold text-kampmax-blue">{formatNaira(total)}</span>
          </div>
        )}
      </fieldset>

      {catalog.isError ? (
        <div className="text-sm">
          <p className="text-red-700">The facilities could not be loaded.</p>
          <button type="button" onClick={() => void catalog.refetch()} className="mt-1 underline">Try again</button>
        </div>
      ) : (
        !!catalog.data?.amenities.length && (
          <fieldset>
            <legend className="text-sm font-semibold text-kampmax-text">Facilities</legend>
            <p className="mb-2 text-xs text-kampmax-text-secondary">Tick what comes with the room.</p>
            <div className="flex flex-wrap gap-2">
              {catalog.data.amenities.map((a) => {
                const on = form.amenityIds.includes(a.id);
                return (
                  <label key={a.id} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${on ? "border-kampmax-blue bg-kampmax-blue/10 font-semibold text-kampmax-blue" : "border-kampmax-border text-kampmax-text-secondary"}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={(e) => set("amenityIds", e.target.checked ? [...form.amenityIds, a.id] : form.amenityIds.filter((x) => x !== a.id))} />
                    {a.name}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )
      )}

      {!editing && <p className="text-center text-xs text-kampmax-text-secondary">A draft is private. You choose a package to publish it in the next step.</p>}
      {sendError && <p role="alert" className="text-sm text-red-700">{sendError}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending || uploading || (!editing && !room)} className="rounded-md bg-kampmax-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {uploading ? "Uploading photos…" : pending ? "Saving…" : editing ? "Save changes" : "Save draft"}
        </button>
        <button type="button" onClick={props.onCancel} className="rounded-md border border-kampmax-border px-4 py-2 text-sm">Cancel</button>
      </div>
      {dialog}
    </form>
  );
}

"use client";

import { FormEvent, useState } from "react";
import {
  useArchiveAccommodationListing,
  useCancelAccommodationRenewal,
  useConfirmAccommodationAvailability,
  useEnableAccommodationRenewal,
  useRenewAccommodationSubscription,
  useSubmitAccommodationListing,
  useSubscribeAccommodationListing,
  useUpdateAccommodationListing,
} from "@/hooks/use-accommodation";
import { accommodationApi } from "@/services/accommodation";
import type {
  AccommodationAmenityOption,
  AccommodationListing,
  AccommodationPackage,
  AccommodationUnit,
} from "@/types/accommodation";

function money(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AccommodationListingManager({
  listing,
  packages,
  amenities,
}: {
  listing: AccommodationListing;
  packages: AccommodationPackage[];
  amenities: AccommodationAmenityOption[];
}) {
  const update = useUpdateAccommodationListing();
  const archive = useArchiveAccommodationListing();
  const submit = useSubmitAccommodationListing();
  const subscribe = useSubscribeAccommodationListing();
  const confirmAvailability = useConfirmAccommodationAvailability();
  const cancelRenewal = useCancelAccommodationRenewal();
  const enableRenewal = useEnableAccommodationRenewal();
  const renew = useRenewAccommodationSubscription();
  const [editing, setEditing] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [amenityIds, setAmenityIds] = useState(listing.amenities.map((item) => item.id));
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [autoRenew, setAutoRenew] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [availability, setAvailability] = useState<AccommodationUnit["availabilityStatus"]>(
    listing.availabilityStatus as AccommodationUnit["availabilityStatus"]
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const busy =
    update.isPending ||
    archive.isPending ||
    submit.isPending ||
    subscribe.isPending ||
    confirmAvailability.isPending ||
    cancelRenewal.isPending ||
    enableRenewal.isPending ||
    renew.isPending;
  const canEdit = listing.moderationStatus !== "PENDING_APPROVAL" && listing.moderationStatus !== "ADMIN_SUSPENDED";

  async function saveEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const newMedia = await Promise.all(files.map((file) => accommodationApi.uploadListingImage(file)));
      await update.mutateAsync({
        id: listing.id,
        input: {
          title: String(form.get("title") ?? "").trim(),
          description: String(form.get("description") ?? "").trim(),
          rentAmount: Number(form.get("rentAmount")),
          paymentFrequency: String(form.get("paymentFrequency")) as "MONTHLY" | "QUARTERLY" | "BIANNUALLY" | "ANNUALLY" | "PER_SEMESTER" | "PER_NIGHT",
          cautionFee: Number(form.get("cautionFee") || 0),
          agencyFee: Number(form.get("agencyFee") || 0),
          agreementFee: Number(form.get("agreementFee") || 0),
          otherCharges: Number(form.get("otherCharges") || 0),
          amenityIds,
          ...(files.length > 0
            ? {
                media: [
                  ...listing.media.map((item) => ({ mediaId: item.mediaId, caption: item.caption ?? undefined })),
                  ...newMedia.map((item) => ({ mediaId: item.id })),
                ],
              }
            : {}),
        },
      });
      setEditing(false);
      setFiles([]);
      setMessage("Listing saved. Approved listings with content changes return to review.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The listing could not be updated.");
    }
  }

  async function startCheckout(kind: "initial" | "renewal") {
    setError(null);
    setMessage(null);
    try {
      const result =
        kind === "initial"
          ? await subscribe.mutateAsync({ id: listing.id, packageId: packageId || undefined, autoRenew })
          : await renew.mutateAsync({ id: listing.subscription!.id, autoRenew });
      if (result.authorizationUrl) {
        const destination = new URL(result.authorizationUrl);
        if (destination.protocol !== "https:") throw new Error("The payment provider returned an unsupported checkout link.");
        window.location.assign(destination.href);
      } else {
        setMessage(result.note ?? "No payment is due. The listing status has been updated.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start payment.");
    }
  }

  return (
    <article className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-medium text-kampmax-text">{listing.title}</h3>
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            {listing.property?.title} · {listing.unit?.unitName} · {money(listing.rentAmount, listing.currency)} / {listing.paymentFrequency.toLowerCase()} · {listing.moderationStatus.replaceAll("_", " ").toLowerCase()}
          </p>
          {listing.rejectionReason && <p className="mt-1 text-xs text-red-700">Review note: {listing.rejectionReason}</p>}
          {listing.subscription && (
            <p className="mt-1 text-xs text-kampmax-text-secondary">
              Subscription {listing.subscription.status.toLowerCase()}
              {listing.subscription.endsAt ? ` · ends ${new Date(listing.subscription.endsAt).toLocaleDateString()}` : ""}
              {listing.subscription.autoRenew ? " · auto-renew on" : " · auto-renew off"}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && <button type="button" onClick={() => setEditing((current) => !current)} className="rounded-md border border-kampmax-border px-3 py-2 text-xs">{editing ? "Close editor" : "Edit"}</button>}
          {listing.moderationStatus === "DRAFT" && (
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label={`Package for ${listing.title}`} value={packageId} onChange={(event) => setPackageId(event.target.value)} className="rounded-md border border-kampmax-border bg-white px-2 py-2 text-xs">
                {packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name} · {money(pkg.price, pkg.currency)}</option>)}
              </select>
              <button type="button" disabled={busy || packages.length === 0 || !termsAccepted} onClick={() => void startCheckout("initial")} className="rounded-md bg-kampmax-blue px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {subscribe.isPending ? "Starting…" : "Pay & submit"}
              </button>
            </div>
          )}
          {listing.moderationStatus === "REJECTED" && (
            <button type="button" disabled={busy} onClick={() => submit.mutate(listing.id)} className="rounded-md border border-kampmax-border px-3 py-2 text-xs disabled:opacity-50">
              Resubmit for review
            </button>
          )}
          {listing.moderationStatus === "DRAFT" && (
            <button type="button" disabled={busy} onClick={() => {
              if (window.confirm(`Archive "${listing.title}"? This cannot be undone.`)) archive.mutate(listing.id);
            }} className="text-xs text-red-700 underline disabled:opacity-50">Archive</button>
          )}
        </div>
      </div>

      {listing.moderationStatus === "DRAFT" && (
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-kampmax-text-secondary">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
            <span>I have read and accept the listing billing terms.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={autoRenew} onChange={(event) => setAutoRenew(event.target.checked)} />
            <span>Automatically renew this subscription. I can turn this off later.</span>
          </label>
        </div>
      )}

      {editing && (
        <form onSubmit={(event) => void saveEdits(event)} className="mt-4 grid gap-3 rounded-lg bg-kampmax-bg p-4 sm:grid-cols-2">
          {([
            ["title", "Title", listing.title, "text"],
            ["rentAmount", "Rent (₦)", String(listing.rentAmount), "number"],
            ["cautionFee", "Caution fee (₦)", String(listing.cautionFee), "number"],
            ["agencyFee", "Agency fee (₦)", String(listing.agencyFee), "number"],
            ["agreementFee", "Agreement fee (₦)", String(listing.agreementFee), "number"],
            ["otherCharges", "Other charges (₦)", String(listing.otherCharges), "number"],
          ] as const).map(([field, label, value, type]) => (
            <label key={field} className="text-xs text-kampmax-text-secondary">{label}
              <input name={field} type={type} required={field === "title" || field === "rentAmount"} min={type === "number" ? 0 : undefined} defaultValue={value} className="mt-1 block w-full rounded-md border border-kampmax-border px-3 py-2 text-sm text-kampmax-text" />
            </label>
          ))}
          <label className="text-xs text-kampmax-text-secondary">Rent frequency
            <select name="paymentFrequency" defaultValue={listing.paymentFrequency} className="mt-1 block w-full rounded-md border border-kampmax-border bg-white px-3 py-2 text-sm">
              <option value="ANNUALLY">Annually</option><option value="BIANNUALLY">Every six months</option><option value="PER_SEMESTER">Per semester</option><option value="QUARTERLY">Quarterly</option><option value="MONTHLY">Monthly</option><option value="PER_NIGHT">Per night</option>
            </select>
          </label>
          <label className="text-xs text-kampmax-text-secondary sm:col-span-2">Description
            <textarea name="description" rows={3} maxLength={5000} defaultValue={listing.description ?? ""} className="mt-1 block w-full rounded-md border border-kampmax-border px-3 py-2 text-sm text-kampmax-text" />
          </label>
          <label className="text-xs text-kampmax-text-secondary sm:col-span-2">Add listing photos
            <input type="file" accept="image/*" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} className="mt-1 block w-full text-sm" />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="text-xs text-kampmax-text-secondary">Facilities</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {amenities.map((amenity) => (
                <label key={amenity.id} className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={amenityIds.includes(amenity.id)} onChange={(event) => setAmenityIds((current) => event.target.checked ? [...current, amenity.id] : current.filter((id) => id !== amenity.id))} />
                  {amenity.name}
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
          <div className="flex items-center gap-3 sm:col-span-2">
            <button disabled={busy} className="rounded-md bg-kampmax-blue px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{update.isPending ? "Saving…" : "Save changes"}</button>
            {listing.moderationStatus === "REJECTED" && <span className="text-xs text-kampmax-text-secondary">Save your corrections, then choose Resubmit for review.</span>}
          </div>
        </form>
      )}

      {listing.moderationStatus === "APPROVED" && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs text-kampmax-text-secondary">Availability
            <select value={availability} onChange={(event) => setAvailability(event.target.value as AccommodationUnit["availabilityStatus"])} className="mt-1 block rounded-md border border-kampmax-border bg-white px-2 py-2 text-xs">
              {["AVAILABLE", "RESERVED", "OCCUPIED", "UNAVAILABLE"].map((item) => <option key={item} value={item}>{item.toLowerCase()}</option>)}
            </select>
          </label>
          <button type="button" disabled={busy} onClick={() => confirmAvailability.mutate({ id: listing.id, availabilityStatus: availability })} className="rounded-md border border-kampmax-border px-3 py-2 text-xs disabled:opacity-50">Update availability</button>
        </div>
      )}

      {listing.subscription && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {listing.subscription.autoRenew ? (
            <button type="button" disabled={busy} onClick={() => cancelRenewal.mutate(listing.subscription!.id)} className="text-kampmax-text-secondary underline disabled:opacity-50">Turn off auto-renewal</button>
          ) : listing.subscription.status === "ACTIVE" ? (
            <button type="button" disabled={busy} onClick={() => enableRenewal.mutate(listing.subscription!.id)} className="text-kampmax-text-secondary underline disabled:opacity-50">Turn on auto-renewal</button>
          ) : null}
          {["ACTIVE", "PAST_DUE", "EXPIRED"].includes(listing.subscription.status) && (
            <>
              {packages.length > 0 && (
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
                  Accept billing terms
                </label>
              )}
              <button type="button" disabled={busy || packages.length === 0 || !termsAccepted} onClick={() => void startCheckout("renewal")} className="text-kampmax-text-secondary underline disabled:opacity-50">Renew listing</button>
            </>
          )}
        </div>
      )}
      {message && <p className="mt-2 text-xs text-emerald-700">{message}</p>}
      {(error || archive.error || submit.error || confirmAvailability.error || cancelRenewal.error || enableRenewal.error || renew.error) && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error ?? archive.error?.message ?? submit.error?.message ?? confirmAvailability.error?.message ?? cancelRenewal.error?.message ?? enableRenewal.error?.message ?? renew.error?.message}
        </p>
      )}
    </article>
  );
}

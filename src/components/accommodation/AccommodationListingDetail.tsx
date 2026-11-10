"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  useAccommodationListing,
  useCreateAccommodationEnquiry,
  useReportAccommodationListing,
  useSavedAccommodationListings,
  useSaveAccommodationListing,
  useUnsaveAccommodationListing,
} from "@/hooks/use-accommodation";
import { useAuth } from "@/lib/auth-context";
import { REPORT_REASON_LABELS, type ReportReason } from "@/types/accommodation";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AccommodationListingDetail({ id }: { id: string }) {
  const { status } = useAuth();
  const listing = useAccommodationListing(id);
  const saved = useSavedAccommodationListings();
  const save = useSaveAccommodationListing();
  const unsave = useUnsaveAccommodationListing();
  const createEnquiry = useCreateAccommodationEnquiry();
  const reportListing = useReportAccommodationListing();
  const [message, setMessage] = useState("");
  const [contactMethod, setContactMethod] = useState<"IN_APP" | "PHONE" | "EMAIL">("IN_APP");
  const [enquirySent, setEnquirySent] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("OTHER");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSent, setReportSent] = useState(false);

  if (listing.isPending) {
    return <main className="mx-auto max-w-6xl px-4 py-10"><div className="h-96 animate-pulse rounded-xl bg-kampmax-muted" /></main>;
  }
  if (listing.isError) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p role="alert" className="rounded-lg border border-red-200 bg-white p-5 text-sm text-red-700">
          This accommodation listing could not be loaded: {listing.error.message}
        </p>
        <Link href="/accommodation" className="mt-4 inline-block text-sm text-kampmax-blue underline">Back to search</Link>
      </main>
    );
  }

  const item = listing.data;
  const isSaved = saved.data?.items.some((entry) => entry.available && entry.listing.id === id) ?? false;
  const savePending = save.isPending || unsave.isPending || saved.isPending;
  const saveError = save.error?.message ?? unsave.error?.message;

  function submitEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createEnquiry.mutate({
      listingId: id,
      input: { message: message.trim(), preferredContactMethod: contactMethod },
    }, {
      onSuccess: () => {
        setEnquirySent(true);
        setMessage("");
      },
    });
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    reportListing.mutate({
      id,
      reason: reportReason,
      description: reportDescription.trim() || undefined,
    }, {
      onSuccess: () => {
        setReportSent(true);
        setReportOpen(false);
      },
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/accommodation" className="text-sm text-kampmax-blue hover:underline">← Back to accommodation</Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {item.media.length > 0 ? item.media.slice(0, 4).map((photo, index) => (
              <div key={`${photo.url}-${index}`} className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-kampmax-muted ${index === 0 ? "sm:col-span-2" : ""}`}>
                <Image src={photo.url} alt={photo.caption || item.title} fill unoptimized sizes="(max-width: 640px) 100vw, 70vw" className="object-cover" />
              </div>
            )) : (
              <div className="flex aspect-[16/9] items-center justify-center rounded-xl bg-kampmax-muted text-sm text-kampmax-text-secondary sm:col-span-2">
                No photos have been added to this listing yet.
              </div>
            )}
          </div>
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              {item.category && <span className="rounded-full bg-kampmax-muted px-3 py-1 text-xs">{item.category.name}</span>}
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-800">Available</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold text-kampmax-text">{item.title}</h1>
            <p className="mt-2 text-sm text-kampmax-text-secondary">
              {[item.neighbourhood, item.city, item.state].filter(Boolean).join(", ")}
              {item.campus ? ` · Near ${item.campus.name}` : ""}
            </p>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-kampmax-text">{item.description || "The agent has not added a description."}</p>
          </div>

          <section className="mt-7 rounded-xl border border-kampmax-border bg-white p-5">
            <h2 className="font-semibold text-kampmax-text">About this place</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-kampmax-text-secondary sm:grid-cols-3">
              <p>{item.bedrooms} bedrooms</p>
              <p>{item.bathrooms} bathrooms</p>
              <p>Up to {item.occupancyCapacity} occupants</p>
              <p>{item.furnishingStatus.replaceAll("_", " ").toLowerCase()}</p>
              <p>Rent paid {item.paymentFrequency.toLowerCase()}</p>
              {item.landmark && <p>Near {item.landmark}</p>}
            </div>
            {item.amenities.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold">Facilities</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {item.amenities.map((amenity) => (
                    <li key={amenity.slug} className="rounded-full border border-kampmax-border px-3 py-1 text-xs">{amenity.name}</li>
                  ))}
                </ul>
              </div>
            )}
            {item.mapPoint && <p className="mt-4 text-xs text-kampmax-text-secondary">The map location is approximate for privacy. The exact address is shared by the agent after you enquire.</p>}
          </section>

          <section className="mt-5 rounded-xl border border-kampmax-border bg-white p-5">
            <h2 className="font-semibold text-kampmax-text">Upfront costs</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Rent", item.charges.rent],
                ["Caution fee", item.charges.cautionFee],
                ["Agency fee", item.charges.agencyFee],
                ["Agreement fee", item.charges.agreementFee],
                ["Other charges", item.charges.otherCharges],
              ].filter(([, amount]) => Number(amount) > 0).map(([label, amount]) => (
                <div key={String(label)} className="flex justify-between gap-4 text-kampmax-text-secondary">
                  <dt>{label}</dt><dd>{money(Number(amount), item.currency)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-kampmax-border pt-3 font-semibold text-kampmax-text">
                <dt>Total upfront</dt><dd>{money(item.charges.totalUpfront, item.currency)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-kampmax-border bg-white p-5 shadow-sm">
            <p className="text-sm text-kampmax-text-secondary">Rent</p>
            <p className="mt-1 text-2xl font-bold text-kampmax-blue">
              {money(item.rentAmount, item.currency)}
              <span className="ml-1 text-xs font-normal text-kampmax-text-secondary">/ {item.paymentFrequency.toLowerCase()}</span>
            </p>
            {status === "authenticated" ? (
              <>
                <button
                  type="button"
                  disabled={savePending}
                  onClick={() => (isSaved ? unsave.mutate(id) : save.mutate(id))}
                  className="mt-4 w-full rounded-lg border border-kampmax-border px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {savePending ? "Saving…" : isSaved ? "Remove from saved" : "Save listing"}
                </button>
                {saveError && <p role="alert" className="mt-2 text-xs text-red-700">{saveError}</p>}

                <div className="my-5 border-t border-kampmax-border" />
                <h2 className="font-semibold text-kampmax-text">Ask about this place</h2>
                {enquirySent ? (
                  <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                    Your enquiry was sent. <Link className="font-semibold underline" href="/accommodation/my-enquiries">View your enquiries</Link>
                  </div>
                ) : (
                  <form className="mt-3 space-y-3" onSubmit={submitEnquiry}>
                    <label className="block text-xs font-medium text-kampmax-text-secondary">
                      Message
                      <textarea
                        required
                        minLength={10}
                        maxLength={1000}
                        rows={4}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        className="mt-1 block w-full rounded-md border border-kampmax-border p-3 text-sm text-kampmax-text"
                        placeholder="Ask whether it is still available, or request more details."
                      />
                    </label>
                    <label className="block text-xs font-medium text-kampmax-text-secondary">
                      Preferred contact method
                      <select
                        value={contactMethod}
                        onChange={(event) => setContactMethod(event.target.value as typeof contactMethod)}
                        className="mt-1 block w-full rounded-md border border-kampmax-border bg-white px-3 py-2 text-sm text-kampmax-text"
                      >
                        <option value="IN_APP">In-app messages only</option>
                        <option value="PHONE">Phone (shares your account phone number)</option>
                        <option value="EMAIL">Email</option>
                      </select>
                    </label>
                    {createEnquiry.error && <p role="alert" className="text-xs text-red-700">{createEnquiry.error.message}</p>}
                    <button
                      type="submit"
                      disabled={createEnquiry.isPending || message.trim().length < 10}
                      className="w-full rounded-lg bg-kampmax-blue px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {createEnquiry.isPending ? "Sending…" : "Send enquiry"}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <Link
                href={`/login?returnTo=${encodeURIComponent(`/accommodation/${id}`)}`}
                className="mt-4 block rounded-lg bg-kampmax-blue px-4 py-2.5 text-center text-sm font-semibold text-white"
              >
                Sign in to save or enquire
              </Link>
            )}
          </section>

          <section className="rounded-xl border border-kampmax-border bg-white p-5">
            <div className="flex items-center gap-3">
              {item.agentProfile.photoUrl ? (
                <Image src={item.agentProfile.photoUrl} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-kampmax-muted font-semibold text-kampmax-text-secondary">
                  {item.agentProfile.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="font-semibold text-kampmax-text">{item.agentProfile.name}</h2>
                <p className="text-xs text-emerald-700">Verified accommodation agent</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-kampmax-text-secondary">
              {item.agentProfile.activeListings} active listings
              {item.agentProfile.agencyName ? ` · ${item.agentProfile.agencyName}` : ""}
            </p>
            <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              Keep payments and conversations on Kampmax. Never pay before confirming the place and the agent.
            </p>
            {status === "authenticated" && (
              <div className="mt-4 border-t border-kampmax-border pt-3">
                {reportSent ? (
                  <p className="text-xs text-emerald-700">Thanks. Your report was sent for review.</p>
                ) : reportOpen ? (
                  <form onSubmit={submitReport} className="space-y-2">
                    <label className="block text-xs text-kampmax-text-secondary">Why are you reporting this listing?
                      <select value={reportReason} onChange={(event) => setReportReason(event.target.value as ReportReason)} className="mt-1 block w-full rounded-md border border-kampmax-border bg-white px-2 py-2 text-sm text-kampmax-text">
                        {Object.entries(REPORT_REASON_LABELS).map(([reason, label]) => <option key={reason} value={reason}>{label}</option>)}
                      </select>
                    </label>
                    <textarea maxLength={1000} rows={2} value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} placeholder="Add details (optional)" className="block w-full rounded-md border border-kampmax-border p-2 text-sm" />
                    {reportListing.error && <p role="alert" className="text-xs text-red-700">{reportListing.error.message}</p>}
                    <div className="flex gap-3">
                      <button type="submit" disabled={reportListing.isPending} className="text-xs font-semibold text-red-700 underline disabled:opacity-50">{reportListing.isPending ? "Sending…" : "Send report"}</button>
                      <button type="button" onClick={() => setReportOpen(false)} className="text-xs text-kampmax-text-secondary underline">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button type="button" onClick={() => setReportOpen(true)} className="text-xs text-red-700 underline">Report this listing</button>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

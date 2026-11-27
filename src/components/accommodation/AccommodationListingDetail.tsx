"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BadgeCheck } from "lucide-react";
import {
  useAccommodationListing,
  useCreateAccommodationEnquiry,
  useReportAccommodationListing,
  useSavedAccommodationListings,
  useSaveAccommodationListing,
  useUnsaveAccommodationListing,
} from "@/hooks/use-accommodation";
import { useAuth } from "@/lib/auth-context";
import { FactChips } from "@/components/ui/FactChips";
import { replyChips } from "@/services/accommodation-overview";
import { REPORT_REASON_LABELS, type ReportReason } from "@/types/accommodation";
import {
  ADDRESS_NOTE,
  availabilityText,
  chargeRows,
  CONTACT_CHOICES,
  contactProblem,
  describeHousingError,
  DETAIL_SAFETY_NOTE,
  ENQUIRY_MAX,
  enquiryProblem,
  existingEnquiryId,
  FURNISHING_TEXT,
  LISTING_GONE,
  memberSinceText,
  photosOf,
  placeText,
  rentText,
  REPORT_MAX,
  reportProblem,
  type ContactMethod,
} from "@/lib/accommodation-text";

const REASONS = Object.keys(REPORT_REASON_LABELS) as ReportReason[];

export function AccommodationListingDetail({ id }: { id: string }) {
  const router = useRouter();
  const { status, user } = useAuth();
  const signedIn = status === "authenticated";
  const listing = useAccommodationListing(id);
  const saved = useSavedAccommodationListings();
  const save = useSaveAccommodationListing();
  const unsave = useUnsaveAccommodationListing();
  const createEnquiry = useCreateAccommodationEnquiry();
  const reportListing = useReportAccommodationListing();
  const [message, setMessage] = useState("");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("IN_APP");
  const [enquiryError, setEnquiryError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | "">("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSent, setReportSent] = useState(false);
  const signIn = `/login?returnTo=${encodeURIComponent(`/accommodation/${id}`)}`;

  if (listing.isPending) {
    return <main className="mx-auto max-w-6xl px-4 py-10"><div className="h-96 animate-pulse rounded-xl bg-kampmax-muted" /></main>;
  }
  if (listing.isError) {
    const gone = (listing.error as { status?: number }).status === 404;
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div role="alert" className="rounded-lg border border-kampmax-border bg-white p-5 text-sm text-kampmax-text-secondary">
          {gone ? LISTING_GONE : "Couldn't load this place. Check your connection and try again."}
          {!gone && (
            <button type="button" onClick={() => void listing.refetch()} className="ml-2 font-semibold text-kampmax-blue hover:underline">
              Try again
            </button>
          )}
        </div>
        <Link href="/accommodation" className="mt-4 inline-block text-sm text-kampmax-blue underline">Back to search</Link>
      </main>
    );
  }

  const item = listing.data;
  const photos = photosOf(item.media);
  const isSaved = saved.data?.items.some((entry) => entry.available && entry.listing.id === id) ?? false;
  const savePending = save.isPending || unsave.isPending || saved.isPending;
  const saveFailed = save.isError || unsave.isError;
  const openEnquiryId = createEnquiry.isError ? existingEnquiryId((createEnquiry.error as { data?: unknown }).data) : null;
  const choice = CONTACT_CHOICES.find((c) => c.id === contactMethod);
  const confirmed = availabilityText(item.lastAvailabilityConfirmedAt);

  function submitEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = enquiryProblem(message) ?? contactProblem(contactMethod, user);
    setEnquiryError(problem);
    if (problem) return;
    createEnquiry.mutate(
      { listingId: id, input: { message: message.trim(), preferredContactMethod: contactMethod } },
      {
        // The enquiry is a conversation with the agent: go straight to it.
        onSuccess: (created) => router.push(`/accommodation/my-enquiries?open=${encodeURIComponent(created.id)}`),
        onError: (e) => setEnquiryError(describeHousingError(e)),
      }
    );
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = reportProblem(reportReason, reportDescription, REASONS);
    setReportError(problem);
    if (problem || !reportReason) return;
    reportListing.mutate(
      { id, reason: reportReason, description: reportDescription.trim() || undefined },
      {
        onSuccess: () => {
          setReportSent(true);
          setReportOpen(false);
        },
        onError: (e) => setReportError(describeHousingError(e)),
      }
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/accommodation" className="text-sm text-kampmax-blue hover:underline">← Back to accommodation</Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {photos.length > 0 ? photos.map((photo, index) => (
              <div key={`${photo.url}-${index}`} className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-kampmax-muted ${index === 0 ? "sm:col-span-2" : ""}`}>
                <Image
                  src={photo.url}
                  alt={photo.caption || `${item.title}, photo ${index + 1} of ${photos.length}`}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, 70vw"
                  className="object-cover"
                />
              </div>
            )) : (
              <div className="flex aspect-[16/9] items-center justify-center rounded-xl bg-kampmax-muted text-sm text-kampmax-text-secondary sm:col-span-2">
                The agent has not added photos yet.
              </div>
            )}
          </div>
          <div className="mt-6">
            {item.category && <span className="rounded-full bg-kampmax-muted px-3 py-1 text-xs">{item.category.name}</span>}
            <h1 className="mt-3 text-3xl font-bold text-kampmax-text">{item.title}</h1>
            <p className="mt-2 text-sm text-kampmax-text-secondary">
              {placeText(item)}
              {item.campus ? ` · near ${item.campus.name}` : ""}
            </p>
            {confirmed && <p className="mt-1 text-xs font-semibold text-success-700">{confirmed}</p>}
            <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-kampmax-text">{item.description || "The agent has not added a description."}</p>
          </div>

          <section className="mt-7 rounded-xl border border-kampmax-border bg-white p-5">
            <h2 className="font-semibold text-kampmax-text">The room</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Fact label="Bedrooms" value={item.bedrooms === 0 ? "Studio" : String(item.bedrooms)} />
              <Fact label="Bathrooms" value={String(item.bathrooms)} />
              <Fact label="Sleeps up to" value={String(item.occupancyCapacity)} />
              <Fact label="Furnishing" value={FURNISHING_TEXT[item.furnishingStatus] ?? item.furnishingStatus} />
              <Fact label="Rent" value={rentText(item)} />
              {item.landmark && <Fact label="Landmark" value={item.landmark} />}
            </dl>
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
            <p className="mt-4 text-xs text-kampmax-text-secondary">{ADDRESS_NOTE}</p>
          </section>

          <section className="mt-5 rounded-xl border border-kampmax-border bg-white p-5">
            <h2 className="font-semibold text-kampmax-text">Cost up front</h2>
            <p className="text-xs text-kampmax-text-secondary">Everything you must pay before moving in.</p>
            <dl className="mt-3 space-y-2 text-sm">
              {chargeRows(item.charges).map((row) => (
                <div
                  key={row.label}
                  className={row.bold ? "flex justify-between border-t border-kampmax-border pt-3 font-semibold text-kampmax-text" : "flex justify-between gap-4 text-kampmax-text-secondary"}
                >
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-kampmax-border bg-white p-5 shadow-sm">
            <p className="text-sm text-kampmax-text-secondary">Rent</p>
            <p className="mt-1 text-2xl font-bold text-kampmax-blue">{rentText(item)}</p>
            {signedIn ? (
              <>
                <button
                  type="button"
                  disabled={savePending}
                  onClick={() => (isSaved ? unsave.mutate(id) : save.mutate(id))}
                  className="mt-4 w-full rounded-lg border border-kampmax-border px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {savePending ? "Saving…" : isSaved ? "Remove from saved" : "Save listing"}
                </button>
                {saveFailed && <p role="alert" className="mt-2 text-xs text-error-600">{describeHousingError(save.error ?? unsave.error)}</p>}

                <div className="my-5 border-t border-kampmax-border" />
                <h2 className="font-semibold text-kampmax-text">Ask about this place</h2>
                <form className="mt-3 space-y-3" onSubmit={submitEnquiry}>
                  <label className="block text-xs font-medium text-kampmax-text-secondary">
                    Your message
                    <textarea
                      maxLength={ENQUIRY_MAX}
                      rows={4}
                      value={message}
                      onChange={(event) => {
                        setMessage(event.target.value);
                        setEnquiryError(null);
                      }}
                      className="mt-1 block w-full rounded-md border border-kampmax-border p-3 text-sm text-kampmax-text"
                      placeholder="Is it still available? When could I move in? Can I see it this week?"
                    />
                  </label>
                  <fieldset>
                    <legend className="text-xs font-medium text-kampmax-text-secondary">How should the agent reach you?</legend>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {CONTACT_CHOICES.map((c) => (
                        <label key={c.id} className="flex items-center gap-1.5 text-sm text-kampmax-text">
                          <input
                            type="radio"
                            name="contact-method"
                            checked={contactMethod === c.id}
                            onChange={() => {
                              setContactMethod(c.id);
                              setEnquiryError(null);
                            }}
                          />
                          {c.label}
                        </label>
                      ))}
                    </div>
                    {choice && <p className="mt-1 text-xs text-kampmax-text-secondary">{choice.consent}</p>}
                  </fieldset>
                  {enquiryError && <p role="alert" className="text-xs text-error-600">{enquiryError}</p>}
                  {openEnquiryId && (
                    <Link href={`/accommodation/my-enquiries?open=${encodeURIComponent(openEnquiryId)}`} className="block text-sm font-semibold text-kampmax-blue hover:underline">
                      Open my enquiry
                    </Link>
                  )}
                  <button
                    type="submit"
                    disabled={createEnquiry.isPending}
                    className="w-full rounded-lg bg-kampmax-blue px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {createEnquiry.isPending ? "Sending…" : "Send enquiry"}
                  </button>
                </form>
              </>
            ) : (
              <Link href={signIn} className="mt-4 block rounded-lg bg-kampmax-blue px-4 py-2.5 text-center text-sm font-semibold text-white">
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
                <p className="flex items-center gap-1 text-xs text-success-700">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified accommodation agent
                </p>
              </div>
            </div>
            <FactChips facts={replyChips(item.agentProfile.reply)} tone="positive" className="mt-3" />
            <p className="mt-3 text-xs text-kampmax-text-secondary">
              {[
                item.agentProfile.agencyName,
                `${item.agentProfile.activeListings} ${item.agentProfile.activeListings === 1 ? "listing" : "listings"}`,
                memberSinceText(item.agentProfile.memberSince),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900">{DETAIL_SAFETY_NOTE}</p>
            <div className="mt-4 border-t border-kampmax-border pt-3">
              {reportSent ? (
                <p className="text-xs text-success-700">Thanks. Your report was sent for review.</p>
              ) : !signedIn ? (
                <Link href={signIn} className="text-xs text-error-700 underline">Report this listing</Link>
              ) : reportOpen ? (
                <form onSubmit={submitReport} className="space-y-2">
                  <label className="block text-xs text-kampmax-text-secondary">
                    What is wrong?
                    <select
                      value={reportReason}
                      onChange={(event) => {
                        setReportReason(event.target.value as ReportReason);
                        setReportError(null);
                      }}
                      className="mt-1 block w-full rounded-md border border-kampmax-border bg-white px-2 py-2 text-sm text-kampmax-text"
                    >
                      <option value="">Choose a reason</option>
                      {REASONS.map((reason) => <option key={reason} value={reason}>{REPORT_REASON_LABELS[reason]}</option>)}
                    </select>
                  </label>
                  <textarea
                    maxLength={REPORT_MAX}
                    rows={2}
                    value={reportDescription}
                    onChange={(event) => {
                      setReportDescription(event.target.value);
                      setReportError(null);
                    }}
                    placeholder="Tell us what you saw (optional)"
                    className="block w-full rounded-md border border-kampmax-border p-2 text-sm"
                  />
                  {reportError && <p role="alert" className="text-xs text-error-600">{reportError}</p>}
                  <div className="flex gap-3">
                    <button type="submit" disabled={reportListing.isPending} className="text-xs font-semibold text-error-700 underline disabled:opacity-50">
                      {reportListing.isPending ? "Sending…" : "Send report"}
                    </button>
                    <button type="button" onClick={() => setReportOpen(false)} className="text-xs text-kampmax-text-secondary underline">Cancel</button>
                  </div>
                </form>
              ) : (
                <button type="button" onClick={() => setReportOpen(true)} className="text-xs text-error-700 underline">Report this listing</button>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-kampmax-text-secondary">{label}</dt>
      <dd className="font-medium text-kampmax-text">{value}</dd>
    </div>
  );
}

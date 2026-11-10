"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  useAccommodationEnquiry,
  useAccommodationEnquiries,
  useAnswerAccommodationInspection,
  useCancelAccommodationInspection,
  useCompleteAccommodationInspection,
  useReplyToAccommodationEnquiry,
  useRequestAccommodationInspection,
  useRespondToAccommodationInspection,
  useSetAccommodationEnquiryStatus,
} from "@/hooks/use-accommodation";
import type { AccommodationEnquiry, AccommodationInspection } from "@/types/accommodation";

function localDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function EnquiryCard({ enquiry, role }: { enquiry: AccommodationEnquiry; role: "USER" | "AGENT" }) {
  const detail = useAccommodationEnquiry(enquiry.id);
  const reply = useReplyToAccommodationEnquiry();
  const setStatus = useSetAccommodationEnquiryStatus();
  const requestInspection = useRequestAccommodationInspection();
  const respond = useRespondToAccommodationInspection();
  const answer = useAnswerAccommodationInspection();
  const cancel = useCancelAccommodationInspection();
  const complete = useCompleteAccommodationInspection();
  const [message, setMessage] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [suggestedDate, setSuggestedDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const current = detail.data ?? enquiry;
  const inspection: AccommodationInspection | null | undefined = current.inspection;

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await reply.mutateAsync({ id: enquiry.id, body: message.trim() });
      setMessage("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The reply could not be sent.");
    }
  }

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That action could not be completed.");
    }
  }

  const open = !["CLOSED", "CANCELLED", "NOT_INTERESTED", "UNRESPONSIVE"].includes(current.status);
  const busy =
    reply.isPending ||
    setStatus.isPending ||
    requestInspection.isPending ||
    respond.isPending ||
    answer.isPending ||
    cancel.isPending ||
    complete.isPending;

  return (
    <article className="rounded-xl border border-kampmax-border bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/accommodation/${enquiry.listingId}`} className="font-semibold text-kampmax-blue hover:underline">
            {enquiry.listingTitle || "Accommodation listing"}
          </Link>
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            {role === "AGENT" ? "Enquirer" : "Agent"}: {current.counterpart} · {current.status.replaceAll("_", " ").toLowerCase()}
          </p>
        </div>
        <time className="text-xs text-kampmax-text-secondary" dateTime={enquiry.updatedAt}>
          {localDateTime(enquiry.updatedAt)}
        </time>
      </header>

      {role === "AGENT" && current.contact && (
        <p className="mt-3 rounded-md bg-blue-50 p-3 text-xs text-blue-900">
          Shared contact: {[current.contact.phone, current.contact.email].filter(Boolean).join(" · ") || "No contact details shared"}
        </p>
      )}

      <div className="mt-4 max-h-56 space-y-3 overflow-y-auto rounded-lg bg-kampmax-bg p-3">
        {(current.messages ?? []).map((entry) => (
          <div key={entry.id} className={`max-w-[90%] rounded-lg p-3 text-sm ${entry.from === role ? "ml-auto bg-blue-100 text-kampmax-text" : "bg-white text-kampmax-text"}`}>
            <p className="whitespace-pre-wrap">{entry.body}</p>
            <time className="mt-1 block text-right text-[10px] text-kampmax-text-secondary" dateTime={entry.createdAt}>
              {localDateTime(entry.createdAt)}
            </time>
          </div>
        ))}
        {!current.messages?.length && <p className="text-xs text-kampmax-text-secondary">{detail.isPending ? "Loading conversation…" : "No messages yet."}</p>}
      </div>
      {detail.isError && <p role="alert" className="mt-2 text-xs text-red-700">Could not load the conversation: {detail.error.message}</p>}

      {open && (
        <form className="mt-3 flex gap-2" onSubmit={(event) => void sendReply(event)}>
          <input
            required
            maxLength={1000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-kampmax-border px-3 py-2 text-sm"
            placeholder="Write a reply"
          />
          <button type="submit" disabled={busy || !message.trim()} className="rounded-md bg-kampmax-blue px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Reply
          </button>
        </form>
      )}

      {inspection && (
        <section className="mt-4 rounded-lg border border-kampmax-border p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Visit request · {inspection.status.replaceAll("_", " ").toLowerCase()}</h3>
              <p className="mt-1 text-xs text-kampmax-text-secondary">
                Requested: {localDateTime(inspection.requestedDate)}
                {inspection.confirmedDate ? ` · Confirmed: ${localDateTime(inspection.confirmedDate)}` : ""}
                {inspection.proposedDate ? ` · Suggested: ${localDateTime(inspection.proposedDate)}` : ""}
              </p>
              {inspection.notes && <p className="mt-2 text-xs">{inspection.notes}</p>}
            </div>
            {["REQUESTED", "CONFIRMED", "RESCHEDULE_PROPOSED"].includes(inspection.status) && (
              <button type="button" disabled={busy} onClick={() => void run(() => cancel.mutateAsync(inspection.id))} className="text-xs text-red-700 underline disabled:opacity-50">
                Cancel visit
              </button>
            )}
          </div>
          {role === "AGENT" && inspection.status === "REQUESTED" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void run(() => respond.mutateAsync({ id: inspection.id, action: "CONFIRM" }))} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Confirm requested time</button>
              <button type="button" disabled={busy} onClick={() => void run(() => respond.mutateAsync({ id: inspection.id, action: "REJECT" }))} className="rounded-md border border-kampmax-border px-3 py-2 text-xs disabled:opacity-50">Decline</button>
              <input aria-label="Suggest another visit time" type="datetime-local" value={suggestedDate} onChange={(event) => setSuggestedDate(event.target.value)} className="rounded-md border border-kampmax-border px-2 py-1 text-xs" />
              <button
                type="button"
                disabled={busy || !suggestedDate}
                onClick={() => void run(() => respond.mutateAsync({ id: inspection.id, action: "PROPOSE", date: new Date(suggestedDate).toISOString() }))}
                className="rounded-md border border-kampmax-border px-3 py-2 text-xs disabled:opacity-50"
              >
                Suggest time
              </button>
            </div>
          )}
          {role === "USER" && inspection.status === "RESCHEDULE_PROPOSED" && (
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={busy} onClick={() => void run(() => answer.mutateAsync({ id: inspection.id, action: "ACCEPT" }))} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Accept suggested time</button>
              <button type="button" disabled={busy} onClick={() => void run(() => answer.mutateAsync({ id: inspection.id, action: "DECLINE" }))} className="rounded-md border border-kampmax-border px-3 py-2 text-xs disabled:opacity-50">Decline time</button>
            </div>
          )}
          {role === "AGENT" && inspection.status === "CONFIRMED" && (
            <button type="button" disabled={busy} onClick={() => void run(() => complete.mutateAsync(inspection.id))} className="mt-3 rounded-md border border-kampmax-border px-3 py-2 text-xs disabled:opacity-50">
              Mark visit complete
            </button>
          )}
        </section>
      )}

      {role === "USER" && open && !inspection && (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="text-xs text-kampmax-text-secondary">
            Request a visit
            <input type="datetime-local" value={visitDate} onChange={(event) => setVisitDate(event.target.value)} className="mt-1 block rounded-md border border-kampmax-border px-2 py-2 text-sm text-kampmax-text" />
          </label>
          <button
            type="button"
            disabled={busy || !visitDate}
            onClick={() => void run(async () => {
              await requestInspection.mutateAsync({ id: enquiry.id, requestedDate: new Date(visitDate).toISOString() });
              setVisitDate("");
            })}
            className="rounded-md border border-kampmax-border px-3 py-2 text-xs disabled:opacity-50"
          >
            Request inspection
          </button>
        </div>
      )}

      {open && (
        <div className="mt-4 flex flex-wrap gap-2">
          {role === "USER" ? (
            <>
              <button type="button" disabled={busy} onClick={() => void run(() => setStatus.mutateAsync({ id: enquiry.id, status: "NOT_INTERESTED" }))} className="text-xs text-kampmax-text-secondary underline disabled:opacity-50">Not interested</button>
              <button type="button" disabled={busy} onClick={() => void run(() => setStatus.mutateAsync({ id: enquiry.id, status: "CANCELLED" }))} className="text-xs text-kampmax-text-secondary underline disabled:opacity-50">Close enquiry</button>
            </>
          ) : (
            <>
              {(["CONTACTED", "NEGOTIATING", "CLOSED", "UNRESPONSIVE"] as const).map((status) => (
                <button key={status} type="button" disabled={busy || current.status === status} onClick={() => void run(() => setStatus.mutateAsync({ id: enquiry.id, status }))} className="text-xs text-kampmax-text-secondary underline disabled:opacity-50">
                  Mark {status.replaceAll("_", " ").toLowerCase()}
                </button>
              ))}
            </>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
    </article>
  );
}

export function AccommodationEnquiries({ role }: { role: "USER" | "AGENT" }) {
  const enquiries = useAccommodationEnquiries(role);
  return (
    <section className="space-y-4">
      {enquiries.isPending ? (
        <div className="h-36 animate-pulse rounded-xl bg-kampmax-muted" />
      ) : enquiries.isError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700">
          Could not load accommodation enquiries: {enquiries.error.message}
          <button type="button" className="ml-2 underline" onClick={() => void enquiries.refetch()}>Try again</button>
        </div>
      ) : enquiries.data.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-kampmax-border bg-white p-8 text-center text-sm text-kampmax-text-secondary">
          {role === "AGENT" ? "No one has enquired about your listings yet." : "You have not sent any accommodation enquiries yet."}
        </p>
      ) : (
        enquiries.data.items.map((enquiry) => <EnquiryCard key={enquiry.id} enquiry={enquiry} role={role} />)
      )}
    </section>
  );
}

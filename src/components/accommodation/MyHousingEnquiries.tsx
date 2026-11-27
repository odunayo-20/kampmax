"use client";

import Link from "next/link";
import { useState } from "react";
import {
  useAccommodationEnquiries,
  useAccommodationEnquiry,
  useAnswerAccommodationInspection,
  useCancelAccommodationInspection,
  useReplyToAccommodationEnquiry,
  useRequestAccommodationInspection,
  useSetAccommodationEnquiryStatus,
} from "@/hooks/use-accommodation";
import {
  ENQUIRY_CLOSED_NOTE,
  ENQUIRY_POLL_MS,
  THREAD_POLL_MS,
  isFinalEnquiry,
  MY_ENQUIRIES_EMPTY,
  myEnquiryStatus,
  myVisitActions,
  myVisitView,
  STUDENT_CLOSERS,
} from "@/lib/accommodation-enquiry";
import { describeHousingError } from "@/lib/accommodation-text";
import { timeAgo } from "@/lib/utils";
import { Composer, LoadError, Pill, Thread, useAsk, useRun, VisitTimeForm } from "./enquiry-parts";

/**
 * The places the student has asked about, and one of them open beside the list: the conversation, the visit and a
 * way to close it. The same screens as the mobile app's my-enquiries and my-enquiry/[id].
 */
export function MyHousingEnquiries({ initialId }: { initialId?: string }) {
  const list = useAccommodationEnquiries("USER", 1, ENQUIRY_POLL_MS);
  const [picked, setPicked] = useState<string | undefined>(initialId);

  if (list.isPending) return <div className="h-36 animate-pulse rounded-xl bg-kampmax-muted" />;
  if (list.isError) return <LoadError what="load your enquiries" error={list.error} onRetry={() => void list.refetch()} />;

  const items = list.data.items;
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-kampmax-border bg-white p-8 text-center">
        <p className="font-semibold text-kampmax-text">{MY_ENQUIRIES_EMPTY.title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-kampmax-text-secondary">{MY_ENQUIRIES_EMPTY.text}</p>
        <Link href="/accommodation" className="mt-4 inline-block rounded-md bg-kampmax-blue px-4 py-2 text-sm font-semibold text-white">
          Find a place
        </Link>
      </div>
    );
  }

  // An enquiry opened from a link may be older than this page of the list; it still opens.
  const openId = picked ?? items[0].id;

  return (
    <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
      <ul className="space-y-2" aria-label="Your enquiries">
        {items.map((e) => {
          const on = e.id === openId;
          return (
            <li key={e.id}>
              <button
                type="button"
                aria-current={on ? "true" : undefined}
                onClick={() => setPicked(e.id)}
                className={`w-full rounded-xl border p-3 text-left ${on ? "border-kampmax-blue bg-blue-50/40" : "border-kampmax-border bg-white hover:bg-kampmax-bg"}`}
              >
                <p className="line-clamp-2 text-sm font-semibold text-kampmax-text">{e.listingTitle ?? "A place"}</p>
                <p className="mt-0.5 truncate text-xs text-kampmax-text-secondary">Agent: {e.counterpart}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Pill {...myEnquiryStatus(e.status)} />
                  <time className="text-xs text-kampmax-text-secondary" dateTime={e.updatedAt}>{timeAgo(e.updatedAt)}</time>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <EnquiryPanel key={openId} id={openId} />
    </div>
  );
}

function EnquiryPanel({ id }: { id: string }) {
  const q = useAccommodationEnquiry(id, THREAD_POLL_MS);
  const reply = useReplyToAccommodationEnquiry();
  const setStatus = useSetAccommodationEnquiryStatus();
  const request = useRequestAccommodationInspection();
  const answer = useAnswerAccommodationInspection();
  const cancel = useCancelAccommodationInspection();
  const [asking, setAsking] = useState(false);
  const { error, run } = useRun();
  const busy = reply.isPending || setStatus.isPending || answer.isPending || cancel.isPending;
  const { confirm, dialog } = useAsk(busy);

  const e = q.data;
  if (q.isPending) return <div className="h-64 animate-pulse rounded-xl bg-kampmax-muted" />;
  if (q.isError || !e) return <LoadError what="open this enquiry" error={q.error} onRetry={() => void q.refetch()} />;

  const open = !isFinalEnquiry(e.status);
  const visit = e.inspection ?? null;
  const actions = myVisitActions(e.status, visit);
  const view = visit ? myVisitView(visit) : null;

  return (
    <article className="rounded-xl border border-kampmax-border bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/accommodation/${e.listingId}`} className="font-semibold text-kampmax-blue hover:underline">
            {e.listingTitle || "A place"}
          </Link>
          <p className="mt-1 text-xs text-kampmax-text-secondary">Agent: {e.counterpart}</p>
        </div>
        <Pill {...myEnquiryStatus(e.status)} />
      </header>

      <Thread messages={e.messages} me="USER" them={e.counterpart} />

      {open ? (
        <Composer placeholder="Write a message" disabled={busy} onSend={(body) => run(() => reply.mutateAsync({ id, body }))} />
      ) : (
        <p className="mt-3 rounded-md bg-kampmax-muted/60 p-3 text-sm text-kampmax-text-secondary">{ENQUIRY_CLOSED_NOTE}</p>
      )}

      {(visit || actions.request) && (
        <section className="mt-5 rounded-lg border border-kampmax-border p-4">
          <h3 className="text-sm font-semibold">Visit</h3>
          <p className="mt-0.5 text-xs text-kampmax-text-secondary">Ask to see the place. The agent confirms a time, or suggests another.</p>
          {visit && view && (
            <div className="mt-3">
              <Pill label={view.label} tone={view.tone} />
              <p className="mt-2 text-sm">{view.text}</p>
              {visit.notes && <p className="mt-1 text-xs text-kampmax-text-secondary">Note: {visit.notes}</p>}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {visit && actions.answer && (
              <>
                <button type="button" disabled={busy} onClick={() => void run(() => answer.mutateAsync({ id: visit.id, action: "ACCEPT" }))} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  Accept new time
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => confirm({ title: "Decline this time?", body: "The visit request will be called off. You can ask for another time.", confirmLabel: "Decline", run: () => run(() => answer.mutateAsync({ id: visit.id, action: "DECLINE" })) })}
                  className="rounded-md border border-kampmax-border px-3 py-2 text-xs disabled:opacity-50"
                >
                  Decline
                </button>
              </>
            )}
            {visit && actions.cancel && (
              <button
                type="button"
                disabled={busy}
                onClick={() => confirm({ title: "Call off this visit?", body: "The agent will be told it is cancelled.", confirmLabel: "Call it off", run: () => run(() => cancel.mutateAsync(visit.id)) })}
                className="rounded-md border border-kampmax-border px-3 py-2 text-xs text-red-700 disabled:opacity-50"
              >
                Call off visit
              </button>
            )}
            {actions.request && !asking && (
              <button type="button" disabled={busy} onClick={() => setAsking(true)} className="rounded-md border border-kampmax-border px-3 py-2 text-xs font-semibold disabled:opacity-50">
                {visit ? "Ask for another visit" : "Ask to visit"}
              </button>
            )}
          </div>
          {actions.request && asking && (
            <VisitTimeForm
              hint="Pick a time between one hour and 60 days from now. The agent will confirm it or suggest another."
              noteLabel="Note for the agent (optional)"
              notePlaceholder="I will come with a friend."
              submitLabel="Send request"
              pending={request.isPending}
              onCancel={() => setAsking(false)}
              onSubmit={async (date, notes) => {
                try {
                  await request.mutateAsync({ id, requestedDate: date.toISOString(), notes });
                  setAsking(false);
                  return null;
                } catch (reason) {
                  return describeHousingError(reason);
                }
              }}
            />
          )}
        </section>
      )}

      {open && (
        <div className="mt-4 flex flex-wrap gap-3">
          {STUDENT_CLOSERS.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={busy}
              onClick={() =>
                confirm({
                  title: c.id === "NOT_INTERESTED" ? "Not interested in this place?" : "Close this enquiry?",
                  body: "The agent will be told, and the conversation will end. You can start a new enquiry later.",
                  confirmLabel: c.id === "NOT_INTERESTED" ? "Not interested" : "Close it",
                  cancelLabel: "Keep it open",
                  run: () => run(() => setStatus.mutateAsync({ id, status: c.id })),
                })
              }
              className="text-xs text-kampmax-text-secondary underline disabled:opacity-50"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
      {dialog}
    </article>
  );
}

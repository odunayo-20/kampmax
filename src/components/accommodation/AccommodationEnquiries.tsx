"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, Phone } from "lucide-react";
import {
  useAccommodationEnquiries,
  useAccommodationEnquiry,
  useCancelAccommodationInspection,
  useCompleteAccommodationInspection,
  useReplyToAccommodationEnquiry,
  useRespondToAccommodationInspection,
  useSetAccommodationEnquiryStatus,
} from "@/hooks/use-accommodation";
import { describeWhen, ENQUIRY_POLL_MS, isFinalEnquiry, THREAD_POLL_MS } from "@/lib/accommodation-enquiry";
import {
  AGENT_ENQUIRIES_EMPTY,
  CONTACT_HINT,
  contactLinks,
  ENQUIRY_FILTERS,
  ENQUIRY_FINISHED_NOTE,
  enquiryStatusView,
  type EnquiryFilter,
  inspectionView,
  matchesFilter,
  QUICK_REPLIES,
  statusChoices,
  visitActions,
  waitingText,
} from "@/lib/agent-enquiry";
import { describeHousingError } from "@/lib/accommodation-text";
import { timeAgo } from "@/lib/utils";
import type { AccommodationInspection } from "@/types/accommodation";
import { Composer, LoadError, Pill, Thread, useAsk, useRun, VisitTimeForm } from "./enquiry-parts";

/**
 * Students asking about the agent's listings: a filtered list, and one enquiry open beside it. The same screens as
 * the mobile app's agent-enquiries and agent-enquiry/[id]. The student's side is MyHousingEnquiries.
 */
export function AccommodationEnquiries({ initialId }: { initialId?: string }) {
  const list = useAccommodationEnquiries("AGENT", 1, ENQUIRY_POLL_MS);
  const [filter, setFilter] = useState<EnquiryFilter>("all");
  const [picked, setPicked] = useState<string | undefined>(initialId);

  if (list.isPending) return <div className="h-36 animate-pulse rounded-xl bg-kampmax-muted" />;
  if (list.isError) return <LoadError what="load your enquiries" error={list.error} onRetry={() => void list.refetch()} />;

  const items = list.data.items;
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-kampmax-border bg-white p-8 text-center">
        <p className="font-semibold text-kampmax-text">{AGENT_ENQUIRIES_EMPTY.title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-kampmax-text-secondary">{AGENT_ENQUIRIES_EMPTY.text}</p>
      </div>
    );
  }

  const shown = items.filter((e) => matchesFilter(e, filter));
  const openId = picked ?? shown[0]?.id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Show">
        {ENQUIRY_FILTERS.map((f) => {
          const count = items.filter((e) => matchesFilter(e, f.id)).length;
          const on = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3 py-1 text-sm ${on ? "border-kampmax-blue bg-kampmax-blue text-white" : "border-kampmax-border bg-white text-kampmax-text hover:bg-kampmax-bg"}`}
            >
              {f.label}
              {count > 0 && <span className="ml-1.5 opacity-80">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
        <ul className="space-y-2" aria-label="Enquiries">
          {shown.length === 0 && <li className="text-sm text-kampmax-text-secondary">Nothing here.</li>}
          {shown.map((e) => {
            const on = e.id === openId;
            const waiting = waitingText(e);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  aria-current={on ? "true" : undefined}
                  onClick={() => setPicked(e.id)}
                  className={`w-full rounded-xl border p-3 text-left ${on ? "border-kampmax-blue bg-blue-50/40" : e.status === "NEW" ? "border-amber-400 bg-white" : "border-kampmax-border bg-white hover:bg-kampmax-bg"}`}
                >
                  <p className="truncate text-sm font-semibold text-kampmax-text">{e.counterpart}</p>
                  <p className="mt-0.5 truncate text-xs text-kampmax-text-secondary">{e.listingTitle ?? "A listing"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Pill {...enquiryStatusView(e.status)} />
                    <span className="text-xs text-kampmax-text-secondary">{waiting ?? timeAgo(e.updatedAt)}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        {openId && <EnquiryPanel key={openId} id={openId} />}
      </div>
    </div>
  );
}

function EnquiryPanel({ id }: { id: string }) {
  const q = useAccommodationEnquiry(id, THREAD_POLL_MS);
  const reply = useReplyToAccommodationEnquiry();
  const setStatus = useSetAccommodationEnquiryStatus();
  const respond = useRespondToAccommodationInspection();
  const cancel = useCancelAccommodationInspection();
  const complete = useCompleteAccommodationInspection();
  const [suggesting, setSuggesting] = useState(false);
  const { error, run } = useRun();
  const busy = reply.isPending || setStatus.isPending || respond.isPending || cancel.isPending || complete.isPending;
  const { confirm, dialog } = useAsk(busy);

  const e = q.data;
  if (q.isPending) return <div className="h-64 animate-pulse rounded-xl bg-kampmax-muted" />;
  if (q.isError || !e) return <LoadError what="open this enquiry" error={q.error} onRetry={() => void q.refetch()} />;

  const open = !isFinalEnquiry(e.status);
  const visit = e.inspection ?? null;
  const links = contactLinks(e.contact);
  const choices = statusChoices(e.status);

  function chooseStatus(s: (typeof choices)[number]) {
    const go = () => run(() => setStatus.mutateAsync({ id, status: s.id }));
    if (!s.final) return void go();
    confirm({ title: "Finish this enquiry?", body: "Nothing more can be added to it afterwards, and its status cannot be changed again.", confirmLabel: "Finish it", cancelLabel: "Keep it open", run: go });
  }

  return (
    <article className="rounded-xl border border-kampmax-border bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-kampmax-text">{e.counterpart}</p>
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            About:{" "}
            <Link href={`/accommodation/${e.listingId}`} className="text-kampmax-blue hover:underline">{e.listingTitle || "a listing"}</Link>
          </p>
        </div>
        <Pill {...enquiryStatusView(e.status)} />
      </header>

      {(links.shown.length > 0 || e.preferredContactMethod !== "IN_APP") && (
        <section className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-950">
          <h3 className="font-semibold">Contact the student chose to share</h3>
          <p className="mt-0.5 text-xs">{CONTACT_HINT}</p>
          <div className="mt-2 flex flex-wrap gap-4">
            {links.shown.length === 0 && <p className="text-xs">No details were shared. Reply here.</p>}
            {links.phone ? (
              <a href={links.phone.url} className="inline-flex items-center gap-1.5 font-semibold text-kampmax-blue hover:underline"><Phone className="h-4 w-4" aria-hidden />{links.phone.label}</a>
            ) : (
              e.contact?.phone && <span>{e.contact.phone}</span>
            )}
            {links.email ? (
              <a href={links.email.url} className="inline-flex items-center gap-1.5 font-semibold text-kampmax-blue hover:underline"><Mail className="h-4 w-4" aria-hidden />{links.email.label}</a>
            ) : (
              e.contact?.email && <span>{e.contact.email}</span>
            )}
          </div>
        </section>
      )}

      <Thread messages={e.messages} me="AGENT" them={e.counterpart} />

      {open ? (
        <Composer placeholder="Write a reply" disabled={busy} quickReplies={QUICK_REPLIES} onSend={(body) => run(() => reply.mutateAsync({ id, body }))} />
      ) : (
        <p className="mt-3 rounded-md bg-kampmax-muted/60 p-3 text-sm text-kampmax-text-secondary">{ENQUIRY_FINISHED_NOTE}</p>
      )}

      {!visit && e.preferredInspectionDate && open && (
        <p className="mt-4 text-sm text-kampmax-text-secondary">
          The student would like to visit around {describeWhen(e.preferredInspectionDate)}. They can ask for a visit time from the app.
        </p>
      )}

      {visit && (
        <VisitSection
          visit={visit}
          busy={busy}
          suggesting={suggesting}
          onSuggest={setSuggesting}
          onConfirm={() =>
            confirm({
              title: "Confirm this visit?",
              body: `${describeWhen(visit.requestedDate)}. The student will be told it is confirmed.`,
              confirmLabel: "Confirm visit",
              cancelLabel: "Not yet",
              destructive: false,
              run: () => run(() => respond.mutateAsync({ id: visit.id, action: "CONFIRM" })),
            })
          }
          onDecline={() =>
            confirm({ title: "Decline this visit request?", body: "The student will be told. You can still suggest another time instead.", confirmLabel: "Decline", run: () => run(() => respond.mutateAsync({ id: visit.id, action: "REJECT" })) })
          }
          onCancel={() => confirm({ title: "Call off this visit?", body: "The student will be told it is cancelled.", confirmLabel: "Call it off", run: () => run(() => cancel.mutateAsync(visit.id)) })}
          onComplete={() => void run(() => complete.mutateAsync(visit.id))}
          completing={complete.isPending}
          onPropose={async (date, note) => {
            try {
              await respond.mutateAsync({ id: visit.id, action: "PROPOSE", date: date.toISOString(), note });
              setSuggesting(false);
              return null;
            } catch (reason) {
              return describeHousingError(reason);
            }
          }}
          proposing={respond.isPending}
        />
      )}

      {open && choices.length > 0 && (
        <section className="mt-4">
          <h3 className="text-xs font-semibold text-kampmax-text-secondary">Update status</h3>
          <p className="text-xs text-kampmax-text-secondary">Replying marks an enquiry as answered. Use this to show where it has got to.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {choices.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                onClick={() => chooseStatus(s)}
                className={`rounded-md px-3 py-1.5 text-xs disabled:opacity-50 ${s.final ? "text-kampmax-text-secondary underline" : "border border-kampmax-border hover:bg-kampmax-bg"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>
      )}
      {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
      {dialog}
    </article>
  );
}

function VisitSection({
  visit,
  busy,
  suggesting,
  onSuggest,
  onConfirm,
  onDecline,
  onCancel,
  onComplete,
  completing,
  onPropose,
  proposing,
}: {
  visit: AccommodationInspection;
  busy: boolean;
  suggesting: boolean;
  onSuggest: (on: boolean) => void;
  onConfirm: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onComplete: () => void;
  completing: boolean;
  onPropose: (date: Date, note: string | undefined) => Promise<string | null>;
  proposing: boolean;
}) {
  const v = inspectionView(visit);
  const a = visitActions(visit);
  return (
    <section className="mt-5 rounded-lg border border-kampmax-border p-4">
      <h3 className="text-sm font-semibold">Visit</h3>
      <div className="mt-2">
        <Pill label={v.label} tone={v.tone} />
        <p className="mt-2 text-sm">{v.text}</p>
        {visit.notes && <p className="mt-1 text-xs text-kampmax-text-secondary">Note: {visit.notes}</p>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {a.answer && !suggesting && (
          <>
            <button type="button" disabled={busy} onClick={onConfirm} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Confirm this time</button>
            <button type="button" disabled={busy} onClick={() => onSuggest(true)} className="rounded-md border border-kampmax-border px-3 py-2 text-xs disabled:opacity-50">Suggest another time</button>
            <button type="button" disabled={busy} onClick={onDecline} className="px-3 py-2 text-xs text-kampmax-text-secondary underline disabled:opacity-50">Decline</button>
          </>
        )}
        {visit.status === "CONFIRMED" && (
          <>
            <button type="button" disabled={busy || !a.complete} onClick={onComplete} className="rounded-md bg-kampmax-blue px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
              {completing ? "Saving…" : "Mark visit done"}
            </button>
            {a.completeHint && <span className="text-xs text-kampmax-text-secondary">{a.completeHint}</span>}
          </>
        )}
        {a.cancel && !a.answer && (
          <button type="button" disabled={busy} onClick={onCancel} className="px-3 py-2 text-xs text-red-700 underline disabled:opacity-50">Call off this visit</button>
        )}
      </div>
      {a.answer && suggesting && (
        <VisitTimeForm
          hint={`The student asked for ${describeWhen(visit.requestedDate)}. Pick a time between one hour and 60 days from now.`}
          noteLabel="Note for the student (optional)"
          notePlaceholder="Meet at the gate. Call when you arrive."
          submitLabel="Send suggestion"
          pending={proposing}
          onCancel={() => onSuggest(false)}
          onSubmit={onPropose}
        />
      )}
    </section>
  );
}

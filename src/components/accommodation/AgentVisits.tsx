"use client";

import Link from "next/link";
import { useState } from "react";
import { useAgentAccommodationInspections } from "@/hooks/use-accommodation";
import { describeWhen, ENQUIRY_POLL_MS } from "@/lib/accommodation-enquiry";
import { AGENT_VISITS_EMPTY, inspectionView, VISIT_FILTERS, visitDate, type VisitFilter, visitMatches, visitsFor } from "@/lib/agent-enquiry";
import { LoadError, Pill } from "./enquiry-parts";

/**
 * Visit requests and arranged visits across the agent's listings. Each one opens its enquiry, where it is answered.
 * The same screen as the mobile app's agent-visits.
 */
export function AgentVisits() {
  const q = useAgentAccommodationInspections(ENQUIRY_POLL_MS);
  const [filter, setFilter] = useState<VisitFilter>("answer");

  if (q.isPending) return <div className="h-36 animate-pulse rounded-xl bg-kampmax-muted" />;
  if (q.isError) return <LoadError what="load your visits" error={q.error} onRetry={() => void q.refetch()} />;

  const items = q.data.items;
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-kampmax-border bg-white p-8 text-center">
        <p className="font-semibold text-kampmax-text">{AGENT_VISITS_EMPTY.title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-kampmax-text-secondary">{AGENT_VISITS_EMPTY.text}</p>
      </div>
    );
  }

  const shown = visitsFor(items, filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Show">
        {VISIT_FILTERS.map((f) => {
          const count = items.filter((i) => visitMatches(i, f.id)).length;
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

      {shown.length === 0 && <p className="text-sm text-kampmax-text-secondary">Nothing here.</p>}
      <ul className="grid gap-2 sm:grid-cols-2">
        {shown.map((i) => {
          const v = inspectionView(i);
          return (
            <li key={i.id}>
              <Link
                href={`/agent/enquiries?open=${encodeURIComponent(i.enquiryId)}`}
                className={`block rounded-xl border bg-white p-4 hover:bg-kampmax-bg ${i.status === "REQUESTED" ? "border-amber-400" : "border-kampmax-border"}`}
              >
                <p className="truncate font-semibold text-kampmax-text">{i.listingTitle ?? "A listing"}</p>
                <p className="mt-0.5 text-sm text-kampmax-text-secondary">{describeWhen(visitDate(i))}</p>
                <div className="mt-2">
                  <Pill label={v.label} tone={v.tone} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

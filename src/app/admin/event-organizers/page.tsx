"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Search, ShieldOff, XCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Pagination } from "@/components/admin/Pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { useOrganizerApplications, useReviewOrganizer } from "@/hooks/use-events";
import { cn } from "@/lib/utils";
import type {
  AdminOrganizerRow,
  OrganizerApplicationStatus,
} from "@/types/event-ticketing";

type Filter = OrganizerApplicationStatus | "ALL";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "SUSPENDED", label: "Suspended" },
  { id: "ALL", label: "All" },
];

const STATUS_STYLES: Record<OrganizerApplicationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-error-100 text-error-700",
  SUSPENDED: "bg-neutral-200 text-neutral-700",
};

type Pending =
  | { action: "approve" | "reject" | "suspend"; row: AdminOrganizerRow }
  | null;

/** Only http(s) links are rendered as links; anything else is shown as text. */
function safeHref(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export default function AdminEventOrganizersPage() {
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounce(search.trim(), 300);
  const [pending, setPending] = useState<Pending>(null);

  const list = useOrganizerApplications({
    status: filter === "ALL" ? undefined : filter,
    q: q || undefined,
    page,
  });
  const review = useReviewOrganizer();
  const busy = review.approve.isPending || review.reject.isPending || review.suspend.isPending;
  const reviewError = review.approve.error ?? review.reject.error ?? review.suspend.error;

  function confirm(reason: string) {
    if (!pending) return;
    const { action, row } = pending;
    // Close on failure too: the error is shown under the list.
    const done = { onSettled: () => setPending(null) };
    if (action === "approve") review.approve.mutate({ id: row.id, note: reason || undefined }, done);
    else if (action === "reject") review.reject.mutate({ id: row.id, reason }, done);
    else review.suspend.mutate({ id: row.id, reason }, done);
  }

  const counts = list.data?.counts;
  const rows = list.data?.items ?? [];

  return (
    <div>
      <AdminPageHeader
        title="Event organizers"
        description="Students ask for permission to host events. Approving adds the organizer role to their existing account."
      />

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Application status" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setPage(1);
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === f.id
                  ? "bg-kampmax-navy text-white"
                  : "border border-kampmax-border bg-white text-kampmax-text-secondary hover:bg-kampmax-muted"
              )}
            >
              {f.label}
              {counts && f.id !== "ALL" && (
                <span className="ml-1.5 tabular-nums opacity-70">{counts[f.id]}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kampmax-text-muted" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, email or club"
            aria-label="Search applications"
            className="h-9 w-full rounded-lg border border-kampmax-border bg-white pl-9 pr-3 text-sm focus:border-kampmax-blue focus:outline-none focus:ring-1 focus:ring-kampmax-blue"
          />
        </div>
      </div>

      {list.isPending ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-kampmax-muted" />)}
        </div>
      ) : list.isError ? (
        <div role="alert" className="rounded-xl border border-error-100 bg-error-50 p-6 text-center text-sm text-error-700">
          {list.error.message}{" "}
          <button onClick={() => list.refetch()} className="font-semibold underline">Retry</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-kampmax-border-strong bg-white p-10 text-center text-sm text-kampmax-text-secondary">
          No applications here.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-kampmax-border bg-white">
          <ul className="divide-y divide-kampmax-border">
            {rows.map((row) => {
              const proof = safeHref(row.proofUrl);
              return (
                <li key={row.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-kampmax-text">{row.organizationName}</p>
                      <p className="text-xs text-kampmax-text-secondary">
                        {row.applicantName} &middot; {row.applicantEmail}
                        {row.campusName ? ` · ${row.campusName}` : ""}
                      </p>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", STATUS_STYLES[row.status])}>
                      {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <p className="whitespace-pre-line text-sm text-kampmax-text-secondary">{row.description}</p>
                  {row.proofUrl && (
                    <p className="text-xs">
                      Proof:{" "}
                      {proof ? (
                        <a href={proof} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-kampmax-blue">
                          Open link <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-kampmax-text-muted">{row.proofUrl}</span>
                      )}
                    </p>
                  )}
                  {row.reviewNote && (
                    <p className="text-xs text-kampmax-text-muted">Review note: {row.reviewNote}</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(row.status === "PENDING" || row.status === "REJECTED" || row.status === "SUSPENDED") && (
                      <ActionButton tone="success" onClick={() => setPending({ action: "approve", row })}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> {row.status === "SUSPENDED" ? "Restore" : "Approve"}
                      </ActionButton>
                    )}
                    {row.status === "PENDING" && (
                      <ActionButton tone="danger" onClick={() => setPending({ action: "reject", row })}>
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </ActionButton>
                    )}
                    {row.status === "APPROVED" && (
                      <ActionButton tone="danger" onClick={() => setPending({ action: "suspend", row })}>
                        <ShieldOff className="h-3.5 w-3.5" /> Suspend
                      </ActionButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination
            page={list.data.meta.page}
            pageSize={list.data.meta.limit}
            total={list.data.meta.total}
            totalPages={Math.max(1, list.data.meta.totalPages)}
            onPageChange={setPage}
            unitLabel="applications"
          />
        </div>
      )}

      {reviewError && !pending && (
        <p role="alert" className="mt-3 text-xs text-error-700">{reviewError.message}</p>
      )}

      <ConfirmDialog
        open={pending !== null}
        tone={pending?.action === "approve" ? "default" : "danger"}
        title={
          pending
            ? `${pending.action === "approve" ? "Approve" : pending.action === "reject" ? "Reject" : "Suspend"} ${pending.row.organizationName}?`
            : ""
        }
        message={
          pending?.action === "approve"
            ? `${pending.row.applicantName} will be able to create events, sell tickets and scan entries.`
            : pending?.action === "reject"
              ? "The applicant is notified with your reason and may apply again."
              : "Their organizer access is removed. Existing events keep running."
        }
        confirmLabel={pending?.action === "approve" ? "Approve" : pending?.action === "reject" ? "Reject" : "Suspend"}
        reasonLabel={pending?.action === "approve" ? undefined : "Reason (shown to the applicant)"}
        loading={busy}
        onCancel={() => setPending(null)}
        onConfirm={confirm}
      />
    </div>
  );
}

function ActionButton({
  tone,
  onClick,
  children,
}: {
  tone: "success" | "danger";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-white",
        tone === "success" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-kampmax-error hover:bg-red-700"
      )}
    >
      {children}
    </button>
  );
}

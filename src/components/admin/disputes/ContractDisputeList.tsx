"use client";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { previewText } from "@/components/admin/campus-community/campus-community-utils";
import { formatNaira, timeAgo } from "@/lib/utils";
import type { Engagement } from "@/services/jobs";

const nameOf = (p: Engagement["employer"], fallback: string) => p.fullName || p.username || fallback;

/** Case log of contract disputes. One responsive list — rows wrap on small screens. */
export function ContractDisputeList({
  items,
  loading,
  error,
  filtered,
  onRetry,
  onReview,
}: {
  items: Engagement[];
  loading: boolean;
  error: boolean;
  /** True when a status filter is hiding other cases. */
  filtered: boolean;
  onRetry: () => void;
  onReview: (e: Engagement) => void;
}) {
  if (loading) return <LoadingSkeleton variant="table" rows={5} />;
  if (error) return <ErrorState onRetry={onRetry} />;
  if (items.length === 0) {
    return (
      <EmptyState
        title={filtered ? "Nothing here" : "No contract disputes yet"}
        message={
          filtered
            ? "No contract disputes in this view."
            : "When an employer or freelancer reports a problem on a contract, it will show up here."
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-kampmax-border overflow-hidden rounded-lg border border-kampmax-border bg-white">
      {items.map((e) => {
        const d = e.dispute;
        if (!d) return null;
        const resolved = !!d.resolvedAt;
        const employer = nameOf(e.employer, "Employer");
        const freelancer = nameOf(e.freelancer, "Freelancer");
        return (
          <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
            <div className="min-w-0 flex-1 basis-64">
              <p className="truncate text-sm font-medium text-kampmax-text" title={e.job?.title}>
                {e.job?.title || "Contract"}
              </p>
              <p className="mt-0.5 truncate text-xs text-kampmax-text-secondary">
                {employer} <span aria-hidden>→</span>
                <span className="sr-only">hired</span> {freelancer}
              </p>
              <p className="mt-1.5 text-xs text-kampmax-text" title={d.reason}>
                {previewText(d.reason, 90)}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
              <span className="text-sm font-semibold tabular-nums text-kampmax-text">
                {formatNaira(Number(e.agreedAmount))}
              </span>
              <StatusBadge
                variant={resolved ? "success" : "error"}
                label={resolved ? (d.outcome === "RELEASE" ? "Paid freelancer" : "Refunded employer") : "Open"}
              />
              <span className="text-[11px] text-kampmax-text-secondary">{timeAgo(d.openedAt)}</span>
            </div>

            <button
              type="button"
              onClick={() => onReview(e)}
              aria-label={`${resolved ? "View ruling for" : "Review"} ${e.job?.title || "contract"}`}
              className={
                resolved
                  ? "h-8 shrink-0 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text hover:bg-kampmax-muted/60"
                  : "h-8 shrink-0 rounded-md bg-kampmax-navy px-3 text-xs font-medium text-white hover:bg-kampmax-navy-light"
              }
            >
              {resolved ? "View ruling" : "Review & rule"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

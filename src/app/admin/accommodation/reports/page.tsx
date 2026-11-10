"use client";

import { useState } from "react";
import Link from "next/link";
import { Flag } from "lucide-react";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ResolveReportDialog } from "@/components/admin/accommodation/ResolveReportDialog";
import { ModerationBadge } from "@/components/admin/accommodation/status-badges";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { Pagination } from "@/components/admin/Pagination";
import { useAdminReports, useResolveReport } from "@/hooks/admin/use-admin-accommodation";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { canAdminPerform } from "@/lib/admin/permissions";
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  type AdminReport,
  type ReportStatus,
  type ResolveReportInput,
} from "@/types/accommodation";

const PAGE_SIZE = 15;

const TABS: ReportStatus[] = ["OPEN", "RESOLVED", "DISMISSED"];

const EMPTY_COPY: Record<ReportStatus, { title: string; message: string }> = {
  OPEN: {
    title: "No open reports",
    message: "When someone reports a listing as fake, wrong or unavailable, it appears here, oldest first.",
  },
  RESOLVED: { title: "Nothing resolved yet", message: "Reports you acted on are listed here with what you did." },
  DISMISSED: { title: "Nothing dismissed", message: "Reports where you found nothing wrong are listed here." },
};

const buttonClass =
  "inline-flex h-7 items-center rounded-md border border-kampmax-border bg-white px-2.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-50";

export default function AdminAccommodationReportsPage() {
  const { admin } = useAdminSession();
  const canModerate = admin ? canAdminPerform(admin, "accommodation", "moderateListings") : false;

  const [tab, setTab] = useState<ReportStatus>("OPEN");
  const [page, setPage] = useState(1);
  const { data, isPending, isError, refetch } = useAdminReports({ status: tab, page, pageSize: PAGE_SIZE });

  const resolve = useResolveReport();
  const [handling, setHandling] = useState<AdminReport | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(input: ResolveReportInput) {
    const target = handling;
    if (!target) return;
    setDialogError(null);
    try {
      const result = await resolve.mutateAsync({ id: target.id, input });
      setHandling(null);
      setNotice(
        input.suspendListing
          ? result.listingSuspended
            ? "Report closed, and the listing was taken down."
            : "Report closed. The listing was already off the site, so there was nothing to take down."
          : "Report closed."
      );
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Accommodation reports"
        description="People tell us when a listing is fake, wrong or no longer available. Several open reports on one listing is a strong signal."
      />

      {notice && (
        <p role="status" className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      <div role="tablist" aria-label="Report status" className="mb-4 flex flex-wrap gap-1 border-b border-kampmax-border">
        {TABS.map((status) => {
          const active = tab === status;
          const count = data?.counts[status];
          return (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setTab(status);
                setPage(1);
                setNotice(null);
              }}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "border-kampmax-blue text-kampmax-blue"
                  : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
              )}
            >
              {REPORT_STATUS_LABELS[status]}
              {count !== undefined && (
                <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums text-kampmax-text-secondary">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section aria-label="Reports" className="rounded-lg border border-kampmax-border bg-white">
        {isPending ? (
          <div className="p-4">
            <LoadingSkeleton variant="table" rows={5} />
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState icon={Flag} title={EMPTY_COPY[tab].title} message={EMPTY_COPY[tab].message} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-kampmax-border text-xs text-kampmax-text-secondary">
                    <th scope="col" className="px-4 py-2 font-medium">Listing</th>
                    <th scope="col" className="px-4 py-2 font-medium">What was reported</th>
                    <th scope="col" className="px-4 py-2 font-medium">Reported by</th>
                    <th scope="col" className="px-4 py-2 font-medium">{tab === "OPEN" ? "Reported" : "Handled"}</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kampmax-border">
                  {data.items.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2.5 align-top">
                        <Link
                          href={`/admin/accommodation/listings/${r.listingId}`}
                          className="block font-medium text-kampmax-text hover:text-kampmax-blue hover:underline"
                        >
                          {r.listingTitle ?? "Listing"}
                        </Link>
                        {r.agentId && (
                          <Link
                            href={`/admin/accommodation/agents/${r.agentId}`}
                            className="block text-[11px] text-kampmax-text-secondary hover:text-kampmax-blue hover:underline"
                          >
                            {r.agentName ?? "Agent"}
                          </Link>
                        )}
                        <span className="mt-1 inline-flex flex-wrap items-center gap-1">
                          {r.listingModerationStatus && <ModerationBadge status={r.listingModerationStatus} />}
                          {r.status === "OPEN" && r.openReportsOnListing > 1 && (
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                              {r.openReportsOnListing} open reports
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <span className="block font-medium text-kampmax-text">{REPORT_REASON_LABELS[r.reason]}</span>
                        {r.description && (
                          <span className="block max-w-xs text-[11px] text-kampmax-text-secondary">{r.description}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 align-top text-kampmax-text-secondary">{r.reporterName ?? "Someone"}</td>
                      <td className="px-4 py-2.5 align-top text-kampmax-text-secondary">
                        {r.status === "OPEN" ? (
                          timeAgo(r.createdAt)
                        ) : (
                          <>
                            <span className="block whitespace-nowrap">{r.reviewedAt ? formatDate(r.reviewedAt) : "—"}</span>
                            {r.resolution && <span className="block max-w-xs text-[11px]">{r.resolution}</span>}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right align-top">
                        {r.status === "OPEN" && canModerate && (
                          <button
                            type="button"
                            className={buttonClass}
                            aria-label={`Handle report on ${r.listingTitle ?? "listing"}`}
                            onClick={() => {
                              setDialogError(null);
                              setNotice(null);
                              setHandling(r);
                            }}
                          >
                            Handle
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              totalPages={data.totalPages}
              onPageChange={setPage}
              unitLabel="reports"
            />
          </>
        )}
      </section>

      <ResolveReportDialog
        report={handling}
        loading={resolve.isPending}
        error={dialogError}
        onClose={() => setHandling(null)}
        onSubmit={(input) => void submit(input)}
      />
    </>
  );
}

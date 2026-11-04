"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Flag, X } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { Pagination } from "@/components/admin/Pagination";
import { badgeVariantClasses } from "@/components/admin/StatusBadge";
import { OpportunityTypeBadge } from "@/components/employer/jobs/OpportunityTypeBadge";
import {
  OUTCOME_LABEL,
  REASON_LABEL,
  REPORTS_PAGE_SIZE,
  TARGET_LABEL,
  opportunityTypeOf,
} from "@/config/job-reports";
import { useAdminJobReports } from "@/hooks/admin/use-admin-job-reports";
import type { JobReportStatus, JobReportTarget } from "@/types/job-moderation";

const STATUS_TABS: { value: JobReportStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "RESOLVED", label: "Resolved" },
];

const TARGET_OPTIONS: { value: JobReportTarget | "all"; label: string }[] = [
  { value: "all", label: "Postings and applicants" },
  { value: "POSTING", label: "Postings" },
  { value: "APPLICANT", label: "Applicants" },
];

export default function AdminJobReportsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" rows={5} />}>
      <AdminJobReportsPageInner />
    </Suspense>
  );
}

function AdminJobReportsPageInner() {
  // A link from a job's page lists just the reports about that posting.
  const jobId = useSearchParams().get("jobId") ?? undefined;
  const [status, setStatus] = useState<JobReportStatus>("OPEN");
  const [target, setTarget] = useState<JobReportTarget | "all">("all");
  const [page, setPage] = useState(1);

  const { data, isPending, isError, refetch } = useAdminJobReports({
    status,
    targetType: target === "all" ? undefined : target,
    jobId,
    page,
    pageSize: REPORTS_PAGE_SIZE,
  });

  return (
    <>
      <AdminPageHeader
        title="Job reports"
        description="What users have reported about live vacancies, internships and the people who applied. Postings aren't held for approval before they go live: take one down here, or from its job page."
      />

      {jobId && (
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-kampmax-muted px-3 py-1 text-xs text-kampmax-text">
          Showing reports about one posting
          <Link href="/admin/job-reports" aria-label="Show every report" className="rounded-full p-0.5 hover:bg-white">
            <X className="h-3 w-3" aria-hidden />
          </Link>
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Report status" className="flex gap-1 border-b border-kampmax-border">
          {STATUS_TABS.map((t) => {
            const active = status === t.value;
            const count = data?.counts[t.value === "OPEN" ? "open" : "resolved"];
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStatus(t.value);
                  setPage(1);
                }}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "border-kampmax-blue text-kampmax-blue"
                    : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
                )}
              >
                {t.label}
                {count !== undefined && (
                  <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums text-kampmax-text-secondary">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <label className="sr-only" htmlFor="report-target">
          Filter by what was reported
        </label>
        <select
          id="report-target"
          value={target}
          onChange={(e) => {
            setTarget(e.target.value as JobReportTarget | "all");
            setPage(1);
          }}
          className="h-9 rounded-md border border-kampmax-border bg-white px-2.5 text-sm text-kampmax-text"
        >
          {TARGET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <section aria-label="Reports" className="rounded-lg border border-kampmax-border bg-white">
        {isPending ? (
          <div className="p-4">
            <LoadingSkeleton variant="table" rows={5} />
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState
            title={status === "OPEN" ? "Nothing waiting" : "No resolved reports"}
            message={
              status === "OPEN"
                ? "No open reports. When someone reports a posting or an applicant it shows up here."
                : "Reports you resolve are kept here."
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-kampmax-border text-xs text-kampmax-text-secondary">
                    <th scope="col" className="px-4 py-2 font-medium">Reported</th>
                    <th scope="col" className="px-4 py-2 font-medium">Reason</th>
                    <th scope="col" className="px-4 py-2 font-medium">By</th>
                    <th scope="col" className="px-4 py-2 font-medium">{status === "OPEN" ? "Sent" : "Outcome"}</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kampmax-border">
                  {data.items.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2.5">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-kampmax-text">{r.job.title}</span>
                          <OpportunityTypeBadge type={opportunityTypeOf(r.job.opportunityType)} />
                        </span>
                        <span className="block text-[11px] text-kampmax-text-secondary">
                          {TARGET_LABEL[r.targetType]}
                          {r.applicant ? `: ${r.applicant.name}` : ""} · {r.job.employerName || "Employer"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-kampmax-text">{REASON_LABEL[r.reason]}</span>
                        {r.openOnPosting > 1 && r.status === "OPEN" && (
                          <span
                            className={cn(
                              "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                              badgeVariantClasses("warning")
                            )}
                          >
                            {r.openOnPosting} open on this posting
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-kampmax-text-secondary">
                        {r.reporter.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-kampmax-text-secondary">
                        {r.status === "OPEN"
                          ? timeAgo(r.createdAt)
                          : `${r.outcome ? OUTCOME_LABEL[r.outcome] : "Resolved"}${r.resolvedAt ? ` · ${timeAgo(r.resolvedAt)}` : ""}`}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <Link
                          href={`/admin/job-reports/${r.id}`}
                          aria-label={`Open the report on ${r.job.title}`}
                          className="inline-flex h-7 items-center rounded-md border border-kampmax-border bg-white px-2.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
                        >
                          {r.status === "OPEN" ? "Review" : "View"}
                        </Link>
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

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-kampmax-text-secondary">
        <Flag className="h-3 w-3" aria-hidden />
        The person you act on is never told who reported them. The reporter is told only whether action was taken.
      </p>
    </>
  );
}

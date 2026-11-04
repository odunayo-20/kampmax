"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Flag } from "lucide-react";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { ApplicantStatusBadge } from "@/components/admin/jobs/ApplicantStatusBadge";
import { ApplicationReviewDialog } from "@/components/admin/jobs/ApplicationReviewDialog";
import { ResolveReportDialog } from "@/components/admin/jobs/ResolveReportDialog";
import { OpportunityTypeBadge } from "@/components/employer/jobs/OpportunityTypeBadge";
import { OUTCOME_LABEL, REASON_LABEL, TARGET_LABEL, opportunityTypeOf } from "@/config/job-reports";
import { useAdminJobReport } from "@/hooks/admin/use-admin-job-reports";
import { resolvedNotice } from "@/lib/job-reports";

export default function AdminJobReportPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";

  const { data: report, isPending, isError, refetch } = useAdminJobReport(id);
  const [resolving, setResolving] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!id) return <ReportNotFound />;
  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-72 animate-pulse rounded bg-kampmax-muted" />
        <LoadingSkeleton variant="cards" rows={2} />
      </div>
    );
  }
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (!report) return <ReportNotFound />;

  const open = report.status === "OPEN";

  return (
    <>
      <Link
        href="/admin/job-reports"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-kampmax-text-secondary transition-colors hover:text-kampmax-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All reports
      </Link>

      <AdminPageHeader
        title={`${TARGET_LABEL[report.targetType]} report: ${REASON_LABEL[report.reason]}`}
        description={`On “${report.job.title}” · sent ${timeAgo(report.createdAt)}`}
        actions={
          <>
            <Link
              href={`/admin/jobs/${report.job.id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open the job
            </Link>
            {open && (
              <button
                type="button"
                onClick={() => setResolving(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-navy px-3 text-sm font-medium text-white transition-colors hover:bg-kampmax-navy-light"
              >
                <Flag className="h-3.5 w-3.5" />
                Resolve
              </button>
            )}
          </>
        }
      />

      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section aria-label="Report" className="rounded-lg border border-kampmax-border bg-white">
            <div className="flex items-center justify-between border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">The report</h2>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  open ? "bg-kampmax-warning/10 text-amber-700" : "bg-emerald-50 text-emerald-700"
                )}
              >
                {open ? "Open" : report.outcome ? OUTCOME_LABEL[report.outcome] : "Resolved"}
              </span>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
              <Row label="Reason" value={REASON_LABEL[report.reason]} />
              <Row label="About" value={TARGET_LABEL[report.targetType]} />
              <Row label="Reported by" value={`${report.reporter.name}${report.reporter.username ? ` (@${report.reporter.username})` : ""}`} />
              <Row label="Sent" value={formatDateTime(report.createdAt)} />
            </dl>
            <div className="border-t border-kampmax-border px-4 py-3">
              <p className="text-xs font-medium text-kampmax-text-secondary">What they said</p>
              <p className="mt-1 whitespace-pre-line text-sm text-kampmax-text">
                {report.details || "They gave no details."}
              </p>
            </div>
          </section>

          {!open && (
            <section aria-label="Resolution" className="rounded-lg border border-kampmax-border bg-white">
              <div className="border-b border-kampmax-border px-4 py-3">
                <h2 className="text-sm font-semibold text-kampmax-text">How it was resolved</h2>
              </div>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
                <Row label="Outcome" value={report.outcome ? OUTCOME_LABEL[report.outcome] : "Resolved"} />
                <Row label="When" value={report.resolvedAt ? formatDateTime(report.resolvedAt) : "—"} />
              </dl>
              {report.resolutionNote && (
                <div className="border-t border-kampmax-border px-4 py-3">
                  <p className="text-xs font-medium text-kampmax-text-secondary">Note</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-kampmax-text">{report.resolutionNote}</p>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="space-y-4">
          <section aria-label="Posting" className="rounded-lg border border-kampmax-border bg-white">
            <div className="border-b border-kampmax-border px-4 py-3">
              <h2 className="text-sm font-semibold text-kampmax-text">The posting</h2>
            </div>
            <div className="space-y-2 px-4 py-3.5">
              <p className="flex flex-wrap items-center gap-1.5 font-medium text-kampmax-text">
                {report.job.title}
                <OpportunityTypeBadge type={opportunityTypeOf(report.job.opportunityType)} />
              </p>
              <p className="text-xs text-kampmax-text-secondary">{report.job.employerName || "Employer"}</p>
              <p className="text-xs capitalize text-kampmax-text-secondary">
                Status: {report.job.status.toLowerCase()}
              </p>
              <p className="text-xs text-kampmax-text-secondary">
                {report.openOnPosting} open {report.openOnPosting === 1 ? "report" : "reports"} on this posting
              </p>
            </div>
          </section>

          {report.applicant && (
            <section aria-label="Applicant" className="rounded-lg border border-kampmax-border bg-white">
              <div className="border-b border-kampmax-border px-4 py-3">
                <h2 className="text-sm font-semibold text-kampmax-text">The applicant</h2>
              </div>
              <div className="space-y-2 px-4 py-3.5">
                <p className="font-medium text-kampmax-text">{report.applicant.name}</p>
                {report.applicant.username && (
                  <p className="text-xs text-kampmax-text-secondary">@{report.applicant.username}</p>
                )}
                <ApplicantStatusBadge status={report.applicant.applicationStatus.toLowerCase()} />
                <div>
                  <button
                    type="button"
                    onClick={() => setReviewing(report.applicant!.applicationId)}
                    className="mt-1 inline-flex h-9 items-center rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
                  >
                    Review application
                  </button>
                  <p className="mt-1.5 text-[11px] text-kampmax-text-secondary">
                    Opens their note, answers and CV. Recorded in the audit log.
                  </p>
                </div>
              </div>
            </section>
          )}
          {report.targetType === "APPLICANT" && !report.applicant && (
            <p className="rounded-lg border border-dashed border-kampmax-border bg-white px-4 py-3 text-xs text-kampmax-text-secondary">
              The application has since been cleaned up, so there is nothing left to review or remove.
            </p>
          )}
        </div>
      </div>

      <ResolveReportDialog
        report={resolving ? report : null}
        onClose={() => setResolving(false)}
        onResolved={(result) => {
          setResolving(false);
          setNotice(resolvedNotice(result));
        }}
      />
      <ApplicationReviewDialog applicationId={reviewing} onClose={() => setReviewing(null)} />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-kampmax-text-secondary">{label}</dt>
      <dd className="mt-0.5 text-sm text-kampmax-text">{value}</dd>
    </div>
  );
}

function ReportNotFound() {
  return (
    <div className="rounded-lg border border-kampmax-border bg-white p-4">
      <ErrorState title="Report not found" message="It may have been removed, or the link is incorrect." />
      <div className="mt-3 text-center">
        <Link
          href="/admin/job-reports"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-kampmax-blue hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to reports
        </Link>
      </div>
    </div>
  );
}

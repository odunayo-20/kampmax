"use client";

import { useState } from "react";
import { FileText, HandCoins, Lock } from "lucide-react";
import { formatNaira, timeAgo } from "@/lib/utils";
import { useAdminJobApplicants } from "@/hooks/admin/use-admin-jobs";
import { Pagination } from "@/components/admin/Pagination";
import { ErrorState } from "@/components/admin/ErrorState";
import { EmptyState } from "@/components/admin/EmptyState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { ApplicantStatusBadge, applicantStatusLabel } from "@/components/admin/jobs/ApplicantStatusBadge";
import { ApplicationReviewDialog } from "@/components/admin/jobs/ApplicationReviewDialog";
import type { ManagedJobApplicantRow } from "@/types/admin";

export { applicantStatusLabel };

const PAGE_SIZE = 10;

/** What the person applied with: the amount they asked for, or the CV they chose. */
export function appliedWith(row: Pick<ManagedJobApplicantRow, "kind" | "amount" | "cvLabel">): string {
  if (row.kind === "application") {
    return row.cvLabel ? `CV: ${row.cvLabel}` : "CV application";
  }
  return row.amount != null ? `Proposal: ${formatNaira(row.amount)}` : "Proposal";
}

/**
 * Everyone who applied to one posting: proposals on a gig, CV applications on
 * a vacancy or internship. The list shows who, how and where it stands. A CV
 * application can be opened to read the note and answers and open the CV, which
 * is logged; a proposal has no CV to review.
 */
export function JobApplicantsTable({ jobId }: { jobId: string }) {
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const { data, isPending, isError, refetch } = useAdminJobApplicants(jobId, page, PAGE_SIZE);

  return (
    <section aria-label="Applicants" className="rounded-lg border border-kampmax-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-kampmax-border px-4 py-3">
        <h2 className="text-sm font-semibold text-kampmax-text">Applicants</h2>
        <p className="flex items-center gap-1.5 text-[11px] text-kampmax-text-secondary">
          <Lock className="h-3 w-3" aria-hidden />
          Opening a CV application is private and recorded in the audit log.
        </p>
      </div>

      {isPending ? (
        <div className="p-4">
          <LoadingSkeleton variant="table" rows={4} />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState compact title="No applicants yet" message="Nobody has applied to this posting." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-kampmax-border text-xs text-kampmax-text-secondary">
                  <th scope="col" className="px-4 py-2 font-medium">Applicant</th>
                  <th scope="col" className="px-4 py-2 font-medium">Applied with</th>
                  <th scope="col" className="px-4 py-2 font-medium">Applied</th>
                  <th scope="col" className="px-4 py-2 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kampmax-border">
                {data.items.map((row) => (
                  <tr key={`${row.kind}-${row.id}`}>
                    <td className="px-4 py-2.5">
                      <span className="block font-medium text-kampmax-text">{row.name}</span>
                      {row.username && (
                        <span className="block text-[11px] text-kampmax-text-secondary">@{row.username}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-kampmax-text-secondary">
                      <span className="inline-flex items-center gap-1.5">
                        {row.kind === "application" ? (
                          <FileText className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <HandCoins className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {appliedWith(row)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-kampmax-text-secondary">
                      {row.appliedAt ? timeAgo(row.appliedAt) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <ApplicantStatusBadge status={row.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      {row.kind === "application" && (
                        <button
                          type="button"
                          onClick={() => setReviewing(row.id)}
                          aria-label={`Review ${row.name}'s application`}
                          className="inline-flex h-7 items-center rounded-md border border-kampmax-border bg-white px-2.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
                        >
                          Review
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
            unitLabel="applicants"
          />
        </>
      )}
      <ApplicationReviewDialog applicationId={reviewing} onClose={() => setReviewing(null)} />
    </section>
  );
}

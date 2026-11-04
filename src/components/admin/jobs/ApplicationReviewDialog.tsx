"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Lock, X } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { ApplicantStatusBadge } from "@/components/admin/jobs/ApplicantStatusBadge";
import { openApplicationCv, useAdminApplication } from "@/hooks/admin/use-admin-job-reports";

/**
 * A moderator reading what an applicant sent: their note, their answers and,
 * on request, their CV. Both are private to the applicant and the employer, so
 * the server writes each look to the audit log before showing anything, and a
 * CV only opens through a link that lasts a few minutes.
 */
export function ApplicationReviewDialog({
  applicationId,
  onClose,
}: {
  applicationId: string | null;
  onClose: () => void;
}) {
  const query = useAdminApplication(applicationId);
  const [opening, setOpening] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);

  useEffect(() => {
    setCvError(null);
    setOpening(false);
  }, [applicationId]);

  useEffect(() => {
    if (!applicationId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [applicationId, onClose]);

  if (!applicationId) return null;

  const a = query.data;

  const openCv = async () => {
    setCvError(null);
    setOpening(true);
    const { error } = await openApplicationCv(applicationId);
    setOpening(false);
    if (error) setCvError(error);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Review application"
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-kampmax-border bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-kampmax-text">
              {a ? a.applicant.name : "Application"}
            </h2>
            {a && (
              <p className="mt-0.5 text-xs text-kampmax-text-secondary">
                {a.applicant.username ? `@${a.applicant.username} · ` : ""}
                {a.job.title} · {a.job.employerName}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {a && <ApplicantStatusBadge status={a.status} />}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-md p-1 text-kampmax-text-secondary hover:bg-kampmax-muted hover:text-kampmax-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-kampmax-muted/60 px-3 py-2 text-[11px] leading-relaxed text-kampmax-text-secondary">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          This is private to the applicant and the employer. Looking at it, and opening the CV, is
          recorded in the audit log with your name.
        </p>

        {query.isPending ? (
          <div className="mt-4">
            <LoadingSkeleton variant="cards" rows={2} />
          </div>
        ) : query.isError || !a ? (
          <ErrorState
            title="Couldn't open the application"
            message={query.error instanceof Error ? query.error.message : undefined}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm text-kampmax-text">
                <FileText className="h-4 w-4 text-kampmax-text-secondary" aria-hidden />
                {a.cvLabel}
              </span>
              <button
                type="button"
                onClick={() => void openCv()}
                disabled={!a.cvAvailable || opening}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                {!a.cvAvailable ? "CV no longer available" : opening ? "Opening…" : "Open CV"}
              </button>
            </div>
            {cvError && (
              <p role="alert" className="text-xs text-kampmax-error">
                {cvError}
              </p>
            )}

            <section aria-label="Note">
              <h3 className="text-xs font-medium text-kampmax-text-secondary">Note to the employer</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-kampmax-text">
                {a.coverNote || "No note."}
              </p>
            </section>

            {a.answers.length > 0 && (
              <section aria-label="Answers">
                <h3 className="text-xs font-medium text-kampmax-text-secondary">Answers</h3>
                <dl className="mt-1 space-y-2">
                  {a.answers.map((x, i) => (
                    <div key={i}>
                      <dt className="text-xs font-medium text-kampmax-text-secondary">
                        {x.question || "Question removed from the posting"}
                      </dt>
                      <dd className="mt-0.5 whitespace-pre-line text-sm text-kampmax-text">{x.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {a.employerNote && (
              <section aria-label="Employer message">
                <h3 className="text-xs font-medium text-kampmax-text-secondary">Employer&apos;s message</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-kampmax-text">{a.employerNote}</p>
              </section>
            )}

            <p className="border-t border-kampmax-border pt-3 text-[11px] text-kampmax-text-secondary">
              Applied {formatDateTime(a.createdAt)}
              {a.viewedAt ? ` · seen by the employer ${formatDateTime(a.viewedAt)}` : ""}
              {a.decidedAt ? ` · decided ${formatDateTime(a.decidedAt)}` : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

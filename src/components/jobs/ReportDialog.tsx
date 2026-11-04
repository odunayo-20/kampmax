"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Flag, X } from "lucide-react";
import { Button } from "@/components/ui";
import { REASON_LABEL, REPORT_DETAILS_MAX_CHARS, REPORT_REASONS } from "@/config/job-reports";
import { useReportApplicant, useReportPosting } from "@/hooks/use-job-reports";
import { getRefusalMessage } from "@/lib/error-messages";
import { cn } from "@/lib/utils";
import type { JobReportReason } from "@/types/job-moderation";

export type ReportTarget =
  | { kind: "posting"; jobId: string; title: string }
  | { kind: "applicant"; applicationId: string; name: string };

/**
 * Tell the Kampmax team about a posting that looks wrong, or (as the employer)
 * about someone who applied. Postings are not checked before they go live, so
 * this is how a bad one is found. The person reported is never told who
 * reported them.
 */
export function ReportDialog({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: ReportTarget;
  onClose: () => void;
}) {
  const reportPosting = useReportPosting(target.kind === "posting" ? target.jobId : "");
  const reportApplicant = useReportApplicant(target.kind === "applicant" ? target.applicationId : "");
  const mutation = target.kind === "posting" ? reportPosting : reportApplicant;

  const [reason, setReason] = useState<JobReportReason | "">("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // A fresh form every time it opens.
  useEffect(() => {
    if (!open) return;
    setReason("");
    setDetails("");
    setError(null);
    setSent(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !mutation.isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mutation.isPending, onClose]);

  if (!open) return null;

  const subject = target.kind === "posting" ? target.title : target.name;
  const reasons = REPORT_REASONS[target.kind === "posting" ? "POSTING" : "APPLICANT"];

  const submit = () => {
    if (!reason) return;
    setError(null);
    mutation.mutate(
      { reason, details: details.trim() || undefined },
      {
        onSuccess: () => setSent(true),
        // "You already reported this" is written for the person.
        onError: (err) => setError(getRefusalMessage(err)),
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={target.kind === "posting" ? "Report this posting" : "Report this applicant"}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden onClick={mutation.isPending ? undefined : onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-neutral-900">
              {target.kind === "posting" ? "Report this posting" : "Report this applicant"}
            </h2>
            <p className="mt-0.5 truncate text-xs text-neutral-500">{subject}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            aria-label="Close"
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {sent ? (
          <div className="mt-6 flex flex-col items-center text-center" role="status">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-600">
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-semibold text-neutral-900">Thanks, we&apos;ll take a look</p>
            <p className="mt-1 max-w-xs text-xs text-neutral-500">
              The Kampmax team reviews every report and will let you know what was decided.
            </p>
            <Button size="sm" className="mt-5" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <fieldset className="mt-5">
              <legend className="mb-2 text-xs font-semibold text-neutral-700">What&apos;s wrong? *</legend>
              <ul className="space-y-2">
                {reasons.map((r) => (
                  <li key={r.value}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm",
                        reason === r.value ? "border-primary-600 bg-primary-50" : "border-neutral-200 hover:bg-neutral-50"
                      )}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="mt-0.5 h-4 w-4 accent-primary-600"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-neutral-900">{REASON_LABEL[r.value]}</span>
                        <span className="block text-xs text-neutral-500">{r.hint}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold text-neutral-700" htmlFor="report-details">
                What happened? <span className="font-normal text-neutral-400">(optional)</span>
              </label>
              <textarea
                id="report-details"
                rows={3}
                value={details}
                maxLength={REPORT_DETAILS_MAX_CHARS}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
              />
            </div>

            <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              {target.kind === "posting"
                ? "The employer isn't told who reported them."
                : "The applicant isn't told who reported them."}{" "}
              Kampmax staff will read your report.
            </p>

            {error && (
              <p role="alert" className="mt-3 text-sm text-error-600">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={submit} disabled={!reason || mutation.isPending}>
                <Flag className="mr-1.5 h-4 w-4" aria-hidden />
                {mutation.isPending ? "Sending…" : "Send report"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACTION_LABEL, RESOLUTION_NOTE_MAX_CHARS } from "@/config/job-reports";
import { useResolveJobReport } from "@/hooks/admin/use-admin-job-reports";
import type {
  AdminJobReport,
  JobReportAction,
  ResolveReportResult,
} from "@/types/job-moderation";

const OPTIONS: Record<AdminJobReport["targetType"], { action: JobReportAction; hint: string }[]> = {
  POSTING: [
    { action: "DISMISS", hint: "Nothing here breaks the rules. The report is closed and the posting stays live." },
    { action: "TAKE_DOWN", hint: "The posting comes off the marketplace and the employer is told why." },
  ],
  APPLICANT: [
    { action: "DISMISS", hint: "Nothing here breaks the rules. The report is closed and the application stays." },
    { action: "REMOVE_APPLICATION", hint: "The application disappears from the employer's list and the applicant is told why." },
  ],
};

/** Who is shown the note, which decides what the field is called. */
const NOTE_AUDIENCE: Partial<Record<JobReportAction, string>> = {
  TAKE_DOWN: "the employer",
  REMOVE_APPLICATION: "the applicant",
};

/**
 * Closing a report. Dismissing needs nothing; taking a posting down or removing
 * an application needs a reason, because the person it is about is shown it.
 * The reporter is only ever told the outcome.
 */
export function ResolveReportDialog({
  report,
  onClose,
  onResolved,
}: {
  report: AdminJobReport | null;
  onClose: () => void;
  onResolved: (result: ResolveReportResult) => void;
}) {
  const resolve = useResolveJobReport(report?.id ?? "");
  const [action, setAction] = useState<JobReportAction | "">("");
  const [note, setNote] = useState("");
  const [refund, setRefund] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAction("");
    setNote("");
    setRefund(false);
    setError(null);
  }, [report?.id]);

  useEffect(() => {
    if (!report) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !resolve.isPending) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [report, resolve.isPending, onClose]);

  if (!report) return null;

  const options = OPTIONS[report.targetType];
  const audience = action ? NOTE_AUDIENCE[action] : undefined;
  const needsNote = !!audience;
  const closed = report.job.status === "CLOSED";
  const ready = !!action && (!needsNote || note.trim().length >= 3);

  const submit = () => {
    if (!action || !ready) return;
    setError(null);
    resolve.mutate(
      {
        action,
        note: note.trim() || undefined,
        ...(action === "TAKE_DOWN" && refund ? { refund: true } : {}),
      },
      {
        onSuccess: (result) => onResolved(result),
        onError: (err) => setError(err instanceof Error ? err.message : "Couldn't resolve the report."),
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Resolve report"
    >
      <button
        type="button"
        aria-label="Cancel"
        tabIndex={-1}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={() => !resolve.isPending && onClose()}
      />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-kampmax-border bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-kampmax-text">Resolve this report</h2>
            <p className="mt-0.5 truncate text-xs text-kampmax-text-secondary">{report.job.title}</p>
          </div>
          {!resolve.isPending && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-md p-1 text-kampmax-text-secondary hover:bg-kampmax-muted hover:text-kampmax-text"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <fieldset className="mt-4">
          <legend className="sr-only">What to do</legend>
          <ul className="space-y-2">
            {options.map((o) => {
              const blocked = o.action === "TAKE_DOWN" && closed;
              return (
                <li key={o.action}>
                  <label
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-sm",
                      blocked
                        ? "cursor-not-allowed border-kampmax-border opacity-60"
                        : "cursor-pointer hover:bg-kampmax-muted/40",
                      action === o.action && "border-kampmax-blue bg-kampmax-blue/5"
                    )}
                  >
                    <input
                      type="radio"
                      name="resolve-action"
                      value={o.action}
                      checked={action === o.action}
                      disabled={blocked || resolve.isPending}
                      onChange={() => setAction(o.action)}
                      className="mt-0.5 h-4 w-4 accent-kampmax-blue"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-kampmax-text">{ACTION_LABEL[o.action]}</span>
                      <span className="block text-xs text-kampmax-text-secondary">
                        {blocked ? "A closed posting can't be taken down." : o.hint}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        {action && (
          <div className="mt-4">
            <label htmlFor="resolve-note" className="mb-1 block text-xs font-medium text-kampmax-text">
              {audience ? `Reason (${audience} can see this)` : "Note (only admins see this)"}
              {!audience && <span className="font-normal text-kampmax-text-secondary"> · optional</span>}
            </label>
            <textarea
              id="resolve-note"
              rows={3}
              value={note}
              maxLength={RESOLUTION_NOTE_MAX_CHARS}
              disabled={resolve.isPending}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-kampmax-border bg-white px-3 py-2 text-sm focus:border-kampmax-blue focus:outline-none focus:ring-1 focus:ring-kampmax-blue"
            />
          </div>
        )}

        {action === "TAKE_DOWN" && (
          <label className="mt-3 flex items-start gap-2 text-sm text-kampmax-text">
            <input
              type="checkbox"
              checked={refund}
              disabled={resolve.isPending}
              onChange={(e) => setRefund(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-kampmax-blue"
            />
            <span>
              Also refund the posting fee
              <span className="block text-xs text-kampmax-text-secondary">
                Gives the employer back what they paid, or restores their free posting.
              </span>
            </span>
          </label>
        )}

        {report.targetType === "POSTING" && report.openOnPosting > 1 && action === "TAKE_DOWN" && (
          <p className="mt-3 rounded-lg bg-kampmax-muted/60 px-3 py-2 text-xs text-kampmax-text-secondary">
            The other {report.openOnPosting - 1} open{" "}
            {report.openOnPosting - 1 === 1 ? "report" : "reports"} on this posting will be closed too.
          </p>
        )}

        <p className="mt-3 text-[11px] text-kampmax-text-secondary">
          The person who reported this is only told whether action was taken, never your note.
        </p>

        {error && (
          <p role="alert" className="mt-3 text-sm text-kampmax-error">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={resolve.isPending}
            className="inline-flex h-9 items-center rounded-md border border-kampmax-border bg-white px-3.5 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!ready || resolve.isPending}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-sm font-medium text-white transition-colors disabled:opacity-60",
              action === "DISMISS" || !action
                ? "bg-kampmax-navy hover:bg-kampmax-navy-light"
                : "bg-kampmax-error hover:bg-red-700"
            )}
          >
            {resolve.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {resolve.isPending ? "Working…" : action ? ACTION_LABEL[action] : "Resolve"}
          </button>
        </div>
      </div>
    </div>
  );
}

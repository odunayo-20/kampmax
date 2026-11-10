"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  REPORT_REASON_LABELS,
  RESOLUTION_MAX,
  RESOLUTION_MIN,
  canSuspendFromReport,
  type AdminReport,
  type ResolveReportInput,
} from "@/types/accommodation";

interface ResolveReportDialogProps {
  /** The report being handled; the dialog is closed while this is null. */
  report: AdminReport | null;
  loading?: boolean;
  /** Why the last attempt failed, shown inside the dialog so the note is not lost. */
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: ResolveReportInput) => void;
}

/**
 * Closes a report: it was acted on (resolved) or there was nothing wrong
 * (dismissed), with a note that stays on the report. Resolving can also take the
 * listing down in the same step. The person who reported it is told the outcome.
 */
export function ResolveReportDialog({ report, loading = false, error, onClose, onSubmit }: ResolveReportDialogProps) {
  const [decision, setDecision] = useState<ResolveReportInput["decision"]>("RESOLVED");
  const [resolution, setResolution] = useState("");
  const [suspend, setSuspend] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const open = report !== null;
  const reportId = report?.id;

  // Each report starts from a clean form.
  useEffect(() => {
    if (!reportId) return;
    setDecision("RESOLVED");
    setResolution("");
    setSuspend(false);
    noteRef.current?.focus();
  }, [reportId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, loading, onClose]);

  if (!report) return null;

  const note = resolution.trim();
  const noteOk = note.length >= RESOLUTION_MIN && note.length <= RESOLUTION_MAX;
  const canSuspend = canSuspendFromReport(report);
  const dismissing = decision === "DISMISSED";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="resolve-report-title">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={() => !loading && onClose()}
      />
      <form
        className="relative w-full max-w-lg rounded-xl border border-kampmax-border bg-white p-5 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (!noteOk || loading) return;
          onSubmit({ decision, resolution: note, suspendListing: !dismissing && canSuspend && suspend });
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="resolve-report-title" className="text-sm font-semibold text-kampmax-text">
              Handle this report
            </h2>
            <p className="mt-1 text-sm text-kampmax-text-secondary">
              <span className="font-medium text-kampmax-text">{REPORT_REASON_LABELS[report.reason]}</span>
              {report.listingTitle ? ` · ${report.listingTitle}` : ""}
            </p>
            {report.description && (
              <p className="mt-1 rounded-md bg-kampmax-muted/60 px-2.5 py-1.5 text-xs text-kampmax-text-secondary">
                “{report.description}”
              </p>
            )}
          </div>
          {!loading && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-1 -mt-1 rounded-md p-1 text-kampmax-text-secondary hover:bg-kampmax-muted hover:text-kampmax-text"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <fieldset className="mt-4" disabled={loading}>
          <legend className="mb-1.5 text-xs font-medium text-kampmax-text">What did you find?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["RESOLVED", "Acted on it", "There was a problem and you dealt with it."],
                ["DISMISSED", "Nothing wrong", "You checked and found nothing to act on."],
              ] as const
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                  decision === value ? "border-kampmax-blue bg-kampmax-blue/5" : "border-kampmax-border"
                )}
              >
                <input
                  type="radio"
                  name="decision"
                  value={value}
                  checked={decision === value}
                  onChange={() => setDecision(value)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block font-medium text-kampmax-text">{label}</span>
                  <span className="block text-[11px] text-kampmax-text-secondary">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-3">
          <label htmlFor="resolve-report-note" className="mb-1 block text-xs font-medium text-kampmax-text">
            What you found and did (kept on the report)
          </label>
          <textarea
            ref={noteRef}
            id="resolve-report-note"
            value={resolution}
            rows={3}
            maxLength={RESOLUTION_MAX}
            disabled={loading}
            onChange={(e) => setResolution(e.target.value)}
            className="w-full rounded-lg border border-kampmax-border bg-white px-3 py-2 text-sm focus:border-kampmax-blue focus:outline-none focus:ring-1 focus:ring-kampmax-blue"
          />
          <p className="mt-0.5 text-[11px] text-kampmax-text-secondary">
            At least {RESOLUTION_MIN} characters. The person who reported it is told whether you acted, not what you wrote.
          </p>
        </div>

        {!dismissing && (
          <div className="mt-3">
            <label className={cn("flex items-start gap-2 text-sm", !canSuspend && "opacity-60")}>
              <input
                type="checkbox"
                checked={suspend && canSuspend}
                disabled={!canSuspend || loading}
                onChange={(e) => setSuspend(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="block font-medium text-kampmax-text">Also take the listing down</span>
                <span className="block text-[11px] text-kampmax-text-secondary">
                  {canSuspend
                    ? "It disappears from the site at once and the agent is told. You can restore it later."
                    : "It is already off the site, so there is nothing to take down."}
                </span>
              </span>
            </label>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-9 items-center rounded-md border border-kampmax-border bg-white px-3.5 text-sm font-medium text-kampmax-text hover:bg-kampmax-muted/60 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!noteOk || loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-navy px-3.5 text-sm font-medium text-white hover:bg-kampmax-navy-light disabled:opacity-60"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {dismissing ? "Dismiss report" : "Close report"}
          </button>
        </div>
      </form>
    </div>
  );
}

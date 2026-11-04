"use client";

import { useEffect, useId, useState } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn, formatDateShort, formatNaira } from "@/lib/utils";
import { milestoneAtStake } from "@/lib/engagement-milestones";
import { EngagementRevisions } from "@/components/engagements/EngagementRevisions";
import type { Engagement, EngagementDisputeOutcome } from "@/services/jobs";

const MIN_NOTE = 5;
const MAX_NOTE = 1000;

const partyName = (p: Engagement["employer"], fallback: string) => p.fullName || p.username || fallback;

/**
 * Where an admin reads a contract dispute and rules on it. While it is open
 * the admin must pick a side — nothing is pre-selected — and explain the
 * ruling; the confirm button spells out exactly who gets the money. Once
 * resolved it is a read-only record of what was decided. Mount only while open.
 */
export function ContractDisputeDialog({
  engagement,
  busy,
  error,
  onResolve,
  onClose,
}: {
  engagement: Engagement;
  busy: boolean;
  error: string | null;
  onResolve: (outcome: EngagementDisputeOutcome, note: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const [outcome, setOutcome] = useState<EngagementDisputeOutcome | null>(null);
  const [note, setNote] = useState("");

  const dispute = engagement.dispute;
  const employer = partyName(engagement.employer, "The employer");
  const freelancer = partyName(engagement.freelancer, "The freelancer");
  // Only one milestone is ever held in escrow: that, not the contract total, is what a ruling moves.
  const stake = milestoneAtStake(engagement);
  const amount = formatNaira(stake.amount);
  // For an hourly week the two rulings move different amounts: releasing pays
  // only the hours worked, while refunding returns everything held for the week.
  const releaseAmount = formatNaira(stake.release);
  const resolved = !!dispute?.resolvedAt;
  const trimmed = note.trim();
  const ready = outcome !== null && trimmed.length >= MIN_NOTE;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  if (!dispute) return null;

  const openedBy =
    dispute.openedBy === "EMPLOYER" ? employer : dispute.openedBy === "FREELANCER" ? freelancer : "Someone";
  const confirmLabel =
    outcome === "RELEASE"
      ? `Pay ${releaseAmount} to ${freelancer}`
      : outcome === "REFUND"
        ? `Refund ${amount} to ${employer}`
        : "Choose a ruling";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={() => !busy && onClose()}
      />
      <form
        className="relative flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-xl border border-kampmax-border bg-white shadow-xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready && !busy && outcome) onResolve(outcome, trimmed);
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-kampmax-border p-5">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-sm font-semibold text-kampmax-text">
              {engagement.job?.title || "Contract"}
            </h2>
            <p className="mt-1 text-xs text-kampmax-text-secondary">
              {amount} held in escrow{stake.label ? ` for ${stake.label}` : ""} · Reported{" "}
              {formatDateShort(dispute.openedAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge variant={resolved ? "success" : "error"} label={resolved ? "Resolved" : "Open"} />
            {!busy && (
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
        </div>

        <div className="space-y-4 overflow-y-auto p-5 text-sm">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="font-medium uppercase tracking-wide text-kampmax-text-secondary">Employer</dt>
              <dd className="mt-0.5 text-kampmax-text">{employer}</dd>
            </div>
            <div>
              <dt className="font-medium uppercase tracking-wide text-kampmax-text-secondary">Freelancer</dt>
              <dd className="mt-0.5 text-kampmax-text">{freelancer}</dd>
            </div>
          </dl>

          <section aria-label="Reported problem" className="rounded-lg border border-kampmax-border bg-kampmax-muted/40 p-3">
            <p className="text-xs font-medium text-kampmax-text-secondary">{openedBy} reported:</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-kampmax-text">{dispute.reason}</p>
          </section>

          {/* What the client asked for, and what counted: the context for judging a delivery dispute. */}
          <EngagementRevisions revisions={engagement.revisions} status={engagement.status} role="admin" />

          {resolved ? (
            <section aria-label="Ruling" className="rounded-lg border border-kampmax-border p-3">
              <p className="font-medium text-kampmax-text">
                {dispute.outcome === "RELEASE"
                  ? `${releaseAmount} was paid to ${freelancer}`
                  : `${amount} was refunded to ${employer}`}
              </p>
              <p className="mt-0.5 text-xs text-kampmax-text-secondary">
                Settled {formatDateShort(dispute.resolvedAt as string)}
              </p>
              {dispute.resolution && (
                <p className="mt-2 whitespace-pre-wrap break-words text-kampmax-text">{dispute.resolution}</p>
              )}
            </section>
          ) : (
            <>
              <fieldset disabled={busy}>
                <legend className="text-xs font-medium text-kampmax-text">Your ruling</legend>
                <div className="mt-2 grid gap-2">
                  <RulingOption
                    value="RELEASE"
                    checked={outcome === "RELEASE"}
                    onSelect={setOutcome}
                    title={`Pay the freelancer — ${releaseAmount}`}
                    detail={`${freelancer} receives the payment and the contract is marked completed.`}
                  />
                  <RulingOption
                    value="REFUND"
                    checked={outcome === "REFUND"}
                    onSelect={setOutcome}
                    title={`Refund the employer — ${amount}`}
                    detail={`${employer} gets the money back in their wallet and the contract is cancelled.`}
                  />
                </div>
              </fieldset>

              <div>
                <label htmlFor={`${titleId}-note`} className="text-xs font-medium text-kampmax-text">
                  Explain your ruling <span className="font-normal text-kampmax-text-secondary">(both people will see this)</span>
                </label>
                <textarea
                  id={`${titleId}-note`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={MAX_NOTE}
                  disabled={busy}
                  className="mt-1.5 w-full rounded-lg border border-kampmax-border px-3 py-2 text-sm focus:border-kampmax-blue focus:outline-none focus:ring-1 focus:ring-kampmax-blue disabled:bg-kampmax-muted/40"
                />
                <p className="mt-1 text-xs text-kampmax-text-secondary">
                  This moves the money immediately and can&apos;t be undone.
                </p>
              </div>

              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-kampmax-error"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-kampmax-border p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-md border border-kampmax-border bg-white px-3.5 text-sm font-medium text-kampmax-text hover:bg-kampmax-muted/60 disabled:opacity-60"
          >
            {resolved ? "Close" : "Not now"}
          </button>
          {!resolved && (
            <button
              type="submit"
              disabled={!ready || busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-navy px-3.5 text-sm font-medium text-white transition-colors hover:bg-kampmax-navy-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kampmax-navy disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {busy ? "Settling…" : confirmLabel}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function RulingOption({
  value,
  checked,
  onSelect,
  title,
  detail,
}: {
  value: EngagementDisputeOutcome;
  checked: boolean;
  onSelect: (v: EngagementDisputeOutcome) => void;
  title: string;
  detail: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors",
        checked ? "border-kampmax-blue bg-kampmax-blue/5" : "border-kampmax-border hover:bg-kampmax-muted/40"
      )}
    >
      <input
        type="radio"
        name="ruling"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="mt-0.5 h-4 w-4 accent-kampmax-blue"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-kampmax-text">{title}</span>
        <span className="mt-0.5 block text-xs text-kampmax-text-secondary">{detail}</span>
      </span>
    </label>
  );
}

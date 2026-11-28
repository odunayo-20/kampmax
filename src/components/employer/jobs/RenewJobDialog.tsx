"use client";

import { useState } from "react";
import Link from "next/link";
import type { Opportunity } from "@/types/opportunity";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useRenewJob } from "@/hooks/use-jobs";
import {
  usePostingBillingSummary,
  usePostingPricing,
  useRenewalQuote,
} from "@/hooks/use-posting-billing";
import { getRefusalMessage } from "@/lib/error-messages";
import { formatNaira } from "@/lib/utils";

/** True once a deadline given as YYYY-MM-DD (or a full date) is behind us. */
export function deadlinePassed(deadline: string, now = Date.now()): boolean {
  if (!deadline) return false;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(deadline)
    ? new Date(`${deadline}T23:59:59`)
    : new Date(deadline);
  return !Number.isNaN(d.getTime()) && d.getTime() <= now;
}

/** How long a renewed posting takes applications when its old deadline has passed. The mobile app offers the same. */
export const RENEW_DEADLINE_CHOICES = [
  { days: 7, label: "1 week" },
  { days: 14, label: "2 weeks" },
  { days: 30, label: "1 month" },
  { days: 60, label: "2 months" },
] as const;

/** The new deadline, `days` from now, as the timestamp the backend expects. */
export const renewDeadline = (days: number, now = Date.now()): string => new Date(now + days * 86_400_000).toISOString();

/**
 * Confirms putting an expired vacancy or internship live again. Shows the
 * renewal fee the backend quotes (a discount on the posting fee) and asks for a
 * new deadline when the old one has passed, which the backend requires.
 */
export function RenewJobDialog({
  job,
  open,
  onClose,
}: {
  job: Opportunity;
  open: boolean;
  onClose: () => void;
}) {
  const quoteQuery = useRenewalQuote(job.id, open);
  const summary = usePostingBillingSummary();
  const pricing = usePostingPricing();
  const renewMutation = useRenewJob();
  const closed = pricing.data?.hiringEnabled === false;
  const [days, setDays] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);

  const quote = quoteQuery.data;
  const needsDeadline = deadlinePassed(job.deadline);
  const available = summary.data?.wallet.availableBalance;
  const short =
    quote && quote.amountDue > 0 && available !== undefined && available < quote.amountDue
      ? quote.amountDue - available
      : 0;

  const close = () => {
    setError(null);
    onClose();
  };

  const renew = () => {
    setError(null);
    renewMutation.mutate(
      {
        id: job.id,
        applicationDeadline: needsDeadline ? renewDeadline(days) : undefined,
      },
      { onSuccess: close, onError: (err) => setError(getRefusalMessage(err)) }
    );
  };

  return (
    <ConfirmDialog
      open={open}
      title="Renew this job?"
      body="Renewing puts it back on the marketplace for another live period."
      confirmLabel={quote && quote.amountDue > 0 ? `Pay ${formatNaira(quote.amountDue)} & renew` : "Renew"}
      pending={renewMutation.isPending}
      confirmDisabled={closed || !quote || short > 0}
      onConfirm={renew}
      onCancel={close}
    >
      <div className="mt-3 space-y-3 text-sm text-kampmax-text-secondary" aria-live="polite">
        {closed && (
          <p role="alert" className="rounded-lg bg-warning-50 p-3 text-warning-700">
            Vacancies and internships are not open for posting yet, so this cannot be renewed right
            now.
          </p>
        )}
        {quoteQuery.isPending && <p>Loading…</p>}
        {quoteQuery.isError && (
          <p role="alert" className="text-error-600">
            We couldn’t check the cost. Check your connection, then close this and try again.
          </p>
        )}
        {quote && (
          <p>
            {quote.amountDue > 0
              ? `${formatNaira(quote.amountDue)} will be taken from your wallet.`
              : "Renewing is free right now."}{" "}
            It stays live for {quote.liveDays} days.
          </p>
        )}
        {needsDeadline && (
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-neutral-700">Take applications for</legend>
            <p className="mb-2 text-xs text-neutral-500">The old deadline has passed, so pick a new one.</p>
            <div className="flex flex-wrap gap-2">
              {RENEW_DEADLINE_CHOICES.map((c) => (
                <button
                  key={c.days}
                  type="button"
                  aria-pressed={days === c.days}
                  onClick={() => setDays(c.days)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${days === c.days ? "border-primary-600 bg-primary-50 text-primary-700" : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {short > 0 && (
          <p role="alert" className="rounded-lg bg-warning-50 p-3 text-warning-700">
            Your wallet is {formatNaira(short)} short.{" "}
            <Link href="/employer/billing" className="font-semibold underline">
              Top up your wallet
            </Link>{" "}
            and come back.
          </p>
        )}
        {error && (
          <p role="alert" className="text-error-600">
            {error}
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}

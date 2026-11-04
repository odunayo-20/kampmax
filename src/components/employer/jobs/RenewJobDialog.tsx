"use client";

import { useState } from "react";
import Link from "next/link";
import type { Opportunity } from "@/types/opportunity";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui";
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
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);

  const quote = quoteQuery.data;
  const needsDeadline = deadlinePassed(job.deadline);
  const available = summary.data?.wallet.availableBalance;
  const short =
    quote && quote.amountDue > 0 && available !== undefined && available < quote.amountDue
      ? quote.amountDue - available
      : 0;
  const deadlineMissing = needsDeadline && !deadline;

  const close = () => {
    setError(null);
    onClose();
  };

  const renew = () => {
    setError(null);
    renewMutation.mutate(
      {
        id: job.id,
        applicationDeadline: needsDeadline ? new Date(`${deadline}T23:59:59`).toISOString() : undefined,
      },
      { onSuccess: close, onError: (err) => setError(getRefusalMessage(err)) }
    );
  };

  return (
    <ConfirmDialog
      open={open}
      title="Renew this posting?"
      body="Renewing puts it back on the marketplace for another live period."
      confirmLabel={quote && quote.amountDue > 0 ? `Pay ${formatNaira(quote.amountDue)} & renew` : "Renew"}
      pending={renewMutation.isPending}
      confirmDisabled={closed || !quote || deadlineMissing || short > 0}
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
            We could not check the cost. Close this and try again.
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
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="renew-deadline">
              New application deadline
            </label>
            <Input
              id="renew-deadline"
              type="date"
              min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
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

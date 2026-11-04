"use client";

import { useState } from "react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { usePublishJob } from "@/hooks/use-jobs";
import { usePostingPricing, usePublishQuote } from "@/hooks/use-posting-billing";
import { getRefusalMessage } from "@/lib/error-messages";
import { formatNaira } from "@/lib/utils";
import type { PostingQuote } from "@/services/jobs";

/** What the quote means for the employer, in the words the dialog shows. */
export function quoteLines(quote: PostingQuote): string[] {
  const lines: string[] = [];
  if (quote.chargeKind === "FREE_ALLOWANCE") {
    const after = Math.max(0, quote.freeAllowance.remaining - 1);
    lines.push(
      `This uses 1 of your free postings. You will have ${after} free ${after === 1 ? "posting" : "postings"} left after it.`
    );
  } else if (quote.chargeKind === "PAID") {
    lines.push(
      `${formatNaira(quote.amountDue)} will be taken from your wallet. You have ${formatNaira(quote.wallet.availableBalance)} available.`
    );
  } else {
    lines.push("There is nothing to pay to publish this right now.");
  }
  lines.push(`It stays live for ${quote.liveDays} days. After that you can renew it.`);
  return lines;
}

/**
 * Confirms publishing a draft. For a vacancy or internship it first asks the
 * backend what this publish costs (a free posting, or a wallet fee) and shows
 * that, so nothing is ever charged without the employer seeing the amount. The
 * backend re-prices and checks the wallet and verification when it publishes;
 * this only shows what it said a moment ago.
 */
export function PublishJobDialog({
  jobId,
  open,
  onClose,
  onPublished,
}: {
  jobId: string;
  open: boolean;
  onClose: () => void;
  onPublished?: () => void;
}) {
  const quoteQuery = usePublishQuote(jobId, open);
  const pricing = usePostingPricing();
  const publishMutation = usePublishJob();
  const [error, setError] = useState<string | null>(null);
  const quote = quoteQuery.data;
  // Vacancies and internships can be drafted before they can be published.
  const closed = pricing.data?.hiringEnabled === false;

  const blocked =
    closed ||
    !quote ||
    quote.needsVerification ||
    (quote.chargeKind === "PAID" && !quote.wallet.canAfford);

  const close = () => {
    setError(null);
    onClose();
  };

  const publish = () => {
    setError(null);
    publishMutation.mutate(jobId, {
      onSuccess: () => {
        onClose();
        onPublished?.();
      },
      // A refusal such as "top up and try again" is written for the employer.
      onError: (err) => setError(getRefusalMessage(err)),
    });
  };

  const shortfall =
    quote && quote.chargeKind === "PAID" && !quote.wallet.canAfford
      ? quote.amountDue - quote.wallet.availableBalance
      : 0;

  return (
    <ConfirmDialog
      open={open}
      title="Publish this posting?"
      body={
        quote
          ? "Check the cost below. Nothing is charged until you confirm."
          : "Checking what this costs…"
      }
      confirmLabel={quote?.chargeKind === "PAID" ? `Pay ${formatNaira(quote.amountDue)} & publish` : "Publish"}
      pending={publishMutation.isPending}
      confirmDisabled={blocked}
      onConfirm={publish}
      onCancel={close}
    >
      <div className="mt-3 space-y-2 text-sm text-kampmax-text-secondary" aria-live="polite">
        {quoteQuery.isPending && <p>Loading…</p>}
        {quoteQuery.isError && (
          <p role="alert" className="text-error-600">
            We could not check the cost. Close this and try again.
          </p>
        )}
        {closed && (
          <p role="alert" className="rounded-lg bg-warning-50 p-3 text-warning-700">
            Vacancies and internships are not open for posting yet. Your draft is saved, so you can
            publish it once they open.
          </p>
        )}
        {quote?.needsVerification && (
          <p role="alert" className="rounded-lg bg-warning-50 p-3 text-warning-700">
            Verify your employer profile before publishing a vacancy or internship.{" "}
            <Link href="/employer/profile" className="font-semibold underline">
              Go to your profile
            </Link>
          </p>
        )}
        {quote &&
          !closed &&
          !quote.needsVerification &&
          quoteLines(quote).map((line) => <p key={line}>{line}</p>)}
        {shortfall > 0 && (
          <p role="alert" className="rounded-lg bg-warning-50 p-3 text-warning-700">
            Your wallet is {formatNaira(shortfall)} short.{" "}
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

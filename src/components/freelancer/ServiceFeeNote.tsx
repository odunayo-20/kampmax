"use client";

import { useFeeTerms } from "@/hooks/use-fee-terms";
import { describeFeeTerms, describeNet } from "@/lib/service-fee";

/**
 * Under a price the freelancer is about to set: what they will receive after
 * Kampmax's service fee, and how the fee works. Renders nothing while the
 * platform charges no fee, or until there is a price to work from.
 */
export function ServiceFeeNote({
  amount,
  per,
  className = "",
}: {
  amount: number | undefined;
  /** What the amount is for when it is not the whole price, e.g. "a full week". */
  per?: string;
  className?: string;
}) {
  const terms = useFeeTerms();
  const net = describeNet(amount, terms);
  const rules = describeFeeTerms(terms);
  if (!net || !rules) return null;
  return (
    <p className={`text-xs text-neutral-500 ${className}`} data-testid="service-fee-note">
      {per ? `For ${per}, you'll receive ` : "You'll receive "}
      <span className="font-semibold text-neutral-800">{net}</span>. {rules}
    </p>
  );
}

import { describeFeeTerms, describeReceived } from "@/lib/service-fee";
import type { Engagement } from "@/services/jobs";

/**
 * The freelancer's side of a contract's service fee: how it works on THIS
 * contract (the terms were fixed when it was made), and, for a contract that
 * is a single payment, what that payment came to once it was paid. Contracts
 * with several payments show each one's result in the milestone list instead.
 * Renders nothing for a contract made before fees, or while none is charged.
 */
export function ContractFeeNote({ engagement }: { engagement: Pick<Engagement, "feeRate" | "feeMinimum" | "milestones"> }) {
  const { feeRate, feeMinimum, milestones } = engagement;
  const terms = describeFeeTerms({ rate: feeRate ?? 0, minimum: feeMinimum ?? 0 });
  if (!terms) return null;

  const only = milestones.length === 1 ? milestones[0] : undefined;
  const received =
    only && only.status === "COMPLETED" ? describeReceived(only.billedAmount ?? only.amount, only.feeAmount) : null;

  return (
    <p className="mt-3 text-[11px] leading-relaxed text-kampmax-text-secondary" data-testid="contract-fee-note">
      {terms}
      {received && <span className="font-medium text-kampmax-text"> {received}.</span>}
    </p>
  );
}

"use client";

import Link from "next/link";
import type { Engagement } from "@/services/jobs";
import { MoneyTimeline } from "./MoneyTimeline";
import { contractMoneyTimeline } from "./money-steps";

/**
 * A contract's money story, collapsed under one line so lists of contracts stay
 * scannable. The summary line is the headline ("Your money is held safely in
 * escrow..."), so even closed it answers the question people are anxious about.
 * Also the one "get help" path: contracts open disputes from their action
 * buttons, and everything else goes to support.
 */
export function ContractMoneyPanel({
  engagement,
  party,
}: {
  engagement: Pick<
    Engagement,
    "id" | "status" | "agreedAmount" | "paymentType" | "feeRate" | "autoReleaseAt" | "milestones" | "currentMilestonePosition"
  >;
  party: "employer" | "freelancer";
}) {
  const model = contractMoneyTimeline(engagement, party);
  const canDispute = ["IN_PROGRESS", "SUBMITTED", "REVISION_REQUESTED"].includes(engagement.status);
  return (
    <details className="group mt-3 rounded-lg border border-kampmax-border" data-testid="contract-money-panel">
      <summary className="cursor-pointer list-none rounded-lg px-3 py-2 text-xs font-semibold text-kampmax-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600">
        <span className="text-primary-600">Where is the money?</span>{" "}
        <span className="font-medium text-kampmax-text-secondary">{model.headline}</span>
      </summary>
      <div className="space-y-3 border-t border-kampmax-border p-3">
        <MoneyTimeline model={model} title="Money, step by step" className="border-0 p-0 sm:p-0" />
        <p className="text-[11px] text-kampmax-text-secondary">
          Need help?{" "}
          <Link
            href={`/support/new?subject=${encodeURIComponent(`Contract ${engagement.id}`)}&category=payments`}
            className="font-semibold text-primary-600 hover:underline"
          >
            Ask Kampmax support
          </Link>
          .{" "}
          {canDispute
            ? 'If the other side isn\'t keeping to the agreement, use "Open dispute" above. The money stays in escrow while we review.'
            : null}
        </p>
      </div>
    </details>
  );
}

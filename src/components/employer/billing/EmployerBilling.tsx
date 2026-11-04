"use client";

import { useState } from "react";
import Link from "next/link";
import { Gift, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui";
import { OPPORTUNITY_TYPE_META } from "@/config/opportunity";
import { usePostingCharges, usePostingPricing } from "@/hooks/use-posting-billing";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { formatDate, formatNaira } from "@/lib/utils";
import type { PostingCharge, PostingPricing } from "@/services/jobs";
import { JobsPagination } from "@/components/jobs/JobsPagination";
import { EmployerWalletCard } from "@/components/employer/dashboard/EmployerWalletCard";
import {
  EmployerDashboardEmpty,
  EmployerDashboardError,
  EmployerDashboardSection,
  EmployerDashboardSkeleton,
} from "@/components/employer/dashboard/EmployerDashboardSection";
import { anyPostingFeeSet } from "./FreePostingsNotice";

const KIND_LABEL: Record<PostingCharge["kind"], string> = {
  FREE_ALLOWANCE: "Free posting",
  PAID: "Posting fee",
  RENEWAL: "Renewal",
};

function FreePostingsCard({ pricing }: { pricing: PostingPricing }) {
  const { total, used, remaining } = pricing.freeAllowance;
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 100;
  return (
    <EmployerDashboardSection title="Free postings">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-50 text-success-700">
          <Gift className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-kampmax-text">
            {remaining} of {total} free {total === 1 ? "posting" : "postings"} left
          </p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-kampmax-bg"
            role="progressbar"
            aria-label="Free postings used"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={used}
          >
            <div className="h-full rounded-full bg-success-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-kampmax-text-secondary">
            A free posting is used first when you publish a vacancy or internship, and one is given
            back if a posting is rejected. Gigs never use one.
          </p>
        </div>
      </div>
    </EmployerDashboardSection>
  );
}

function PriceList({ pricing }: { pricing: PostingPricing }) {
  const rows: { label: string; fee: number; note?: string }[] = [
    { label: "Internship", fee: pricing.internshipFee },
    { label: "Unpaid internship", fee: pricing.unpaidInternshipFee, note: "discounted" },
    { label: "Part-time", fee: pricing.partTimeFee },
    { label: "Full-time", fee: pricing.fullTimeFee },
    { label: "Contract", fee: pricing.contractFee },
  ];
  return (
    <EmployerDashboardSection title="What posting costs">
      {pricing.hiringEnabled === false && (
        <p className="mb-3 rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700">
          Vacancies and internships are not open for posting yet. You can save drafts now and
          publish them once they open.
        </p>
      )}
      {anyPostingFeeSet(pricing) ? (
        <>
          <dl className="divide-y divide-kampmax-border/70">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 text-sm">
                <dt className="text-kampmax-text-secondary">
                  {row.label}
                  {row.note && <span className="ml-1.5 text-xs text-kampmax-text-secondary">({row.note})</span>}
                </dt>
                <dd className="font-medium text-kampmax-text">
                  {row.fee > 0 ? formatNaira(row.fee) : "Free"}
                </dd>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 text-sm">
              <dt className="text-kampmax-text-secondary">Gig</dt>
              <dd className="font-medium text-kampmax-text">Free</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-kampmax-text-secondary">
            Each posting stays live for {pricing.liveDays} days. Renewing an expired posting costs{" "}
            {100 - pricing.renewalDiscountPercent}% of its fee.
          </p>
        </>
      ) : (
        <p className="text-sm text-kampmax-text-secondary">
          Posting is free for now. If that changes you will see the prices here, and always before
          anything is charged.
        </p>
      )}
    </EmployerDashboardSection>
  );
}

function ChargeRow({ charge }: { charge: PostingCharge }) {
  const refunded = charge.status === "REFUNDED";
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-kampmax-text">
          {charge.jobTitle ?? "Removed posting"}
        </p>
        <p className="mt-0.5 text-xs text-kampmax-text-secondary">
          {KIND_LABEL[charge.kind]}
          {charge.opportunityType && ` · ${OPPORTUNITY_TYPE_META[mapType(charge.opportunityType)].label}`}
          {" · "}
          {formatDate(charge.createdAt)}
        </p>
        {refunded && charge.refundReason && (
          <p className="mt-0.5 text-xs text-kampmax-text-secondary">Reason: {charge.refundReason}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {refunded && <Badge variant="warning">{charge.amount > 0 ? "Refunded" : "Restored"}</Badge>}
        <span className="text-sm font-semibold text-kampmax-text">
          {charge.amount > 0 ? formatNaira(charge.amount) : "Free"}
        </span>
      </div>
    </li>
  );
}

function mapType(type: NonNullable<PostingCharge["opportunityType"]>) {
  return type.toLowerCase() as keyof typeof OPPORTUNITY_TYPE_META;
}

function ChargeHistory() {
  const [page, setPage] = useState(1);
  const query = usePostingCharges(page);
  return (
    <EmployerDashboardSection title="Receipts">
      {query.isPending ? (
        <EmployerDashboardSkeleton rows={3} />
      ) : query.isError ? (
        <EmployerDashboardError message={getFriendlyErrorMessage(query.error)} onRetry={query.refetch} />
      ) : query.data.items.length === 0 ? (
        <EmployerDashboardEmpty
          title="Nothing here yet"
          detail="When you publish a vacancy or internship, the free posting or fee shows up here."
        />
      ) : (
        <>
          <ul className="divide-y divide-kampmax-border/70">
            {query.data.items.map((charge) => (
              <ChargeRow key={charge.id} charge={charge} />
            ))}
          </ul>
          <JobsPagination
            page={query.data.page}
            totalPages={query.data.totalPages}
            total={query.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </EmployerDashboardSection>
  );
}

/** Billing & Credits: free postings left, the wallet, the price list and the receipts. */
export function EmployerBilling() {
  const pricing = usePostingPricing();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-kampmax-text">Billing &amp; Credits</h1>
        <p className="mt-0.5 text-sm text-kampmax-text-secondary">
          What posting a vacancy or internship costs, your free postings and your wallet.
        </p>
      </div>

      {pricing.isPending ? (
        <div className="rounded-xl border border-kampmax-border bg-white p-5">
          <EmployerDashboardSkeleton rows={3} />
        </div>
      ) : pricing.isError ? (
        <div className="rounded-xl border border-kampmax-border bg-white p-5">
          <EmployerDashboardError message={getFriendlyErrorMessage(pricing.error)} onRetry={pricing.refetch} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <FreePostingsCard pricing={pricing.data} />
          <PriceList pricing={pricing.data} />
        </div>
      )}

      <EmployerWalletCard />

      <ChargeHistory />

      <p className="flex items-center gap-1.5 text-xs text-kampmax-text-secondary">
        <ReceiptText className="h-3.5 w-3.5" aria-hidden />
        Fees are taken from your wallet when you publish.{" "}
        <Link href="/employer/jobs" className="font-medium text-primary-600 hover:underline">
          Back to My Jobs
        </Link>
      </p>
    </div>
  );
}

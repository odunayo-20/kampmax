"use client";

import Link from "next/link";
import { Gift } from "lucide-react";
import { usePostingPricing } from "@/hooks/use-posting-billing";
import type { PostingPricing } from "@/services/jobs";

/** True once an admin has set a price on any paid type; until then nothing is charged. */
export function anyPostingFeeSet(pricing: PostingPricing): boolean {
  return (
    pricing.internshipFee > 0 ||
    pricing.partTimeFee > 0 ||
    pricing.fullTimeFee > 0 ||
    pricing.contractFee > 0
  );
}

/**
 * Tells a new employer, on the dashboard, that they have free postings to use
 * on a vacancy or internship. Hidden when none are left, and while posting is
 * free for everyone (no price set), so it never promises a saving that is not
 * there.
 */
export function FreePostingsNotice() {
  const pricing = usePostingPricing();
  const data = pricing.data;
  // Nothing to advertise while posting is free, used up, or not open yet.
  if (
    !data ||
    data.hiringEnabled === false ||
    !anyPostingFeeSet(data) ||
    data.freeAllowance.remaining <= 0
  )
    return null;

  const left = data.freeAllowance.remaining;
  return (
    <section
      aria-label="Free postings"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success-200 bg-success-50 px-4 py-3 sm:px-5"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-success-700">
          <Gift className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-success-800">
            You have {left} free {left === 1 ? "posting" : "postings"}.
          </p>
          <p className="mt-0.5 text-xs text-success-700">
            Use {left === 1 ? "it" : "them"} to post a vacancy or internship. Gigs are always free.
          </p>
        </div>
      </div>
      <Link
        href="/employer/jobs/create"
        className="inline-flex h-8 items-center rounded-md bg-success-600 px-3 text-xs font-semibold text-white hover:bg-success-700"
      >
        Post an opportunity
      </Link>
    </section>
  );
}

"use client";

import Link from "next/link";
import { ShieldAlert, Clock, CheckCircle2, XCircle, ArrowRight, ShieldCheck } from "lucide-react";
import type { KycStatus } from "@/types/verification";

interface VerificationStatusBannerProps {
  status: KycStatus;
  role: "vendor" | "freelancer";
  verificationHref: string;
  className?: string;
}

export function VerificationStatusBanner({
  status,
  role,
  verificationHref,
  className = "",
}: VerificationStatusBannerProps) {
  if (status === "verified") {
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-emerald-900 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-950">
              Verified {role === "vendor" ? "Vendor Account" : "Freelancer Pro"}
            </p>
            <p className="text-xs text-emerald-700">
              Your verification is complete. All privileges are active.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200/70 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5" /> Active
        </span>
      </div>
    );
  }

  if (status === "pending_review") {
    return (
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-amber-900 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-950">
              Verification in Progress
            </p>
            <p className="text-xs text-amber-700">
              Our team is reviewing your verification. You&apos;ll be notified as soon as there&apos;s a decision.
            </p>
          </div>
        </div>
        <Link
          href={verificationHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-950 underline self-start sm:self-auto shrink-0"
        >
          Check status <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-950">
              Verification Needs Attention
            </p>
            <p className="text-xs text-red-700">
              Your previous submission could not be verified. Please review the feedback and update your documents.
            </p>
          </div>
        </div>
        <Link
          href={verificationHref}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 shrink-0"
        >
          Resubmit Verification <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  if (status === "suspended") {
    return (
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-950">Account Suspended</p>
            <p className="text-xs text-red-700">
              This account has been suspended by Kampmax. Contact support to find out why and how to resolve it.
            </p>
          </div>
        </div>
        <Link
          href="/support"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 shrink-0"
        >
          Contact support <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  // Unverified (Default state)
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-kampmax-blue/30 bg-blue-50/90 px-4 py-3.5 text-blue-950 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-kampmax-blue/15 text-kampmax-blue">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-kampmax-navy">
              Account Verification Required
            </p>
          </div>
          <p className="text-xs text-kampmax-text-secondary mt-0.5">
            {role === "vendor"
              ? "Upload your verification documents so Kampmax can verify your store."
              : "Ask for a review of your freelancer profile to earn the verified badge."}
          </p>
        </div>
      </div>
      <Link
        href={verificationHref}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-kampmax-blue px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-kampmax-blue/90 transition-colors shrink-0"
      >
        Start verification <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

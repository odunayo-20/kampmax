"use client";

import Link from "next/link";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui";
import type { EmployerVerificationStatus } from "@/types/employer";

type Variant = "success" | "warning" | "info" | "error" | "default";

/**
 * What each verification state means for the employer, in the mobile app's words (lib/employer-portal
 * EMPLOYER_VERIFICATION_VIEW). Only Kampmax sets it, so "ask" says when to point them at support.
 */
export const EMPLOYER_VERIFICATION_VIEW: Record<EmployerVerificationStatus, { label: string; variant: Variant; text: string; ask: boolean }> = {
  verified: { label: "Verified", variant: "success", text: "Freelancers and applicants see the verified badge on your jobs.", ask: false },
  pending: { label: "Under review", variant: "info", text: "Kampmax is checking your details. You can keep posting gigs meanwhile.", ask: false },
  rejected: { label: "Needs changes", variant: "warning", text: "Your details were not approved. Update your profile, then contact support to be looked at again.", ask: true },
  action_required: { label: "Needs changes", variant: "warning", text: "Your details were not approved. Update your profile, then contact support to be looked at again.", ask: true },
  not_started: { label: "Not verified", variant: "default", text: "Gigs are open to everyone. Vacancies and internships need a verified employer.", ask: true },
};

/** The verification badge with what it means and, until verified, a link to ask Kampmax support. */
export function EmployerVerificationNotice({ status }: { status: EmployerVerificationStatus }) {
  const view = EMPLOYER_VERIFICATION_VIEW[status] ?? EMPLOYER_VERIFICATION_VIEW.not_started;
  const Icon = status === "verified" ? ShieldCheck : ShieldAlert;
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-kampmax-border bg-white px-3 py-2.5 text-sm">
      <Badge variant={view.variant}>
        <Icon className="mr-1 h-3.5 w-3.5" aria-hidden />
        {view.label}
      </Badge>
      <span className="min-w-0 flex-1 text-kampmax-text-secondary">{view.text}</span>
      {view.ask && (
        <Link href="/support" className="text-xs font-semibold text-primary-600 underline-offset-2 hover:underline">
          {status === "not_started" ? "Contact support to get verified" : "Contact support"}
        </Link>
      )}
    </div>
  );
}

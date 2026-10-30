"use client";

import Link from "next/link";
import { CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { FreelancerStatusBadge } from "./FreelancerStatusBadge";
import type { FreelancerProfileStatus } from "@/types/freelancer-dashboard";

/**
 * Profile status card. Renders the backend-computed completion percentage and
 * missing sections (each linking back to the relevant onboarding step). The
 * approval/verification state is never changed here — it's authoritative.
 */
export function FreelancerProfileStatusCard({ profileStatus }: { profileStatus: FreelancerProfileStatus }) {
  const { completionPercentage, missing, verification, isPublic, status } = profileStatus;
  const complete = missing.length === 0;

  return (
    <section
      aria-label="Profile status"
      className="rounded-xl border border-kampmax-border bg-white p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-kampmax-text">Profile status</h2>
        <FreelancerStatusBadge status={status} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-kampmax-text-secondary">Profile completeness</span>
          <span className="font-semibold text-kampmax-text">{completionPercentage}%</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              completionPercentage >= 100 ? "bg-success-500" : "bg-primary-600"
            )}
            style={{ width: `${Math.min(100, completionPercentage)}%` }}
          />
        </div>
      </div>

      {/* Verification (user-facing only) */}
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2">
        {verification === "verified" ? (
          <ShieldCheck className="h-4 w-4 text-success-600" aria-hidden />
        ) : (
          <ShieldAlert className="h-4 w-4 text-warning-600" aria-hidden />
        )}
        <span className="text-xs text-kampmax-text-secondary">
          {verification === "verified"
            ? "Identity verified"
            : verification === "pending"
            ? "Verification pending"
            : verification === "rejected"
            ? "Verification not approved"
            : "Verification not required yet"}
        </span>
      </div>

      {isPublic ? (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-success-700">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Your profile is open to clients.
        </p>
      ) : (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-kampmax-text-muted">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {complete ? "Pending approval to go public." : "Complete the missing sections to go live."}
        </p>
      )}

      {missing.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-kampmax-border pt-3">
          {missing.map((m) => (
            <li key={m.key}>
              <Link
                href={m.href}
                className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs text-kampmax-text-secondary hover:bg-neutral-50"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-kampmax-text">{m.label}</span>
                  <span className="block truncate text-[11px] text-kampmax-text-muted">
                    {m.description}
                  </span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary-600 group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

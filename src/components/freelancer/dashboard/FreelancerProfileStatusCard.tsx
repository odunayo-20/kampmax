"use client";

import Link from "next/link";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { NextStepCard } from "@/components/ui/NextStepCard";
import { VERIFICATION_VIEW } from "@/lib/freelancer-hub";
import type { FreelancerProfileStatus } from "@/types/freelancer-dashboard";

/**
 * Where the profile stands, in the mobile hub's words: verification as Kampmax has it (only Kampmax changes it),
 * whether clients can find the profile, and the one step to do next.
 */
export function FreelancerProfileStatusCard({ profileStatus }: { profileStatus: FreelancerProfileStatus }) {
  const { verification, isPublic, nextStep } = profileStatus;
  const view = VERIFICATION_VIEW[verification];
  const Icon = verification === "verified" ? ShieldCheck : ShieldAlert;

  return (
    <div className="space-y-4">
      <section aria-label="Profile status" className="rounded-xl border border-kampmax-border bg-white p-5">
        <div className="flex items-start gap-3">
          <Icon className={verification === "verified" ? "mt-0.5 h-5 w-5 text-success-600" : "mt-0.5 h-5 w-5 text-kampmax-text-secondary"} aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-kampmax-text">{view.title}</h2>
            <p className="mt-0.5 text-xs text-kampmax-text-secondary">{view.text}</p>
            {verification !== "verified" && verification !== "pending" && (
              <Link href="/freelancer/verification" className="mt-2 inline-block text-xs font-semibold text-primary-600 hover:underline">
                {verification === "rejected" ? "See why" : "Get verified"}
              </Link>
            )}
          </div>
        </div>
        <p className="mt-4 border-t border-kampmax-border pt-3 text-xs text-kampmax-text-secondary">
          {isPublic ? "Your profile is open to clients." : "Your profile is hidden from clients. Turn it on in your profile settings."}
        </p>
      </section>
      <NextStepCard step={nextStep} href={nextStep?.href ?? "/freelancer/profile"} kicker="Win more work" />
    </div>
  );
}

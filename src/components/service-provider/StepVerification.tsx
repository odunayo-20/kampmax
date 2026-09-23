"use client";

import { BadgeCheck, FileText, Shield, ArrowRight } from "lucide-react";
import type { ServiceProviderOnboardingDraft } from "@/types/service-provider";

interface StepVerificationProps {
  draft: ServiceProviderOnboardingDraft | null;
  onUpdate: (data: Partial<ServiceProviderOnboardingDraft>) => void;
  onSubmitVerification: (type: string) => void;
}

const VERIFICATION_TYPES = [
  {
    label: "Identity Verification",
    description: "Government-issued ID (NIN, Driver's License, Passport).",
    icon: BadgeCheck,
  },
  {
    label: "Business Verification",
    description: "Business registration (CAC certificate), if operating as a business.",
    icon: FileText,
  },
  {
    label: "Professional Verification",
    description: "Professional licenses, certifications, or qualifications.",
    icon: Shield,
  },
] as const;

/**
 * Verification is NOT collected during onboarding — identity/business/
 * professional documents (NIN, BVN, CAC, certificates) are an optional,
 * profile-level flow available from the dashboard at
 * /service-provider/verification once the profile is activated. This step
 * exists only to set that expectation; it never blocks completing
 * onboarding (see STEP_VALIDATION[9] in the wizard page).
 */
export function StepVerification({}: StepVerificationProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">Verification</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          You can start taking bookings right away. Verifying your identity and business is
          optional and can be done anytime from your profile — it isn't required to finish
          setting up.
        </p>
      </div>

      <div className="space-y-3">
        {VERIFICATION_TYPES.map((type) => (
          <div
            key={type.label}
            className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
              <type.icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-kampmax-text">{type.label}</h4>
              <p className="mt-1 text-sm text-kampmax-text-secondary">{type.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50 p-4">
        <Shield className="h-5 w-5 shrink-0 text-primary-600 mt-0.5" aria-hidden />
        <div className="text-sm text-primary-900">
          <p className="font-medium">Available after you finish onboarding</p>
          <p className="mt-1 text-primary-800/80">
            Once your profile is active, head to Profile → Verification to submit these
            documents whenever you're ready. Verified providers get a trust badge and higher
            visibility — but it's your choice, and on your own timeline.
          </p>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-sm text-kampmax-text-secondary">
        Continue to finish setting up your profile <ArrowRight className="h-4 w-4" aria-hidden />
      </p>
    </div>
  );
}
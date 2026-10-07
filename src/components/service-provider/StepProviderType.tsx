"use client";

import { User, Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceProviderOnboardingDraft, ServiceProviderType } from "@/types/service-provider";

const PROVIDER_TYPES: { value: ServiceProviderType; label: string; description: string; icon: typeof User }[] = [
  {
    value: "individual",
    label: "Individual",
    description: "One person provides the service. Perfect for freelancers and solo professionals.",
    icon: User,
  },
  {
    value: "business",
    label: "Business",
    description: "A registered/local business provides the service. May require CAC registration.",
    icon: Building2,
  },
  {
    value: "team_agency",
    label: "Team / Agency",
    description: "Multiple people provide services under one provider profile. Good for agencies.",
    icon: Users,
  },
];

interface StepProviderTypeProps {
  draft: ServiceProviderOnboardingDraft | null;
  onUpdate: (data: Partial<ServiceProviderOnboardingDraft>) => void;
}

export function StepProviderType({ draft, onUpdate }: StepProviderTypeProps) {
  const selectedType = draft?.provider?.type ?? "individual";
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">How do you operate?</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          This helps us tailor the onboarding experience. You can update this later.
        </p>
      </div>

      <div className="grid gap-4" role="radiogroup" aria-label="Provider type">
        {PROVIDER_TYPES.map((type) => {
          const isSelected = selectedType === type.value;
          const Icon = type.icon;

          return (
            <button
              key={type.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onUpdate({ provider: { ...draft?.provider, type: type.value } })}
              className={cn(
                "relative flex flex-col p-6 rounded-xl border-2 transition-all duration-200",
                isSelected
                  ? "border-primary-600 bg-primary-50 ring-2 ring-primary-500/20"
                  : "border-neutral-200 bg-white hover:border-primary-300 hover:bg-primary-50",
                "cursor-pointer"
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    isSelected ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-500"
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn("font-semibold text-kampmax-text", isSelected && "text-primary-700")}>
                    {type.label}
                  </h3>
                  <p className="mt-1 text-sm text-kampmax-text-secondary">{type.description}</p>
                </div>
                {isSelected && (
                  <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-white">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg bg-info-50 border border-info-200 p-4">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-info-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-info-800">
            <p className="font-medium">No documents needed to get started</p>
            <p className="mt-1">You can set up your profile and start taking bookings first. Verification is handled later from your dashboard.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";

import { ChevronRight, Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SP_ONBOARDING_STEP_LABELS, SP_ONBOARDING_STEP_DESCRIPTIONS, ServiceProviderOnboardingStepId, BLOCKING_SP_ONBOARDING_STATUSES, isSpBlockingStatus } from "@/types/service-provider";
import type { ServiceProviderOnboardingStatus } from "@/types/service-provider";

interface OnboardingProgressProps {
  currentStep: ServiceProviderOnboardingStepId;
  status?: ServiceProviderOnboardingStatus | null;
  completedSteps?: ServiceProviderOnboardingStepId[];
  className?: string;
}

const STEP_GROUPS = [
  { label: "Profile", steps: [1, 2] as ServiceProviderOnboardingStepId[] },
  { label: "Services", steps: [3, 4] as ServiceProviderOnboardingStepId[] },
  { label: "Location & Availability", steps: [5, 6] as ServiceProviderOnboardingStepId[] },
  { label: "Pricing & Portfolio", steps: [7, 8] as ServiceProviderOnboardingStepId[] },
  { label: "Review", steps: [9] as ServiceProviderOnboardingStepId[] },
];

export function OnboardingProgress({
  currentStep,
  status,
  completedSteps = [],
  className,
}: OnboardingProgressProps) {
  const isBlocking = isSpBlockingStatus(status);

  if (isBlocking) {
    return (
      <div className={cn("rounded-xl bg-neutral-50 p-6 border border-neutral-200", className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
            <Loader2 className="h-5 w-5 text-primary-600 animate-spin" />
          </div>
          <div>
            <h3 className="font-semibold text-kampmax-text">
              {status === "PENDING_REVIEW" && "Application Under Review"}
              {status === "APPROVED" && "Application Approved"}
              {status === "REJECTED" && "Application Rejected"}
              {status === "SUSPENDED" && "Application Suspended"}
            </h3>
            <p className="text-sm text-kampmax-text-secondary">
              {status === "PENDING_REVIEW" && "Kampmax is reviewing your application. You'll be notified once a decision is made."}
              {status === "APPROVED" && "Congratulations! Your service provider profile is live."}
              {status === "REJECTED" && "Your application was not approved. Check your email for details."}
              {status === "SUSPENDED" && "Your service provider profile has been suspended."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <nav className={cn("space-y-4", className)} aria-label="Onboarding progress">
      {STEP_GROUPS.map((group, groupIndex) => (
        <div key={group.label} className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 px-1">
            {group.label}
          </p>
          <div className="space-y-1.5">
            {group.steps.map((step, stepIndex) => {
              const isCompleted = completedSteps.includes(step);
              const isCurrent = step === currentStep;
              const isFuture = !isCompleted && !isCurrent;

              return (
                <button
                  key={step}
                  type="button"
                  disabled={isFuture}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-left",
                    isCurrent
                      ? "bg-primary-50 border border-primary-200 ring-1 ring-primary-500"
                      : isCompleted
                      ? "bg-success-50 border border-success-200"
                      : "bg-neutral-50 border border-neutral-200 text-neutral-400 hover:bg-neutral-100",
                    isFuture && "cursor-not-allowed opacity-50"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-disabled={isFuture}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      isCompleted
                        ? "bg-success-600 text-white"
                        : isCurrent
                        ? "bg-primary-600 text-white"
                        : "bg-neutral-200 text-neutral-400"
                    )}
                    aria-hidden="true"
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : <span>{step}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", isFuture && "text-neutral-400")}>
                      {SP_ONBOARDING_STEP_LABELS[step]}
                    </p>
                    <p className={cn("text-[11px] truncate", isFuture && "text-neutral-400")}>
                      {SP_ONBOARDING_STEP_DESCRIPTIONS[step]}
                    </p>
                  </div>
                  {isCurrent && (
                    <ChevronRight className="h-5 w-5 text-primary-600 flex-shrink-0" aria-hidden="true" />
                  )}
                  {isCompleted && !isCurrent && (
                    <Check className="h-5 w-5 text-success-600 flex-shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

// Compact step indicator for top of page
export function OnboardingStepIndicator({
  currentStep,
  completedSteps = [],
}: {
  currentStep: ServiceProviderOnboardingStepId;
  completedSteps?: ServiceProviderOnboardingStepId[];
}) {
  const allSteps: ServiceProviderOnboardingStepId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="hidden md:flex items-center gap-1 overflow-x-auto pb-2 px-2 -mx-2" role="navigation" aria-label="Onboarding steps">
      {allSteps.map((step, index) => {
        const isCompleted = completedSteps.includes(step);
        const isCurrent = step === currentStep;
        const isFuture = !isCompleted && !isCurrent;

        return (
          <div key={step} className="flex items-center flex-shrink-0">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                isCompleted
                  ? "bg-success-600 text-white"
                  : isCurrent
                  ? "bg-primary-600 text-white"
                  : "bg-neutral-200 text-neutral-400"
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : <span>{step}</span>}
            </div>
            {index < allSteps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-1.5 mx-1 rounded transition-colors max-w-[80px]",
                  isCompleted || isCurrent ? "bg-primary-600" : "bg-neutral-200"
                )}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
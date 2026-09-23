"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  EmployerOnboardingProgress,
  EmployerStepIndicator,
} from "./EmployerOnboardingProgress";
import type { EmployerOnboardingDraft, EmployerOnboardingStepId } from "@/types/employer";
import { EMPLOYER_ONBOARDING_STEPS } from "@/types/employer";

interface EmployerOnboardingLayoutProps {
  children: React.ReactNode;
  draft: EmployerOnboardingDraft | null;
  completedSteps?: EmployerOnboardingStepId[];
  onSaveDraft: () => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  onSubmit?: () => void;
  canSubmit?: boolean;
  isSaving?: boolean;
  isSubmitting?: boolean;
  nextDisabled?: boolean;
  showSaveDraft?: boolean;
}

export function EmployerOnboardingLayout({
  children,
  draft,
  completedSteps,
  onSaveDraft,
  onNext,
  onBack,
  onSubmit,
  canSubmit = false,
  isSaving = false,
  isSubmitting = false,
  nextDisabled = false,
  showSaveDraft = true,
}: EmployerOnboardingLayoutProps) {
  const router = useRouter();
  const currentStep = draft?.currentStep ?? 1;
  const status = draft?.status ?? "DRAFT";

  const stepList: EmployerOnboardingStepId[] =
    completedSteps && completedSteps.length > 0
      ? completedSteps
      : (() => {
          const seed: EmployerOnboardingStepId[] = [];
          for (let i = 1; i < currentStep; i++) seed.push(i as EmployerOnboardingStepId);
          return seed;
        })();

  return (
    <div className={cn("min-h-screen bg-kampmax-bg")}>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/account/profiles"
            className="inline-flex items-center gap-1.5 text-sm text-kampmax-text-secondary hover:text-kampmax-text mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Profiles
          </Link>

          <EmployerStepIndicator currentStep={currentStep} completedSteps={stepList} />

          <div className="mt-6">
            <h1 className="text-2xl font-bold text-kampmax-text">Become an Employer</h1>
            <p className="mt-1 text-sm text-kampmax-text-secondary">
              Step {currentStep} of {EMPLOYER_ONBOARDING_STEPS}
            </p>
          </div>
        </div>

        {/* Progress sidebar + Main content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Progress sidebar */}
          <aside className="lg:w-64 flex-shrink-0 hidden lg:block">
            <div className="sticky top-24">
              <EmployerOnboardingProgress
                currentStep={currentStep}
                status={status}
                completedSteps={stepList}
              />
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-kampmax-border p-6 sm:p-8">
              {children}
            </div>

            {/* Footer actions */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
              {showSaveDraft && (
                <Button
                  variant="outline"
                  onClick={onSaveDraft}
                  disabled={isSaving}
                  className="sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
              )}

              {currentStep === 1 ? (
                <Button variant="primary" size="lg" onClick={onNext} disabled={nextDisabled} className="w-full sm:w-auto">
                  Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : currentStep === 5 ? (
                <>
                  <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
                    <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={onSubmit}
                    disabled={isSubmitting || !canSubmit}
                    className="w-full sm:w-auto"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Profile"}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
                    <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={onNext}
                    disabled={nextDisabled}
                    className="w-full sm:w-auto"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

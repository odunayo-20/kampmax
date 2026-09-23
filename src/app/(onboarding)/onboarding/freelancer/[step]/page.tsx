"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { OnboardingLayout } from "@/components/freelancer/OnboardingLayout";
import { StepProfile } from "@/components/freelancer/StepProfile";
import { StepSkills } from "@/components/freelancer/StepSkills";
import { StepExperience } from "@/components/freelancer/StepExperience";
import { StepEducation } from "@/components/freelancer/StepEducation";
import { StepCertifications } from "@/components/freelancer/StepCertifications";
import { StepPortfolio } from "@/components/freelancer/StepPortfolio";
import { StepRates } from "@/components/freelancer/StepRates";
import { StepAvailability } from "@/components/freelancer/StepAvailability";
import { StepPreferences } from "@/components/freelancer/StepPreferences";
import { StepReview } from "@/components/freelancer/StepReview";
import {
  createFlApplication,
  createFlApplicationApi,
  freelancerDraftToCreateDto,
  getFlOnboardingDraft,
  getFlOnboardingStatus,
  saveFlDraft,
  submitFlApplication,
  computeFlCompletion,
} from "@/services/freelancer";
import {
  FREELANCER_ONBOARDING_STATUS,
  FREELANCER_ONBOARDING_STEPS,
  FREELANCER_ONBOARDING_STEP,
} from "@/types/freelancer";
import type {
  FreelancerOnboardingDraft,
  FreelancerOnboardingStepId,
} from "@/types/freelancer";

const DRAFT_STORAGE_KEY = "kampmax:fl:onboarding:draft";
const PROGRESS_STORAGE_KEY = "kampmax:fl:onboarding:progress";

function loadStoredDraft(): FreelancerOnboardingDraft | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FreelancerOnboardingDraft) : null;
  } catch {
    return null;
  }
}

function persistDraft(d: FreelancerOnboardingDraft | null) {
  if (!d) return;
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(d));
  } catch { /* noop */ }
}

function loadStoredProgress(): FreelancerOnboardingStepId[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as number[];
    return parsed.filter((n) => n >= 1 && n <= 10) as FreelancerOnboardingStepId[];
  } catch {
    return [];
  }
}

function persistProgress(steps: FreelancerOnboardingStepId[]) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(steps));
  } catch { /* noop */ }
}

function syncStoreWithDraft(next: FreelancerOnboardingDraft) {
  saveFlDraft({ ...next, currentStep: next.currentStep as FreelancerOnboardingStepId });
}

const STEP_COMPONENTS: Record<number, React.ComponentType<any>> = {
  1: StepProfile,
  2: StepSkills,
  3: StepExperience,
  4: StepEducation,
  5: StepCertifications,
  6: StepPortfolio,
  7: StepRates,
  8: StepAvailability,
  9: StepPreferences,
  10: StepReview,
};

const STEP_VALIDATION: Record<number, (draft: FreelancerOnboardingDraft | null) => boolean> = {
  1: (d) => !!d?.profile?.headline?.trim() && !!d?.profile?.bio?.trim(),
  2: (d) => (d?.categories?.length ?? 0) > 0 && (d?.skills?.length ?? 0) > 0,
  3: (d) => (d?.experience?.length ?? 0) > 0,
  4: (d) => true, // education is optional
  5: (d) => true, // certifications are optional
  6: (d) => true, // portfolio is optional
  7: (d) => true, // rates are optional
  8: (d) => !!d?.availability?.status,
  9: (d) => (d?.preferences?.workArrangements?.length ?? 0) > 0,
  10: (d) => true, // handled in review
};

const BLOCKING_STATUSES = ["PENDING_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"];

export default function FreelancerOnboardingStepPage() {
  const router = useRouter();
  const params = useParams();
  const stepParam = params.step as string;
  const currentStep = parseInt(stepParam, 10) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

  const [draft, setDraft] = useState<FreelancerOnboardingDraft | null>(null);
  const [completedSteps, setCompletedSteps] = useState<FreelancerOnboardingStepId[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDraft = async () => {
      setLoading(true);
      try {
        createFlApplication();
        const fresh = getFlOnboardingDraft();
        const saved = loadStoredDraft();

        if (saved && saved.userId === fresh?.userId) {
          if (BLOCKING_STATUSES.includes(saved.status)) {
            setDraft(saved);
          } else {
            syncStoreWithDraft(saved);
            setDraft(getFlOnboardingDraft() ?? saved);
            persistDraft(getFlOnboardingDraft() ?? saved);
          }
        } else {
          setDraft(fresh);
          persistDraft(fresh);
        }

        const savedProgress = loadStoredProgress();
        if (savedProgress.length > 0) {
          setCompletedSteps(savedProgress);
        } else {
          const seed: FreelancerOnboardingStepId[] = [];
          for (let i = 1; i < currentStep; i++) seed.push(i as FreelancerOnboardingStepId);
          setCompletedSteps(seed);
        }

        if (fresh && currentStep !== 1 && fresh.status === "DRAFT" && !saved) {
          router.push("/onboarding/freelancer/1");
          return;
        }
      } catch {
        setError("Failed to load application");
      } finally {
        setLoading(false);
      }
    };
    loadDraft();
  }, [router]);

  useEffect(() => {
    if (!loading && currentStep > FREELANCER_ONBOARDING_STEPS) {
      router.push(`/onboarding/freelancer/${FREELANCER_ONBOARDING_STEPS}`);
    }
  }, [loading, currentStep, router]);

  const markStepCompleted = (step: number) => {
    const next = Array.from(new Set([...completedSteps, step as FreelancerOnboardingStepId]));
    setCompletedSteps(next);
    persistProgress(next);
  };

  const handleSaveDraft = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      syncStoreWithDraft({ ...draft, currentStep: currentStep as FreelancerOnboardingStepId });
      const updated = getFlOnboardingDraft();
      setDraft(updated);
      persistDraft(updated);
    } catch {
      setError("Failed to save draft");
    } finally {
      setSaving(false);
    }
  }, [draft, currentStep]);

  const handleNext = useCallback(() => {
    if (!draft) return;
    const isValid = STEP_VALIDATION[currentStep]?.(draft) ?? false;
    if (!isValid) {
      setError("Please complete all required fields before continuing");
      return;
    }
    setError(null);
    const nextStep = Math.min(currentStep + 1, FREELANCER_ONBOARDING_STEPS) as FreelancerOnboardingStepId;
    const nextDraft = { ...draft, currentStep: nextStep };
    syncStoreWithDraft(nextDraft);
    persistDraft(nextDraft);
    markStepCompleted(currentStep);
    if (currentStep < FREELANCER_ONBOARDING_STEPS) {
      router.push(`/onboarding/freelancer/${nextStep}`);
    }
  }, [currentStep, draft, router, completedSteps]);

  const handleBack = useCallback(() => {
    if (!draft) return;
    const prevStep = Math.max(currentStep - 1, 1) as FreelancerOnboardingStepId;
    const backDraft = { ...draft, currentStep: prevStep };
    syncStoreWithDraft(backDraft);
    persistDraft(backDraft);
    markStepCompleted(currentStep);
    if (currentStep > 1) {
      router.push(`/onboarding/freelancer/${prevStep}`);
    }
  }, [currentStep, draft, router, completedSteps]);

  const handleSubmit = useCallback(async () => {
    if (!draft) return;
    setSubmitting(true);
    setError(null);
    try {
      // Activate the Freelancer capability on the backend — this is the
      // real onboarding completion step.
      const { error: apiError } = await createFlApplicationApi(
        freelancerDraftToCreateDto(draft)
      );
      if (apiError) {
        setError(apiError.message || "We couldn't activate your freelancer profile. Please try again.");
        return;
      }

      const res = submitFlApplication();
      if (res.success) {
        const allSteps: FreelancerOnboardingStepId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        setCompletedSteps(allSteps);
        persistProgress(allSteps);
        persistDraft(draft);
        router.push("/freelancer/dashboard");
      } else {
        setError(res.message);
      }
    } catch {
      setError("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [draft, router]);

  const canSubmit = draft?.status === "DRAFT" || draft?.status === "IN_PROGRESS";

  const Component = STEP_COMPONENTS[currentStep];

  if (loading) {
    return (
      <div className="min-h-screen bg-kampmax-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !draft) {
    return (
      <div className="min-h-screen bg-kampmax-bg flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-xl border border-kampmax-border">
          <p className="text-kampmax-error mb-4">{error}</p>
          <button onClick={() => router.refresh()} className="text-primary-600 hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    if (currentStep === 10) {
      return (
        <StepReview
          draft={draft}
          onSubmit={handleSubmit}
        />
      );
    }
    return (
      <Component
        draft={draft}
        onUpdate={(data: Partial<FreelancerOnboardingDraft>) =>
          setDraft((prev) => {
            if (!prev) return null;
            const next = { ...prev, ...data };
            persistDraft(next);
            syncStoreWithDraft(next);
            return next;
          })
        }
      />
    );
  };

  return (
    <OnboardingLayout
      draft={draft}
      completedSteps={completedSteps}
      onSaveDraft={handleSaveDraft}
      onNext={handleNext}
      onBack={handleBack}
      onSubmit={handleSubmit}
      canSubmit={canSubmit}
      isSaving={saving}
      isSubmitting={submitting}
      nextDisabled={!STEP_VALIDATION[currentStep]?.(draft ?? null)}
      showSaveDraft={currentStep < 10}
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {renderStepContent()}
    </OnboardingLayout>
  );
}

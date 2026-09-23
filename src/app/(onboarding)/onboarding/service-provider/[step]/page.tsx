"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { OnboardingLayout } from "@/components/service-provider/OnboardingLayout";
import { StepProviderType } from "@/components/service-provider/StepProviderType";
import { StepProfile } from "@/components/service-provider/StepProfile";
import { StepCategory } from "@/components/service-provider/StepCategory";
import { StepServices } from "@/components/service-provider/StepServices";
import { StepLocation } from "@/components/service-provider/StepLocation";
import { StepAvailability } from "@/components/service-provider/StepAvailability";
import { StepPricing } from "@/components/service-provider/StepPricing";
import { StepPortfolio } from "@/components/service-provider/StepPortfolio";
import { StepVerification } from "@/components/service-provider/StepVerification";
import { StepReview } from "@/components/service-provider/StepReview";
import { createSpApplication, createSpProfileApi, getSpOnboardingDraft, getSpOnboardingStatus, saveSpDraft, submitSpApplication } from "@/services/service-provider";
import { SERVICE_PROVIDER_ONBOARDING_STATUS, SERVICE_PROVIDER_ONBOARDING_STEPS, SERVICE_PROVIDER_ONBOARDING_STEP, isSpBlockingStatus } from "@/types/service-provider";
import type { ServiceProviderOnboardingDraft, ServiceProviderOnboardingStepId } from "@/types/service-provider";

const DRAFT_STORAGE_KEY = "kampmax:sp:onboarding:draft";
const PROGRESS_STORAGE_KEY = "kampmax:sp:onboarding:progress";

function loadStoredDraft(): ServiceProviderOnboardingDraft | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ServiceProviderOnboardingDraft) : null;
  } catch {
    return null;
  }
}

function persistDraft(d: ServiceProviderOnboardingDraft | null) {
  if (!d) return;
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(d));
  } catch {
    return;
  }
}

function loadStoredProgress(): ServiceProviderOnboardingStepId[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as number[];
    return parsed.filter((n) => n >= 1 && n <= 10) as ServiceProviderOnboardingStepId[];
  } catch {
    return [];
  }
}

function persistProgress(steps: ServiceProviderOnboardingStepId[]) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(steps));
  } catch {
    return;
  }
}

function syncStoreWithDraft(next: ServiceProviderOnboardingDraft) {
  saveSpDraft({
    ...next,
    currentStep: next.currentStep as ServiceProviderOnboardingStepId,
  });
}

const STEP_COMPONENTS: Record<number, React.ComponentType<any>> = {
  1: StepProviderType,
  2: StepProfile,
  3: StepCategory,
  4: StepServices,
  5: StepLocation,
  6: StepAvailability,
  7: StepPricing,
  8: StepPortfolio,
  9: StepVerification,
  10: StepReview,
};

const STEP_VALIDATION: Record<number, (draft: ServiceProviderOnboardingDraft | null) => boolean> = {
  1: (d) => !!d?.provider?.type,
  2: (d) => !!d?.provider?.displayName?.trim() && !!d?.profile?.displayName?.trim(),
  3: (d) => !!d?.category?.primaryCategoryId,
  4: (d) => (d?.services?.length ?? 0) > 0,
  5: (d) => !!d?.location?.primaryCampusId,
  6: (d) => d?.availability?.days?.some((day) => day.isAvailable) ?? false,
  7: (d) => true, // pricing is optional
  8: (d) => true, // portfolio is optional
  // Verification (NIN/BVN/business documents) is intentionally NOT required
  // to complete onboarding — it's an optional, profile-level flow available
  // from the dashboard at /service-provider/verification after activation.
  9: () => true,
  10: (d) => true, // handled in review
};

export default function ServiceProviderOnboardingStepPage() {
  const router = useRouter();
  const params = useParams();
  const stepParam = params.step as string;
  const currentStep = parseInt(stepParam, 10) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

  const [draft, setDraft] = useState<ServiceProviderOnboardingDraft | null>(null);
  const [completedSteps, setCompletedSteps] = useState<ServiceProviderOnboardingStepId[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load draft on mount (restores any saved draft + progress across refreshes)
  useEffect(() => {
    const loadDraft = async () => {
      setLoading(true);
      try {
        const res = createSpApplication();
        const fresh = getSpOnboardingDraft();
        const saved = loadStoredDraft();

        if (saved && saved.userId === fresh?.userId) {
          if (isSpBlockingStatus(saved.status)) {
            setDraft(saved);
          } else {
            syncStoreWithDraft(saved);
            setDraft(getSpOnboardingDraft() ?? saved);
            persistDraft(getSpOnboardingDraft() ?? saved);
          }
        } else {
          setDraft(fresh);
          persistDraft(fresh);
        }

        const savedProgress = loadStoredProgress();
        if (savedProgress.length > 0) {
          setCompletedSteps(savedProgress);
        } else {
          const seed: ServiceProviderOnboardingStepId[] = [];
          for (let i = 1; i < currentStep; i++) seed.push(i as ServiceProviderOnboardingStepId);
          setCompletedSteps(seed);
        }

        if (res.created && currentStep !== 1) {
          router.push("/onboarding/service-provider/1");
          return;
        }
      } catch (e) {
        setError("Failed to load application");
      } finally {
        setLoading(false);
      }
    };
    loadDraft();
  }, [router]);

  // Redirect if invalid step
  useEffect(() => {
    if (!loading && currentStep > SERVICE_PROVIDER_ONBOARDING_STEPS) {
      router.push(`/onboarding/service-provider/${SERVICE_PROVIDER_ONBOARDING_STEPS}`);
    }
  }, [loading, currentStep, router]);

  const markStepCompleted = (step: number) => {
    const next = Array.from(new Set([...completedSteps, step as ServiceProviderOnboardingStepId]));
    setCompletedSteps(next);
    persistProgress(next);
  };

  const handleSaveDraft = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      syncStoreWithDraft({ ...draft, currentStep: currentStep as ServiceProviderOnboardingStepId });
      const updated = getSpOnboardingDraft();
      setDraft(updated);
      persistDraft(updated);
    } catch (e) {
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
    const nextStep = Math.min(currentStep + 1, SERVICE_PROVIDER_ONBOARDING_STEPS) as ServiceProviderOnboardingStepId;
    const nextDraft = { ...draft, currentStep: nextStep };
    syncStoreWithDraft(nextDraft);
    persistDraft(nextDraft);
    markStepCompleted(currentStep);
    if (currentStep < SERVICE_PROVIDER_ONBOARDING_STEPS) {
      router.push(`/onboarding/service-provider/${nextStep}`);
    }
  }, [currentStep, draft, router, completedSteps]);

  const handleBack = useCallback(() => {
    if (!draft) return;
    const prevStep = Math.max(currentStep - 1, 1) as ServiceProviderOnboardingStepId;
    const backDraft = { ...draft, currentStep: prevStep };
    syncStoreWithDraft(backDraft);
    persistDraft(backDraft);
    markStepCompleted(currentStep);
    if (currentStep > 1) {
      router.push(`/onboarding/service-provider/${prevStep}`);
    }
  }, [currentStep, draft, router, completedSteps]);

  const handleSubmit = useCallback(async () => {
    if (!draft) return;
    setSubmitting(true);
    setError(null);
    try {
      // Activate the Service Provider capability on the backend — this is
      // the real onboarding completion step.
      const { error: apiError } = await createSpProfileApi(draft);
      if (apiError) {
        setError(apiError.message || "We couldn't activate your service provider profile. Please try again.");
        return;
      }

      const res = submitSpApplication();
      if (res.success) {
        const allSteps: ServiceProviderOnboardingStepId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        setCompletedSteps(allSteps);
        persistProgress(allSteps);
        persistDraft(draft);
        router.push("/service-provider");
      } else {
        setError(res.message);
      }
    } catch (e) {
      setError("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [draft, router]);

  const canSubmit = draft?.status === "DRAFT" || draft?.status === "IN_PROGRESS";

  const Component = STEP_COMPONENTS[currentStep];
  if (!Component && currentStep !== 10) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-kampmax-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-kampmax-bg flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-xl border border-kampmax-border">
          <p className="text-kampmax-error mb-4">{error}</p>
          <button
            onClick={() => router.refresh()}
            className="text-primary-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Status-based redirect for blocking statuses
  if (draft && ["PENDING_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"].includes(draft.status)) {
    router.push("/service-provider");
    return null;
  }

  const renderStepContent = () => {
    if (currentStep === 10) {
      return (
        <StepReview
          draft={draft}
          onEditStep={(step) => router.push(`/onboarding/service-provider/${step}`)}
          onSubmit={handleSubmit}
          canSubmit={canSubmit}
          isSubmitting={submitting}
        />
      );
    }
    if (currentStep === 9) {
      return (
        <StepVerification
          draft={draft}
          onUpdate={(data) =>
            setDraft((prev) => {
              if (!prev) return null;
              const next = { ...prev, ...data };
              persistDraft(next);
              syncStoreWithDraft(next);
              return next;
            })
          }
          onSubmitVerification={(type) => {
            // Handle verification submission
          }}
        />
      );
    }
    return (
      <Component
        draft={draft}
        onUpdate={(data: Partial<ServiceProviderOnboardingDraft>) =>
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
      {renderStepContent()}
    </OnboardingLayout>
  );
}
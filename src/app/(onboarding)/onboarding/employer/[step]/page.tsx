"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { EmployerOnboardingLayout } from "@/components/employer/EmployerOnboardingLayout";
import { StepIdentity } from "@/components/employer/StepIdentity";
import { StepOrganization } from "@/components/employer/StepOrganization";
import { StepContact } from "@/components/employer/StepContact";
import { StepPreferences } from "@/components/employer/StepPreferences";
import { StepReview } from "@/components/employer/StepReview";
import {
  createEmployerApplicationForUser,
  createEmployerProfileApi,
  employerDraftToCreateDto,
  getEmployerOnboardingDraftForUser,
  getEmployerOnboardingStatusForUser,
  saveEmployerDraftForUser,
  submitEmployerProfileForUser,
} from "@/services/employer";
import {
  BLOCKING_EMPLOYER_STATUSES,
  EMPLOYER_ONBOARDING_STEPS,
} from "@/types/employer";
import { isOrganizationLikeClientType } from "@/config/employer";
import type {
  EmployerOnboardingDraft,
  EmployerOnboardingStepId,
} from "@/types/employer";

const DRAFT_STORAGE_KEY = "kampmax:emp:onboarding:draft";
const PROGRESS_STORAGE_KEY = "kampmax:emp:onboarding:progress";

// ── Storage helpers (draft is non-sensitive form data; stored for resilience) ──

function loadStoredDraft(): EmployerOnboardingDraft | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EmployerOnboardingDraft) : null;
  } catch {
    return null;
  }
}

function persistDraft(d: EmployerOnboardingDraft | null) {
  if (!d) return;
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(d));
  } catch {
    /* noop */
  }
}

function loadStoredProgress(): EmployerOnboardingStepId[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as number[];
    return parsed.filter((n) => n >= 1 && n <= 5) as EmployerOnboardingStepId[];
  } catch {
    return [];
  }
}

function persistProgress(steps: EmployerOnboardingStepId[]) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(steps));
  } catch {
    /* noop */
  }
}

function syncStoreWithDraft(next: EmployerOnboardingDraft) {
  saveEmployerDraftForUser({ ...next, currentStep: next.currentStep as EmployerOnboardingStepId });
}

const STEP_COMPONENTS: Record<number, React.ComponentType<any>> = {
  1: StepIdentity,
  2: StepOrganization,
  3: StepContact,
  4: StepPreferences,
  5: StepReview,
};

const STEP_VALIDATION: Record<number, (draft: EmployerOnboardingDraft | null) => boolean> = {
  1: (d) => !!d?.clientType && !!d?.profile?.displayName?.trim() && !!d?.profile?.headline?.trim(),
  2: (d) =>
    // Organization step: required only for org-like client types, otherwise always valid.
    isOrganizationLikeClientType(d?.clientType ?? "")
      ? !!d?.organization?.name?.trim() && !!d?.organization?.businessType?.trim()
      : true,
  3: (d) => !!d?.contact?.email?.trim() && !!d?.contact?.phone?.trim(),
  4: (d) => (d?.preferences?.categories?.length ?? 0) > 0,
  5: (d) => true, // handled in review
};

export default function EmployerOnboardingStepPage() {
  const router = useRouter();
  const params = useParams();
  const stepParam = params.step as string;
  const currentStep = parseInt(stepParam, 10) as 1 | 2 | 3 | 4 | 5;

  const [draft, setDraft] = useState<EmployerOnboardingDraft | null>(null);
  const [completedSteps, setCompletedSteps] = useState<EmployerOnboardingStepId[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editStep, setEditStep] = useState<number | null>(null);

  useEffect(() => {
    const loadDraft = async () => {
      setLoading(true);
      try {
        createEmployerApplicationForUser();
        const fresh = getEmployerOnboardingDraftForUser();
        const saved = loadStoredDraft();

        if (saved && saved.userId === fresh?.userId) {
          if (BLOCKING_EMPLOYER_STATUSES.includes(saved.status as any)) {
            setDraft(saved);
          } else {
            syncStoreWithDraft(saved);
            setDraft(getEmployerOnboardingDraftForUser() ?? saved);
            persistDraft(getEmployerOnboardingDraftForUser() ?? saved);
          }
        } else {
          setDraft(fresh);
          persistDraft(fresh);
        }

        const savedProgress = loadStoredProgress();
        if (savedProgress.length > 0) {
          setCompletedSteps(savedProgress);
        } else {
          const seed: EmployerOnboardingStepId[] = [];
          for (let i = 1; i < currentStep; i++) seed.push(i as EmployerOnboardingStepId);
          setCompletedSteps(seed);
        }

        if (fresh && currentStep !== 1 && fresh.status === "DRAFT" && !saved) {
          router.push("/onboarding/employer/1");
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
    if (!loading && currentStep > EMPLOYER_ONBOARDING_STEPS) {
      router.push(`/onboarding/employer/${EMPLOYER_ONBOARDING_STEPS}`);
    }
  }, [loading, currentStep, router]);

  const markStepCompleted = (step: number) => {
    const next = Array.from(new Set([...completedSteps, step as EmployerOnboardingStepId]));
    setCompletedSteps(next);
    persistProgress(next);
  };

  const handleSaveDraft = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      syncStoreWithDraft({ ...draft, currentStep: currentStep as EmployerOnboardingStepId });
      const updated = getEmployerOnboardingDraftForUser();
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
    const nextStep = Math.min(currentStep + 1, EMPLOYER_ONBOARDING_STEPS) as EmployerOnboardingStepId;
    const nextDraft = { ...draft, currentStep: nextStep };
    syncStoreWithDraft(nextDraft);
    persistDraft(nextDraft);
    markStepCompleted(currentStep);
    if (currentStep < EMPLOYER_ONBOARDING_STEPS) {
      router.push(`/onboarding/employer/${nextStep}`);
    }
  }, [currentStep, draft, router, completedSteps]);

  const handleBack = useCallback(() => {
    if (!draft) return;
    const prevStep = Math.max(currentStep - 1, 1) as EmployerOnboardingStepId;
    const backDraft = { ...draft, currentStep: prevStep };
    syncStoreWithDraft(backDraft);
    persistDraft(backDraft);
    markStepCompleted(currentStep);
    if (currentStep > 1) {
      router.push(`/onboarding/employer/${prevStep}`);
    }
  }, [currentStep, draft, router, completedSteps]);

  const handleSubmit = useCallback(async () => {
    if (!draft) return;
    setSubmitting(true);
    setError(null);
    try {
      // Activate the Employer capability on the backend — this is the real
      // onboarding completion step. The mock submitEmployerProfileForUser()
      // call afterward just keeps the local draft/status UI consistent.
      const { error: apiError } = await createEmployerProfileApi(
        employerDraftToCreateDto(draft)
      );
      if (apiError) {
        setError(apiError.message || "We couldn't activate your employer profile. Please try again.");
        return;
      }

      const res = submitEmployerProfileForUser();
      if (res.success) {
        const allSteps: EmployerOnboardingStepId[] = [1, 2, 3, 4, 5];
        setCompletedSteps(allSteps);
        persistProgress(allSteps);
        persistDraft(draft);
        router.push("/employer/dashboard");
      } else {
        setError(res.message);
      }
    } catch {
      setError("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [draft, router]);

  const handleEditStep = useCallback(
    (step: number) => {
      if (!draft) return;
      setEditStep(step);
      const nextDraft = { ...draft, currentStep: step as EmployerOnboardingStepId };
      syncStoreWithDraft(nextDraft);
      persistDraft(nextDraft);
      router.push(`/onboarding/employer/${step}`);
    },
    [draft, router]
  );

  const canSubmit =
    draft?.status === "DRAFT" || draft?.status === "IN_PROGRESS";

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
    if (currentStep === 5) {
      return (
        <StepReview
          draft={draft}
          onSubmit={handleSubmit}
          isSubmitting={submitting}
          onEditStep={handleEditStep}
        />
      );
    }
    return (
      <Component
        draft={draft}
        onUpdate={(data: Partial<EmployerOnboardingDraft>) =>
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
    <EmployerOnboardingLayout
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
      showSaveDraft={currentStep < EMPLOYER_ONBOARDING_STEPS}
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {renderStepContent()}
    </EmployerOnboardingLayout>
  );
}

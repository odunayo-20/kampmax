"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { EmployerOnboardingLayout } from "@/components/employer/EmployerOnboardingLayout";
import { StepIdentity } from "@/components/employer/StepIdentity";
import { StepOrganization } from "@/components/employer/StepOrganization";
import { StepContact } from "@/components/employer/StepContact";
import { StepPreferences } from "@/components/employer/StepPreferences";
import { StepReview } from "@/components/employer/StepReview";
import { useAuth } from "@/lib/auth-context";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { createEmployerProfileApi, employerDraftToCreateDto } from "@/services/employer";
import { employerDraftFromSaved, employerDraftToSaved } from "@/services/employer-onboarding";
import type { EmployerSavedData } from "@/services/employer-onboarding";
import { discardOnboardingDraft, loadOnboardingDraft, saveOnboardingDraft } from "@/services/onboarding-draft";
import { EMPLOYER_ONBOARDING_STEPS } from "@/types/employer";
import { isOrganizationLikeClientType } from "@/config/employer";
import type { EmployerOnboardingDraft, EmployerOnboardingStepId } from "@/types/employer";

/** How long to wait after the last keystroke before saving progress. */
const AUTOSAVE_MS = 800;

// Drafts used to live only in this browser; progress is on the server now.
function clearOldBrowserDraft() {
  try {
    window.localStorage.removeItem("kampmax:emp:onboarding:draft");
    window.localStorage.removeItem("kampmax:emp:onboarding:progress");
  } catch {
    /* storage unavailable */
  }
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
  5: () => true, // handled in review
};

export default function EmployerOnboardingStepPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const currentStep = parseInt(params.step as string, 10) as EmployerOnboardingStepId;

  const [draft, setDraft] = useState<EmployerOnboardingDraft | null>(null);
  const [completedSteps, setCompletedSteps] = useState<EmployerOnboardingStepId[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // The latest values, for the debounced save and the unmount flush.
  const latest = useRef<{ draft: EmployerOnboardingDraft | null; completed: EmployerOnboardingStepId[] }>({
    draft: null,
    completed: [],
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const stepRef = useRef(currentStep);
  stepRef.current = currentStep;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    loadOnboardingDraft<Partial<EmployerSavedData>>("employer")
      .then((saved) => {
        if (cancelled) return;
        clearOldBrowserDraft();
        const restored = employerDraftFromSaved(userId, saved);
        setDraft(restored.draft);
        setCompletedSteps(restored.completedSteps);
        latest.current = { draft: restored.draft, completed: restored.completedSteps };
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(getFriendlyErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, attempt]);

  // The URL says which step is on screen.
  const shown = draft ? { ...draft, currentStep } : null;

  useEffect(() => {
    if (!loading && currentStep > EMPLOYER_ONBOARDING_STEPS) {
      router.push(`/onboarding/employer/${EMPLOYER_ONBOARDING_STEPS}`);
    }
  }, [loading, currentStep, router]);

  /** Saves what's on screen now; resolves false (and says so) if the server didn't keep it. */
  const flush = useCallback(async (step?: EmployerOnboardingStepId): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const { draft: d, completed } = latest.current;
    if (!d) return false;
    try {
      await saveOnboardingDraft("employer", employerDraftToSaved({ ...d, currentStep: step ?? stepRef.current }, completed));
      dirty.current = false;
      setError(null);
      return true;
    } catch (e) {
      setError(`Your progress wasn't saved. ${getFriendlyErrorMessage(e)}`);
      return false;
    }
  }, []);

  // Don't lose the last edits when someone navigates away.
  useEffect(
    () => () => {
      if (dirty.current) void flush();
    },
    [flush]
  );

  const update = useCallback(
    (data: Partial<EmployerOnboardingDraft>) => {
      setDraft((prev) => {
        if (!prev) return null;
        const next = { ...prev, ...data };
        latest.current = { ...latest.current, draft: next };
        dirty.current = true;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
        return next;
      });
    },
    [flush]
  );

  const markCompleted = (step: EmployerOnboardingStepId): EmployerOnboardingStepId[] => {
    const next = Array.from(new Set([...completedSteps, step]));
    setCompletedSteps(next);
    latest.current = { ...latest.current, completed: next };
    return next;
  };

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    await flush();
    setSaving(false);
  }, [flush]);

  const handleNext = useCallback(async () => {
    if (!draft) return;
    if (!(STEP_VALIDATION[currentStep]?.(draft) ?? false)) {
      setError("Please complete all required fields before continuing");
      return;
    }
    setError(null);
    const nextStep = Math.min(currentStep + 1, EMPLOYER_ONBOARDING_STEPS) as EmployerOnboardingStepId;
    markCompleted(currentStep);
    // Stay put if the server didn't keep it: the next page loads from the server.
    if (!(await flush(nextStep))) return;
    if (currentStep < EMPLOYER_ONBOARDING_STEPS) router.push(`/onboarding/employer/${nextStep}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, draft, router, flush, completedSteps]);

  const handleBack = useCallback(async () => {
    if (!draft || currentStep <= 1) return;
    const prevStep = (currentStep - 1) as EmployerOnboardingStepId;
    if (!(await flush(prevStep))) return;
    router.push(`/onboarding/employer/${prevStep}`);
  }, [currentStep, draft, router, flush]);

  const handleEditStep = useCallback(
    async (step: number) => {
      if (!draft) return;
      if (!(await flush(step as EmployerOnboardingStepId))) return;
      router.push(`/onboarding/employer/${step}`);
    },
    [draft, router, flush]
  );

  const handleSubmit = useCallback(async () => {
    if (!draft) return;
    setSubmitting(true);
    setError(null);
    try {
      // Creating the profile is what activates the Employer role.
      const { error: apiError } = await createEmployerProfileApi(employerDraftToCreateDto(draft));
      // A profile already exists (e.g. an earlier submit succeeded) — the
      // role is active, so treat it as done rather than an error.
      const alreadyExists =
        apiError?.status === 409 || /already has an employer profile/i.test(apiError?.message ?? "");
      if (apiError && !alreadyExists) {
        setError(apiError.message || "We couldn't activate your employer profile. Please try again.");
        return;
      }
      dirty.current = false;
      if (timer.current) clearTimeout(timer.current);
      await discardOnboardingDraft("employer");
      router.push("/employer/dashboard");
    } catch {
      setError("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [draft, router]);

  const Component = STEP_COMPONENTS[currentStep];

  if (loading) {
    return (
      <div className="min-h-screen bg-kampmax-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (loadError || !draft || !shown) {
    return (
      <div className="min-h-screen bg-kampmax-bg flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-xl border border-kampmax-border">
          <p className="text-kampmax-error mb-4">{loadError ?? "We couldn't load your application."}</p>
          <button onClick={() => setAttempt((n) => n + 1)} className="text-primary-600 hover:underline">
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
          draft={shown}
          onSubmit={handleSubmit}
          isSubmitting={submitting}
          onEditStep={(step: number) => void handleEditStep(step)}
        />
      );
    }
    if (!Component) return null;
    return <Component draft={shown} onUpdate={update} />;
  };

  return (
    <EmployerOnboardingLayout
      draft={shown}
      completedSteps={completedSteps}
      onSaveDraft={handleSaveDraft}
      onNext={() => void handleNext()}
      onBack={() => void handleBack()}
      onSubmit={handleSubmit}
      canSubmit
      isSaving={saving}
      isSubmitting={submitting}
      nextDisabled={!STEP_VALIDATION[currentStep]?.(draft)}
      showSaveDraft={currentStep < EMPLOYER_ONBOARDING_STEPS}
    >
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {renderStepContent()}
    </EmployerOnboardingLayout>
  );
}

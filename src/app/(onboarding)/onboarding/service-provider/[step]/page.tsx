"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
import { StepReview } from "@/components/service-provider/StepReview";
import { useAuth } from "@/lib/auth-context";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { completeSpOnboarding } from "@/services/service-provider";
import { spDraftFromSaved, spDraftToSaved } from "@/services/service-provider-onboarding";
import type { SpSavedData } from "@/services/service-provider-onboarding";
import { discardOnboardingDraft, loadOnboardingDraft, saveOnboardingDraft } from "@/services/onboarding-draft";
import { SERVICE_PROVIDER_ONBOARDING_STEPS } from "@/types/service-provider";
import type { ServiceProviderOnboardingDraft, ServiceProviderOnboardingStepId } from "@/types/service-provider";

/** How long to wait after the last keystroke before saving progress. */
const AUTOSAVE_MS = 800;

// Drafts used to live only in this browser; progress is on the server now.
function clearOldBrowserDraft() {
  try {
    window.localStorage.removeItem("kampmax:sp:onboarding:draft");
    window.localStorage.removeItem("kampmax:sp:onboarding:progress");
  } catch {
    /* storage unavailable */
  }
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
  9: StepReview,
};

const STEP_VALIDATION: Record<number, (draft: ServiceProviderOnboardingDraft | null) => boolean> = {
  1: (d) => !!d?.provider?.type,
  2: (d) => !!d?.provider?.displayName?.trim() && !!d?.profile?.displayName?.trim(),
  3: (d) => !!d?.category?.primaryCategoryId,
  4: (d) => (d?.services?.length ?? 0) > 0,
  5: (d) => !!d?.location?.primaryCampusId,
  6: (d) => d?.availability?.days?.some((day) => day.isAvailable) ?? false,
  7: () => true, // pricing is optional
  8: () => true, // portfolio is optional
  9: () => true, // handled in review
};

export default function ServiceProviderOnboardingStepPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const currentStep = parseInt(params.step as string, 10) as ServiceProviderOnboardingStepId;

  const [draft, setDraft] = useState<ServiceProviderOnboardingDraft | null>(null);
  const [completedSteps, setCompletedSteps] = useState<ServiceProviderOnboardingStepId[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // The latest values, for the debounced save and the unmount flush.
  const latest = useRef<{ draft: ServiceProviderOnboardingDraft | null; completed: ServiceProviderOnboardingStepId[] }>({
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
    loadOnboardingDraft<Partial<SpSavedData>>("service-provider")
      .then((saved) => {
        if (cancelled) return;
        clearOldBrowserDraft();
        const restored = spDraftFromSaved(userId, saved);
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
  }, [userId, attempt]);

  useEffect(() => {
    if (!loading && currentStep > SERVICE_PROVIDER_ONBOARDING_STEPS) {
      router.push(`/onboarding/service-provider/${SERVICE_PROVIDER_ONBOARDING_STEPS}`);
    }
  }, [loading, currentStep, router]);

  /** Saves what's on screen now; resolves false (and says so) if the server didn't keep it. */
  const flush = useCallback(async (step?: number): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const { draft: d, completed } = latest.current;
    if (!d) return false;
    try {
      await saveOnboardingDraft(
        "service-provider",
        spDraftToSaved({ ...d, currentStep: (step ?? stepRef.current) as ServiceProviderOnboardingStepId }, completed)
      );
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
    (data: Partial<ServiceProviderOnboardingDraft>) => {
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

  const markCompleted = (step: ServiceProviderOnboardingStepId) => {
    const next = Array.from(new Set([...completedSteps, step]));
    setCompletedSteps(next);
    latest.current = { ...latest.current, completed: next };
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
    const nextStep = Math.min(currentStep + 1, SERVICE_PROVIDER_ONBOARDING_STEPS);
    markCompleted(currentStep);
    // Stay put if the server didn't keep it: progress is read back from the server.
    if (!(await flush(nextStep))) return;
    if (currentStep < SERVICE_PROVIDER_ONBOARDING_STEPS) router.push(`/onboarding/service-provider/${nextStep}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, draft, router, flush, completedSteps]);

  const handleBack = useCallback(async () => {
    if (!draft || currentStep <= 1) return;
    const prevStep = currentStep - 1;
    if (!(await flush(prevStep))) return;
    router.push(`/onboarding/service-provider/${prevStep}`);
  }, [currentStep, draft, router, flush]);

  const handleEditStep = useCallback(
    async (step: number) => {
      if (!draft) return;
      if (!(await flush(step))) return;
      router.push(`/onboarding/service-provider/${step}`);
    },
    [draft, router, flush]
  );

  const handleSubmit = useCallback(async () => {
    if (!draft) return;
    setSubmitting(true);
    setError(null);
    try {
      // Saves the profile, the services and the schedule on the server; it can
      // be run again if something fails, and says exactly what didn't save.
      const result = await completeSpOnboarding(draft);
      if (!result.ok) {
        setError(result.problems.join(" "));
        return;
      }
      dirty.current = false;
      if (timer.current) clearTimeout(timer.current);
      await discardOnboardingDraft("service-provider");
      router.push("/service-provider");
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

  // The URL says which step is on screen.
  const shown = draft ? { ...draft, currentStep } : null;

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
    if (currentStep === SERVICE_PROVIDER_ONBOARDING_STEPS) {
      return (
        <StepReview
          draft={shown}
          onEditStep={(step) => void handleEditStep(step)}
          onSubmit={handleSubmit}
          canSubmit
          isSubmitting={submitting}
        />
      );
    }
    if (!Component) return null;
    return <Component draft={shown} onUpdate={update} />;
  };

  return (
    <OnboardingLayout
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
      showSaveDraft={currentStep < SERVICE_PROVIDER_ONBOARDING_STEPS}
    >
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {renderStepContent()}
    </OnboardingLayout>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
import { useAuth } from "@/lib/auth-context";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import {
  createFlApplicationApi,
  freelancerDraftToCreateDto,
  getFlOnboardingDraftApi,
  loadProfileSections,
  saveFlDraftApi,
  saveProfileSections,
} from "@/services/freelancer";
import { flDraftFromSaved, flDraftToSaved, mergeFreelancerProfile } from "@/services/freelancer-onboarding";
import type { FlSavedData } from "@/services/freelancer-onboarding";
import { discardOnboardingDraft, loadOnboardingDraft, saveOnboardingDraft } from "@/services/onboarding-draft";
import { FREELANCER_ONBOARDING_STEPS } from "@/types/freelancer";
import type { FreelancerOnboardingDraft, FreelancerOnboardingStepId } from "@/types/freelancer";

/** How long to wait after the last keystroke before saving progress. */
const AUTOSAVE_MS = 800;

// Drafts used to live only in this browser; progress is on the server now.
function clearOldBrowserDraft() {
  try {
    window.localStorage.removeItem("kampmax:fl:onboarding:draft");
    window.localStorage.removeItem("kampmax:fl:onboarding:progress");
  } catch {
    /* storage unavailable */
  }
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
  4: () => true, // education is optional
  5: () => true, // certifications are optional
  6: () => true, // portfolio is optional
  7: () => true, // rates are optional
  8: (d) => !!d?.availability?.status,
  9: (d) => (d?.preferences?.workArrangements?.length ?? 0) > 0,
  10: () => true, // handled in review
};

export default function FreelancerOnboardingStepPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const currentStep = parseInt(params.step as string, 10) as FreelancerOnboardingStepId;

  const [draft, setDraft] = useState<FreelancerOnboardingDraft | null>(null);
  const [completedSteps, setCompletedSteps] = useState<FreelancerOnboardingStepId[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [hasBackendProfile, setHasBackendProfile] = useState(false);

  // The latest values, for the debounced save and the unmount flush.
  const latest = useRef<{ draft: FreelancerOnboardingDraft | null; completed: FreelancerOnboardingStepId[] }>({
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
    (async () => {
      const saved = await loadOnboardingDraft<Partial<FlSavedData>>("freelancer");
      const restored = flDraftFromSaved(userId, saved);

      // Someone who already has a profile and comes back to this wizard should
      // see their real details, not a blank form (and submitting must update
      // the profile rather than try to create a second one).
      const { profile: backendProfile } = await getFlOnboardingDraftApi();
      const sections = backendProfile ? await loadProfileSections() : null;
      const next = backendProfile ? mergeFreelancerProfile(restored.draft, backendProfile, sections) : restored.draft;

      if (cancelled) return;
      clearOldBrowserDraft();
      setHasBackendProfile(!!backendProfile);
      setDraft(next);
      setCompletedSteps(restored.completedSteps);
      latest.current = { draft: next, completed: restored.completedSteps };
    })()
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
    if (!loading && currentStep > FREELANCER_ONBOARDING_STEPS) {
      router.push(`/onboarding/freelancer/${FREELANCER_ONBOARDING_STEPS}`);
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
        "freelancer",
        flDraftToSaved({ ...d, currentStep: (step ?? stepRef.current) as FreelancerOnboardingStepId }, completed)
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
    (data: Partial<FreelancerOnboardingDraft>) => {
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

  const markCompleted = (step: FreelancerOnboardingStepId) => {
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
    const nextStep = Math.min(currentStep + 1, FREELANCER_ONBOARDING_STEPS);
    markCompleted(currentStep);
    // Stay put if the server didn't keep it: progress is read back from the server.
    if (!(await flush(nextStep))) return;
    if (currentStep < FREELANCER_ONBOARDING_STEPS) router.push(`/onboarding/freelancer/${nextStep}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, draft, router, flush, completedSteps]);

  const handleBack = useCallback(async () => {
    if (!draft || currentStep <= 1) return;
    const prevStep = currentStep - 1;
    if (!(await flush(prevStep))) return;
    router.push(`/onboarding/freelancer/${prevStep}`);
  }, [currentStep, draft, router, flush]);

  const handleSubmit = useCallback(async () => {
    if (!draft) return;
    setSubmitting(true);
    setError(null);
    try {
      // Activate the Freelancer role on the backend — this is the real
      // onboarding completion step. A profile already existing (detected on
      // load, or discovered here via a 409 race) means this is an edit:
      // update instead of trying to create a second one.
      const dto = freelancerDraftToCreateDto(draft);
      let apiError = hasBackendProfile
        ? (await saveFlDraftApi(dto)).error
        : (await createFlApplicationApi(dto)).error;

      if (apiError && apiError.status === 409) {
        apiError = (await saveFlDraftApi(dto)).error;
      }

      if (apiError) {
        setError(apiError.message || "We couldn't activate your freelancer profile. Please try again.");
        return;
      }

      const sectionsError = await saveProfileSections(draft);
      if (sectionsError) {
        setError(sectionsError.message || "Your profile saved, but experience/education/certifications didn't. Please try again.");
        return;
      }

      dirty.current = false;
      if (timer.current) clearTimeout(timer.current);
      await discardOnboardingDraft("freelancer");
      router.push("/freelancer/dashboard");
    } catch {
      setError("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [draft, hasBackendProfile, router]);

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
    if (currentStep === FREELANCER_ONBOARDING_STEPS) {
      return <StepReview draft={shown} onSubmit={handleSubmit} />;
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
      showSaveDraft={currentStep < FREELANCER_ONBOARDING_STEPS}
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

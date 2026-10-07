import { EMPLOYER_ONBOARDING_STATUS, EMPLOYER_ONBOARDING_STEPS } from "@/types/employer";
import type { EmployerOnboardingDraft, EmployerOnboardingStepId } from "@/types/employer";
import type { SavedOnboardingDraft } from "@/services/onboarding-draft";

// What the employer wizard keeps on the server between visits: the form
// values and which steps were finished. Status, approval and verification are
// the backend's and never travel in a draft.

export interface EmployerSavedData {
  clientType: EmployerOnboardingDraft["clientType"];
  profile: EmployerOnboardingDraft["profile"];
  organization: EmployerOnboardingDraft["organization"];
  contact: EmployerOnboardingDraft["contact"];
  location: EmployerOnboardingDraft["location"];
  preferences: EmployerOnboardingDraft["preferences"];
  completedSteps: number[];
}

/** A blank draft for someone who hasn't started. */
export function newEmployerDraft(userId: string): EmployerOnboardingDraft {
  const now = new Date().toISOString();
  return {
    userId,
    status: EMPLOYER_ONBOARDING_STATUS.IN_PROGRESS,
    currentStep: 1,
    createdAt: now,
    updatedAt: now,
    clientType: "",
    profile: {},
    organization: {},
    contact: {},
    location: {},
    preferences: { categories: [] },
    verification: { status: "not_started" },
  };
}

const isStep = (n: unknown): n is EmployerOnboardingStepId =>
  Number.isInteger(n) && (n as number) >= 1 && (n as number) <= EMPLOYER_ONBOARDING_STEPS;

/** The wizard's draft and finished steps, from what the server returned (or a blank start). */
export function employerDraftFromSaved(
  userId: string,
  saved: SavedOnboardingDraft<Partial<EmployerSavedData>> | null
): { draft: EmployerOnboardingDraft; completedSteps: EmployerOnboardingStepId[] } {
  const base = newEmployerDraft(userId);
  if (!saved) return { draft: base, completedSteps: [] };
  const d = saved.data ?? {};
  return {
    draft: {
      ...base,
      updatedAt: saved.updatedAt,
      currentStep: isStep(saved.currentStep) ? saved.currentStep : 1,
      clientType: d.clientType ?? "",
      profile: d.profile ?? {},
      organization: d.organization ?? {},
      contact: d.contact ?? {},
      location: d.location ?? {},
      preferences: { categories: [], ...(d.preferences ?? {}) },
    },
    completedSteps: (d.completedSteps ?? []).filter(isStep),
  };
}

/** What to send to the server for the draft as it stands. */
export function employerDraftToSaved(
  draft: EmployerOnboardingDraft,
  completedSteps: number[]
): { currentStep: number; data: EmployerSavedData } {
  return {
    currentStep: draft.currentStep,
    data: {
      clientType: draft.clientType,
      profile: draft.profile,
      organization: draft.organization,
      contact: draft.contact,
      location: draft.location,
      preferences: draft.preferences,
      completedSteps: Array.from(new Set(completedSteps)).filter(isStep),
    },
  };
}

import { FREELANCER_ONBOARDING_STATUS, FREELANCER_ONBOARDING_STEPS } from "@/types/freelancer";
import type { FreelancerOnboardingDraft, FreelancerOnboardingStepId } from "@/types/freelancer";
import { withoutInlineImages } from "@/services/onboarding-draft";
import type { SavedOnboardingDraft } from "@/services/onboarding-draft";
import type { FreelancerPrivateProfile } from "@/services/freelancer";

// What the freelancer wizard keeps on the server between visits: the form
// values and which steps were finished. Status, approval and verification are
// the backend's and never travel in a draft. The profile photo is uploaded as
// soon as it is chosen, so a draft holds its address, never the picture itself.
// Portfolio projects are added from the dashboard.

export interface FlSavedData {
  profile: FreelancerOnboardingDraft["profile"];
  categories: string[];
  skills: string[];
  experience: FreelancerOnboardingDraft["experience"];
  education: FreelancerOnboardingDraft["education"];
  certifications: FreelancerOnboardingDraft["certifications"];
  portfolio: FreelancerOnboardingDraft["portfolio"];
  rates: FreelancerOnboardingDraft["rates"];
  availability: FreelancerOnboardingDraft["availability"];
  preferences: FreelancerOnboardingDraft["preferences"];
  completedSteps: number[];
}

/** A fresh id for a row the person adds in the wizard (experience, education, ...). */
export function freshId(): string {
  return `fl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** A blank draft for someone who hasn't started. */
export function newFlDraft(userId: string): FreelancerOnboardingDraft {
  const now = new Date().toISOString();
  return {
    userId,
    status: FREELANCER_ONBOARDING_STATUS.IN_PROGRESS,
    currentStep: 1,
    createdAt: now,
    updatedAt: now,
    profile: { remoteAvailable: true },
    categories: [],
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    portfolio: [],
    rates: { negotiable: true },
    availability: {
      status: "available_now",
      workingDays: ["mon", "tue", "wed", "thu", "fri"],
      workingHoursStart: "09:00",
      workingHoursEnd: "17:00",
      timezone: "Africa/Lagos",
    },
    preferences: { workArrangements: [], projectTypes: [] },
  };
}

const isStep = (n: unknown): n is FreelancerOnboardingStepId =>
  Number.isInteger(n) && (n as number) >= 1 && (n as number) <= FREELANCER_ONBOARDING_STEPS;

/** The wizard's draft and finished steps, from what the server returned (or a blank start). */
export function flDraftFromSaved(
  userId: string,
  saved: SavedOnboardingDraft<Partial<FlSavedData>> | null
): { draft: FreelancerOnboardingDraft; completedSteps: FreelancerOnboardingStepId[] } {
  const base = newFlDraft(userId);
  if (!saved) return { draft: base, completedSteps: [] };
  const d = saved.data ?? {};
  return {
    draft: {
      ...base,
      updatedAt: saved.updatedAt,
      currentStep: isStep(saved.currentStep) ? saved.currentStep : 1,
      profile: { ...base.profile, ...(d.profile ?? {}) },
      categories: d.categories ?? [],
      skills: d.skills ?? [],
      experience: d.experience ?? [],
      education: d.education ?? [],
      certifications: d.certifications ?? [],
      portfolio: d.portfolio ?? [],
      rates: { ...base.rates, ...(d.rates ?? {}) },
      availability: { ...base.availability, ...(d.availability ?? {}) },
      preferences: { ...base.preferences, ...(d.preferences ?? {}) },
    },
    completedSteps: (d.completedSteps ?? []).filter(isStep),
  };
}

/** What to send to the server for the draft as it stands. */
export function flDraftToSaved(
  draft: FreelancerOnboardingDraft,
  completedSteps: number[]
): { currentStep: number; data: FlSavedData } {
  return {
    currentStep: draft.currentStep,
    data: withoutInlineImages({
      profile: draft.profile,
      categories: draft.categories,
      skills: draft.skills,
      experience: draft.experience,
      education: draft.education,
      certifications: draft.certifications,
      portfolio: draft.portfolio,
      rates: draft.rates,
      availability: draft.availability,
      preferences: draft.preferences,
      completedSteps: Array.from(new Set(completedSteps)).filter(isStep),
    }),
  };
}

/**
 * Someone who already has a freelancer profile opening the wizard again sees
 * their real details, not a blank form: fields still empty in the draft take
 * the profile's values, and the saved experience, education and certification
 * rows win once they exist.
 */
export function mergeFreelancerProfile(
  base: FreelancerOnboardingDraft,
  profile: FreelancerPrivateProfile,
  sections: Pick<FreelancerOnboardingDraft, "experience" | "education" | "certifications"> | null
): FreelancerOnboardingDraft {
  return {
    ...base,
    profile: {
      ...base.profile,
      headline: base.profile?.headline || profile.professionalTitle || undefined,
      bio: base.profile?.bio || profile.bio || undefined,
      city: base.profile?.city || profile.city || undefined,
      photoUrl: base.profile?.photoUrl || profile.avatar || undefined,
      photoMediaId: base.profile?.photoMediaId !== undefined ? base.profile.photoMediaId : profile.profileMediaId,
      campusId: base.profile?.campusId || profile.campusId || undefined,
    },
    skills: base.skills?.length ? base.skills : profile.skills?.map((s) => s.name) ?? base.skills,
    rates: {
      ...base.rates,
      hourlyRate: base.rates?.hourlyRate ?? profile.hourlyRate ?? undefined,
    },
    experience: sections?.experience.length ? sections.experience : base.experience,
    education: sections?.education.length ? sections.education : base.education,
    certifications: sections?.certifications.length ? sections.certifications : base.certifications,
  };
}

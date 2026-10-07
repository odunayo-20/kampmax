import {
  SERVICE_PROVIDER_LOCATION_TYPE,
  SERVICE_PROVIDER_ONBOARDING_STATUS,
  SERVICE_PROVIDER_ONBOARDING_STEPS,
  SERVICE_PROVIDER_TYPE,
} from "@/types/service-provider";
import type { ServiceProviderOnboardingDraft, ServiceProviderOnboardingStepId } from "@/types/service-provider";
import { withoutInlineImages } from "@/services/onboarding-draft";
import type { SavedOnboardingDraft } from "@/services/onboarding-draft";

// What the provider wizard keeps on the server between visits: the form values
// and which steps were finished. Approval and verification are Kampmax's
// decisions and never travel in a draft. Photos are not kept: the server has
// nowhere to store a provider's logo, cover or portfolio yet, and a picture
// held as inline data would swamp the draft.

export interface SpSavedData {
  provider: ServiceProviderOnboardingDraft["provider"];
  profile: ServiceProviderOnboardingDraft["profile"];
  category: ServiceProviderOnboardingDraft["category"];
  services: ServiceProviderOnboardingDraft["services"];
  location: ServiceProviderOnboardingDraft["location"];
  availability: ServiceProviderOnboardingDraft["availability"];
  pricing: ServiceProviderOnboardingDraft["pricing"];
  portfolio: ServiceProviderOnboardingDraft["portfolio"];
  completedSteps: number[];
}

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** A blank draft for someone who hasn't started. */
export function newSpDraft(userId: string): ServiceProviderOnboardingDraft {
  const now = new Date().toISOString();
  return {
    userId,
    status: SERVICE_PROVIDER_ONBOARDING_STATUS.IN_PROGRESS,
    currentStep: 1,
    createdAt: now,
    updatedAt: now,
    provider: { type: SERVICE_PROVIDER_TYPE.INDIVIDUAL },
    profile: { logo: null, coverImage: null },
    category: { secondaryCategoryIds: [] },
    services: [],
    location: {
      type: SERVICE_PROVIDER_LOCATION_TYPE.BOTH,
      additionalCampusIds: [],
      serviceCities: [],
      serviceRadiusKm: 10,
    },
    availability: {
      days: DAY_LABELS.map((label, dayIndex) =>
        dayIndex === 6
          ? { dayIndex, label, isAvailable: false }
          : {
              dayIndex,
              label,
              isAvailable: true,
              openTime: dayIndex === 5 ? "10:00" : "09:00",
              closeTime: dayIndex === 5 ? "16:00" : "18:00",
            }
      ),
      appointmentBufferMinutes: 15,
      minAdvanceNoticeHours: 2,
      maxAdvanceBookingDays: 30,
      bookingPreference: "request_approval",
    },
    pricing: { travelFee: 0, emergencyFee: 0, weekendFee: 0, minimumBookingQuantity: 1 },
    portfolio: [],
    verification: { status: "not_required" },
    documents: [],
  };
}

const isStep = (n: unknown): n is ServiceProviderOnboardingStepId =>
  Number.isInteger(n) && (n as number) >= 1 && (n as number) <= SERVICE_PROVIDER_ONBOARDING_STEPS;

/** The wizard's draft and finished steps, from what the server returned (or a blank start). */
export function spDraftFromSaved(
  userId: string,
  saved: SavedOnboardingDraft<Partial<SpSavedData>> | null
): { draft: ServiceProviderOnboardingDraft; completedSteps: ServiceProviderOnboardingStepId[] } {
  const base = newSpDraft(userId);
  if (!saved) return { draft: base, completedSteps: [] };
  const d = saved.data ?? {};
  return {
    draft: {
      ...base,
      updatedAt: saved.updatedAt,
      currentStep: isStep(saved.currentStep) ? saved.currentStep : 1,
      provider: { ...base.provider, ...(d.provider ?? {}) },
      profile: { ...base.profile, ...(d.profile ?? {}) },
      category: { ...base.category, ...(d.category ?? {}) },
      services: d.services ?? [],
      location: { ...base.location, ...(d.location ?? {}) },
      availability: { ...base.availability, ...(d.availability ?? {}) },
      pricing: { ...base.pricing, ...(d.pricing ?? {}) },
      portfolio: d.portfolio ?? [],
    },
    completedSteps: (d.completedSteps ?? []).filter(isStep),
  };
}

/** What to send to the server for the draft as it stands. */
export function spDraftToSaved(
  draft: ServiceProviderOnboardingDraft,
  completedSteps: number[]
): { currentStep: number; data: SpSavedData } {
  return {
    currentStep: draft.currentStep,
    data: withoutInlineImages({
      provider: draft.provider,
      profile: draft.profile,
      category: draft.category,
      services: draft.services,
      location: draft.location,
      availability: draft.availability,
      pricing: draft.pricing,
      portfolio: draft.portfolio,
      completedSteps: Array.from(new Set(completedSteps)).filter(isStep),
    }),
  };
}

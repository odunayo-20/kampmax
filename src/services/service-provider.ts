import { apiClient } from "@/lib/api-client";
import { addSpDashboardServiceLive, updateSpAvailabilityLive } from "@/services/service-provider-dashboard.api";
import type { ServiceProviderOnboardingDraft } from "@/types/service-provider";

// ============================================================
// SERVICE PROVIDER ONBOARDING (live)
// ============================================================
//
// Finishing onboarding saves the profile (POST /service-provider/profile), each
// listed service and the weekly schedule on the server. Progress in between is
// kept by services/onboarding-draft.ts. Approval is Kampmax's decision, made by
// an admin afterwards; nothing here decides it.

// ── Real backend activation (onboarding completion) ──────────

export interface CreateServiceProviderProfileDto {
  displayName: string;
  slug: string;
  bio?: string;
  providerType?: string;
}

function slugifyLocal(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "provider"}-${suffix}`;
}

/**
 * Activate the Service Provider capability on the backend — this IS the
 * onboarding completion step (POST /service-provider/profile). No NIN/BVN/
 * certificate is required here; verification is a separate, optional flow
 * available from /service-provider/verification after activation.
 */
export async function createSpProfileApi(
  draft: ServiceProviderOnboardingDraft
): Promise<{ created: boolean; error: import("@/lib/api-client").ApiError | null }> {
  const displayName =
    draft.profile?.displayName?.trim() || draft.provider?.displayName?.trim() || "Service Provider";
  const dto: CreateServiceProviderProfileDto = {
    displayName,
    slug: slugifyLocal(displayName),
    bio: draft.profile?.description?.trim() || draft.provider?.bio?.trim() || undefined,
    providerType: draft.provider?.type || undefined,
  };
  const { error } = await apiClient.post<CreateServiceProviderProfileDto, unknown>(
    "/service-provider/profile",
    dto
  );
  if (error) return { created: false, error };
  return { created: true, error: null };
}

// ── Completing onboarding ────────────────────────────────────
// Onboarding is only complete once what the person entered is saved on the
// server: the profile, each service they listed, and their weekly schedule.
// Approval ("verified") is Kampmax's decision, made by an admin afterwards.

export interface SpOnboardingResult {
  ok: boolean;
  /** What did not get saved, in plain words. Empty when ok. */
  problems: string[];
}

/** The minimum a provider needs before they can go live; null when the draft is ready. */
export function validateSpDraft(draft: ServiceProviderOnboardingDraft): string | null {
  if (!(draft.profile?.displayName || draft.provider?.displayName)?.trim()) {
    return "Add a display name.";
  }
  if (!draft.category?.primaryCategoryId) return "Choose a primary service category.";
  if (!draft.services || draft.services.length === 0) return "Add at least one service.";
  return null;
}

/**
 * Saves the onboarding draft on the server. Safe to run again after a partial
 * failure: an existing profile is kept and services already saved are skipped.
 */
export async function completeSpOnboarding(
  draft: ServiceProviderOnboardingDraft
): Promise<SpOnboardingResult> {
  const invalid = validateSpDraft(draft);
  if (invalid) return { ok: false, problems: [invalid] };

  const problems: string[] = [];

  const profile = await createSpProfileApi(draft);
  // 409 = the profile already exists (an earlier attempt got this far).
  if (profile.error && profile.error.status !== 409) {
    return {
      ok: false,
      problems: [profile.error.message || "We couldn't create your provider profile."],
    };
  }

  const existing = await apiClient.get<Array<{ title: string }>>("/service-provider/services/me");
  if (existing.error || !existing.data) {
    problems.push("We couldn't check which services you already have, so none were added. Try again.");
  } else {
    const saved = new Set(existing.data.map((svc) => svc.title.trim().toLowerCase()));
    for (const svc of draft.services) {
      if (saved.has(svc.name.trim().toLowerCase())) continue;
      const res = await addSpDashboardServiceLive({
        name: svc.name,
        description: svc.description,
        categoryId: svc.categoryId || draft.category.primaryCategoryId || "",
        pricingModel: svc.pricingModel,
        price: svc.price,
        priceMax: svc.priceMax,
        durationMinutes: svc.durationMinutes,
        locationType: svc.locationType,
        images: svc.images,
      });
      if (!res.ok) problems.push(`"${svc.name}" wasn't saved: ${res.error ?? "unknown error"}`);
    }
  }

  const days = draft.availability?.days;
  if (days && days.some((d) => d.isAvailable)) {
    const res = await updateSpAvailabilityLive(days);
    if (!res.ok) problems.push(`Your weekly schedule wasn't saved: ${res.error ?? "unknown error"}`);
  }

  return { ok: problems.length === 0, problems };
}
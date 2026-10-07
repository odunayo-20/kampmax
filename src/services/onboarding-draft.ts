import { apiClient } from "@/lib/api-client";

// ============================================================
// ONBOARDING DRAFTS (live)
// ============================================================
//
// A wizard's progress lives on the server, one draft per role, so people can
// leave and come back on any device.
//   GET    /onboarding-drafts/:role
//   PUT    /onboarding-drafts/:role   { currentStep, data }
//   DELETE /onboarding-drafts/:role
// Loading and saving throw when the server says no, so a wizard never carries
// on as if its progress was kept when it wasn't.

export type OnboardingRole = "employer" | "freelancer" | "service-provider";

export interface SavedOnboardingDraft<T> {
  currentStep: number;
  data: T;
  updatedAt: string;
}

/** The saved draft for a role, or `null` when the person hasn't started. */
export async function loadOnboardingDraft<T>(role: OnboardingRole): Promise<SavedOnboardingDraft<T> | null> {
  const { data, error } = await apiClient.get<{ draft: SavedOnboardingDraft<T> | null }>(
    `/onboarding-drafts/${role}`
  );
  if (error) throw error;
  return data?.draft ?? null;
}

export async function saveOnboardingDraft(
  role: OnboardingRole,
  input: { currentStep: number; data: object }
): Promise<void> {
  const { error } = await apiClient.put(`/onboarding-drafts/${role}`, input);
  if (error) throw error;
}

/** Clears the draft once the profile exists. Returns whether it worked; failing is harmless. */
export async function discardOnboardingDraft(role: OnboardingRole): Promise<boolean> {
  const { error } = await apiClient.delete(`/onboarding-drafts/${role}`);
  return !error;
}

/** Blanks every inline picture (a `data:` URL) so it is not saved or sent. */
export function withoutInlineImages<T>(value: T): T {
  if (typeof value === "string") return (value.startsWith("data:") ? "" : value) as T;
  if (Array.isArray(value)) {
    return value
      .map((v) => withoutInlineImages(v))
      .filter((v) => v !== "") as unknown as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, withoutInlineImages(v)])
    ) as T;
  }
  return value;
}

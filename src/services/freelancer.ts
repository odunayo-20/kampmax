// ============================================================
// FREELANCER SERVICE  (Module 22 + Freelancer Marketplace)
// ============================================================
//
// This module has two responsibilities:
//
//  1. ONBOARDING (legacy mock path): draft persistence helpers used by
//     the onboarding wizard prior to backend connection.
//
//  2. PUBLIC FREELANCER BROWSE API: async wrappers over the NestJS backend.
//     These replace the mock data lookups previously used by the marketplace
//     browse pages. Every async function calls apiClient and maps backend
//     response shapes to the types used in the UI.
//
// SECURITY:
//   - Profile ownership is ALWAYS derived from the authenticated user
//     (getCurrentUser().id). The client never supplies freelancerId directly.
//   - Status, verification, completion %, and availability are backend-
//     authoritative. The frontend only displays the returned state.
//   - Public-browse endpoints are unauthenticated; private (me/*) require
//     a valid Bearer token, which the apiClient appends automatically.

import { getCurrentUser } from "@/services/users";
import {
  createFreelancerApplication,
  getFreelancerOnboardingDraft,
  saveFreelancerDraft,
  getFreelancerOnboardingStatus,
  submitFreelancerApplication,
} from "@/data/freelancer";
import type {
  FreelancerOnboardingDraft,
  FreelancerOnboardingStepId,
  FreelancerOnboardingStatus,
} from "@/types/freelancer";
import { FREELANCER_ONBOARDING_STEPS } from "@/types/freelancer";
import { apiClient } from "@/lib/api-client";
import type { ApiError } from "@/lib/api-client";

// ── Shared paginated-result type ────────────────────────────
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Backend response shapes (mirroring backend interfaces) ──

export interface FreelancerSkillSummary {
  skillId: string;
  name: string;
  slug: string;
}

export interface FreelancerPublicProfile {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  avatar: string | null;
  professionalTitle: string | null;
  bio: string | null;
  hourlyRate: number | null;
  currency: string;
  experienceLevel: string | null;
  availabilityStatus: string;
  verificationStatus: string;
  location: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  campusId: string | null;
  profileMediaId: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  yearsOfExperience: number | null;
  skills: FreelancerSkillSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface FreelancerPrivateProfile extends FreelancerPublicProfile {
  isPublic: boolean;
}

export interface FreelancerServicePackage {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  deliveryDays: number | null;
  revisions: number | null;
  features: string[] | null;
}

export interface FreelancerServiceCategory {
  id: string;
  name: string;
}

export interface FreelancerService {
  id: string;
  freelancerId: string;
  title: string;
  slug: string;
  description: string | null;
  category: FreelancerServiceCategory | null;
  startingPrice: number | null;
  currency: string;
  deliveryDays: number | null;
  status: string;
  isPublished: boolean;
  packages: FreelancerServicePackage[];
  createdAt: string;
  updatedAt: string;
}

export interface FreelancerPortfolioItem {
  id: string;
  title: string;
  description: string | null;
  projectUrl: string | null;
  technologies: string[] | null;
  completionDate: string | null;
  sortOrder: number;
  isPublic: boolean;
  media: { mediaId: string; position: number }[];
  createdAt: string;
  updatedAt: string;
}

// ── Query params for the public browse endpoint ──────────────

export interface FreelancerBrowseQuery {
  page?: number;
  limit?: number;
  q?: string;
  skills?: string;
  campusId?: string;
  experienceLevel?: string;
  availability?: string;
  minRate?: number;
  maxRate?: number;
}

// ── Result types ─────────────────────────────────────────────

export interface FreelancerBrowseResult {
  profiles: FreelancerPublicProfile[];
  total: number;
  page: number;
  totalPages: number;
  error: ApiError | null;
}

// ═══════════════════════════════════════════════════════════
// PUBLIC BROWSE API (async, backend-connected)
// ═══════════════════════════════════════════════════════════

/**
 * List public freelancer profiles with optional search and filters.
 * Endpoint: GET /freelancers
 */
export async function listPublicFreelancers(
  query: FreelancerBrowseQuery = {}
): Promise<FreelancerBrowseResult> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.q) params.set("q", query.q);
  if (query.skills) params.set("skills", query.skills);
  if (query.campusId) params.set("campusId", query.campusId);
  if (query.experienceLevel) params.set("experienceLevel", query.experienceLevel);
  if (query.availability) params.set("availability", query.availability);
  if (query.minRate !== undefined) params.set("minRate", String(query.minRate));
  if (query.maxRate !== undefined) params.set("maxRate", String(query.maxRate));

  const qs = params.toString();
  const path = `/freelancers${qs ? `?${qs}` : ""}`;

  const { data, error } = await apiClient.get<PaginatedResult<FreelancerPublicProfile>>(path);
  if (error) {
    return { profiles: [], total: 0, page: 1, totalPages: 1, error };
  }

  return {
    profiles: data.data ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    totalPages: data.totalPages ?? 1,
    error: null,
  };
}

/**
 * Fetch a single public freelancer profile by ID.
 * Endpoint: GET /freelancers/:id
 */
export async function getPublicFreelancerById(
  id: string
): Promise<{ profile: FreelancerPublicProfile | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<FreelancerPublicProfile>(`/freelancers/${id}`);
  if (error) return { profile: null, error };
  return { profile: data, error: null };
}

/**
 * Get the authenticated user's own private freelancer profile.
 * Endpoint: GET /freelancers/me
 */
export async function getMyFreelancerProfile(): Promise<{
  profile: FreelancerPrivateProfile | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.get<FreelancerPrivateProfile>("/freelancers/me");
  if (error) return { profile: null, error };
  return { profile: data, error: null };
}

/**
 * Update the authenticated user's freelancer profile.
 * Endpoint: PATCH /freelancers/me
 */
export async function updateMyFreelancerProfile(
  patch: Partial<FreelancerPrivateProfile>
): Promise<{ profile: FreelancerPrivateProfile | null; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<
    Partial<FreelancerPrivateProfile>,
    FreelancerPrivateProfile
  >("/freelancers/me", patch);
  if (error) return { profile: null, error };
  return { profile: data, error: null };
}

/**
 * Submit a verification request for the current user's freelancer profile.
 * Endpoint: POST /freelancers/me/verification
 */
export async function applyForFreelancerVerification(): Promise<{
  profile: FreelancerPrivateProfile | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<undefined, FreelancerPrivateProfile>(
    "/freelancers/me/verification"
  );
  if (error) return { profile: null, error };
  return { profile: data, error: null };
}

// ═══════════════════════════════════════════════════════════
// FREELANCER SERVICES (public browse)
// ═══════════════════════════════════════════════════════════

/**
 * List published freelancer services (public marketplace browse).
 * Endpoint: GET /services/public/
 */
export async function listPublicFreelancerServices(query: {
  page?: number;
  limit?: number;
  q?: string;
  categoryId?: string;
  freelancerId?: string;
} = {}): Promise<{
  services: FreelancerService[];
  total: number;
  page: number;
  totalPages: number;
  error: ApiError | null;
}> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.q) params.set("q", query.q);
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.freelancerId) params.set("freelancerId", query.freelancerId);

  const qs = params.toString();
  const path = `/services/public/${qs ? `?${qs}` : ""}`;

  const { data, error } = await apiClient.get<PaginatedResult<FreelancerService>>(path);
  if (error) return { services: [], total: 0, page: 1, totalPages: 1, error };

  return {
    services: data.data ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    totalPages: data.totalPages ?? 1,
    error: null,
  };
}

/**
 * Get a published freelancer service by slug.
 * Endpoint: GET /services/slug/:slug
 */
export async function getFreelancerServiceBySlug(
  slug: string
): Promise<{ service: FreelancerService | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<FreelancerService>(`/services/slug/${slug}`);
  if (error) return { service: null, error };
  return { service: data, error: null };
}

// ═══════════════════════════════════════════════════════════
// ONBOARDING HELPERS (mock/draft path — unchanged)
// ═══════════════════════════════════════════════════════════

function currentUserId(): string | null {
  const user = getCurrentUser();
  return user?.id ?? null;
}

/**
 * Ensures an application record exists for the current user.
 * Returns `{ created: true }` on first call (fresh entry page).
 */
export function createFlApplication(): { created: boolean } {
  const uid = currentUserId();
  if (!uid) return { created: false };
  const { created } = createFreelancerApplication(uid);
  return { created };
}

/**
 * Returns the current draft for the authenticated user, or null.
 */
export function getFlOnboardingDraft(): FreelancerOnboardingDraft | null {
  const uid = currentUserId();
  if (!uid) return null;
  return getFreelancerOnboardingDraft(uid);
}

/**
 * Persists draft changes (called on every step update + save-draft).
 */
export function saveFlDraft(draft: FreelancerOnboardingDraft): void {
  saveFreelancerDraft(draft);
}

/**
 * Returns the current onboarding status for the authenticated user.
 */
export function getFlOnboardingStatus(): FreelancerOnboardingStatus {
  const uid = currentUserId();
  if (!uid) return "DRAFT" as FreelancerOnboardingStatus;
  return getFreelancerOnboardingStatus(uid);
}

/**
 * Submits the freelancer profile for review.
 */
export function submitFlApplication(): { success: boolean; message: string } {
  const uid = currentUserId();
  if (!uid) return { success: false, message: "Not authenticated." };
  return submitFreelancerApplication(uid);
}

/**
 * Computes a simple completion percentage from the draft.
 * Backend would compute this; here we approximate for the UI.
 */
export function computeFlCompletion(draft: FreelancerOnboardingDraft | null): number {
  if (!draft) return 0;
  let filled = 0;
  const total = 10; // 10 sections

  if (draft.profile.headline?.trim() && draft.profile.bio?.trim()) filled++;
  if (draft.categories.length > 0 && draft.skills.length > 0) filled++;
  if (draft.experience.length > 0) filled++;
  if (draft.education.length > 0) filled++;
  if (draft.certifications.length > 0) filled++;
  if (draft.portfolio.length > 0) filled++;
  if (draft.rates.hourlyRate || draft.rates.projectRate) filled++;
  if (draft.availability.status) filled++;
  if (draft.preferences.workArrangements.length > 0) filled++;
  // review is always "available" once you reach it
  filled++;

  return Math.round((filled / total) * 100);
}

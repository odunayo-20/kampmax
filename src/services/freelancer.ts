
import type { FreelancerOnboardingDraft } from "@/types/freelancer";
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
  /** Backend FreelancerAvailabilityStatus: AVAILABLE | BUSY | UNAVAILABLE */
  availability?: string;
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
  if (query.q) params.set("search", query.q);
  if (query.skills) params.set("skills", query.skills);
  if (query.campusId) params.set("campusId", query.campusId);
  if (query.experienceLevel) params.set("experienceLevel", query.experienceLevel);
  if (query.availability) params.set("availabilityStatus", query.availability);

  const qs = params.toString();
  const path = `/freelancers${qs ? `?${qs}` : ""}`;

  // Backend shape: { items, meta: { total, page, limit, totalPages } }
  const { data, error } = await apiClient.get<{
    items: FreelancerPublicProfile[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>(path);
  if (error) {
    return { profiles: [], total: 0, page: 1, totalPages: 1, error };
  }

  return {
    profiles: data.items ?? [],
    total: data.meta?.total ?? 0,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
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
  patch: Partial<CreateFreelancerProfileDto>
): Promise<{ profile: FreelancerPrivateProfile | null; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<
    Partial<CreateFreelancerProfileDto>,
    FreelancerPrivateProfile
  >("/freelancers/me", patch);
  if (error) return { profile: null, error };
  return { profile: data, error: null };
}

// ═══════════════════════════════════════════════════════════
// ONBOARDING ASYNC API (backend-connected)
// ═══════════════════════════════════════════════════════════
//
// These async helpers call the real NestJS freelancer endpoints
// for the onboarding wizard. Backend failures are returned to the caller.

/** Flat shape the backend's CreateFreelancerProfileDto accepts — every
 * field is optional, but we still forward what the wizard collected so
 * the activated profile isn't blank. */
export interface CreateFreelancerProfileDto {
  professionalTitle?: string;
  bio?: string;
  hourlyRate?: number;
  campusId?: string;
  city?: string;
  websiteUrl?: string;
  availabilityStatus?: "AVAILABLE" | "BUSY" | "UNAVAILABLE";
  skills?: string[];
}

/**
 * Create a new freelancer profile on the backend — this IS the onboarding
 * completion step (POST /freelancers). No NIN/BVN/certificate is required
 * here; verification is a separate, optional flow.
 * Endpoint: POST /freelancers
 */
export async function createFlApplicationApi(
  dto: CreateFreelancerProfileDto = {}
): Promise<{
  created: boolean;
  profile: FreelancerPrivateProfile | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.post<CreateFreelancerProfileDto, FreelancerPrivateProfile>(
    "/freelancers",
    dto
  );
  if (!error && data) {
    return { created: true, profile: data, error: null };
  }
  return { created: false, profile: null, error };
}

/** Maps the onboarding wizard's draft into the flat backend DTO. */
export function freelancerDraftToCreateDto(
  draft: FreelancerOnboardingDraft
): CreateFreelancerProfileDto {
  return {
    professionalTitle: draft.profile?.headline?.trim() || undefined,
    bio: draft.profile?.bio?.trim() || undefined,
    hourlyRate: draft.rates?.hourlyRate,
    campusId: draft.profile?.campusId || undefined,
    city: draft.profile?.city?.trim() || undefined,
    skills: draft.skills?.length ? draft.skills : undefined,
  };
}

/**
 * Fetch the authenticated user's own private freelancer profile (= current draft state).
 * Endpoint: GET /freelancers/me
 */
export async function getFlOnboardingDraftApi(): Promise<{
  profile: FreelancerPrivateProfile | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.get<FreelancerPrivateProfile>("/freelancers/me");
  if (!error && data) return { profile: data, error: null };
  return { profile: null, error };
}

/**
 * Persist draft changes to the backend.
 * Endpoint: PATCH /freelancers/me
 */
export async function saveFlDraftApi(
  patch: Partial<CreateFreelancerProfileDto>
): Promise<{ profile: FreelancerPrivateProfile | null; error: ApiError | null }> {
  return updateMyFreelancerProfile(patch);
}

// ═══════════════════════════════════════════════════════════
// PROFILE SECTIONS (experience / education / certifications)
// Endpoints: /freelancers/me/{experience,education,certifications}
// ═══════════════════════════════════════════════════════════

type ProfileSections = Pick<
  FreelancerOnboardingDraft,
  "experience" | "education" | "certifications"
>;

/** Loads sections for `owner` ("me") or a public freelancer profile id. */
export async function loadProfileSections(owner = "me"): Promise<ProfileSections | null> {
  const [exp, edu, cert] = await Promise.all([
    apiClient.get<any[]>(`/freelancers/${owner}/experience`),
    apiClient.get<any[]>(`/freelancers/${owner}/education`),
    apiClient.get<any[]>(`/freelancers/${owner}/certifications`),
  ]);
  if (exp.error || edu.error || cert.error) return null;

  return {
    experience: (exp.data ?? []).map((e) => ({
      id: e.id,
      jobTitle: e.jobTitle,
      company: e.company,
      startDate: e.startDate,
      endDate: e.endDate ?? undefined,
      currentlyWorking: e.currentlyWorking,
      location: e.location ?? undefined,
      employmentType: e.employmentType,
      description: e.description ?? "",
    })),
    education: (edu.data ?? []).map((e) => ({
      id: e.id,
      institution: e.institution,
      qualification: e.qualification,
      fieldOfStudy: e.fieldOfStudy,
      startYear: e.startYear,
      endYear: e.endYear ?? undefined,
      description: e.description ?? undefined,
    })),
    certifications: (cert.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      issuingOrganization: c.issuingOrganization,
      issueDate: c.issueDate,
      expirationDate: c.expirationDate ?? undefined,
      credentialId: c.credentialId ?? undefined,
      credentialUrl: c.credentialUrl ?? undefined,
    })),
  };
}

async function replaceSection(
  path: string,
  bodies: Record<string, unknown>[]
): Promise<ApiError | null> {
  const existing = await apiClient.get<{ id: string }[]>(path);
  if (existing.error) return existing.error;
  for (const row of existing.data ?? []) {
    const { error } = await apiClient.delete(`${path}/${row.id}`);
    if (error) return error;
  }
  for (const [index, body] of bodies.entries()) {
    const { error } = await apiClient.post(path, { ...body, sortOrder: index });
    if (error) return error;
  }
  return null;
}

const clean = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== "")
  );

/** Persists the wizard's sections to the backend (draft is source of truth). */
export async function saveProfileSections(
  draft: FreelancerOnboardingDraft
): Promise<ApiError | null> {
  return (
    (await replaceSection(
      "/freelancers/me/experience",
      (draft.experience ?? []).map((e) =>
        clean({
          jobTitle: e.jobTitle,
          company: e.company,
          startDate: e.startDate,
          endDate: e.currentlyWorking ? undefined : e.endDate,
          currentlyWorking: e.currentlyWorking,
          location: e.location,
          employmentType: e.employmentType,
          description: e.description,
        })
      )
    )) ??
    (await replaceSection(
      "/freelancers/me/education",
      (draft.education ?? []).map((e) =>
        clean({
          institution: e.institution,
          qualification: e.qualification,
          fieldOfStudy: e.fieldOfStudy,
          startYear: e.startYear,
          endYear: e.endYear,
          description: e.description,
        })
      )
    )) ??
    (await replaceSection(
      "/freelancers/me/certifications",
      (draft.certifications ?? []).map((c) =>
        clean({
          name: c.name,
          issuingOrganization: c.issuingOrganization,
          issueDate: c.issueDate,
          expirationDate: c.expirationDate,
          credentialId: c.credentialId,
          credentialUrl: c.credentialUrl,
        })
      )
    ))
  );
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

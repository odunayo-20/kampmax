// ============================================================
// FREELANCER SERVICES & PORTFOLIO SERVICE  (Module 23B)
// ============================================================
//
// Mirrors future NestJS endpoints (documented at the bottom of this file).
// SECURITY MODEL:
//   - Ownership is ALWAYS derived from getCurrentUser().id (IDOR/BOLA-safe);
//     the client never supplies ownerId — mass-assignment is impossible because
//     we build stored services from a whitelisted FreelancerServiceInput.
//   - Service status/visibility are backend-owned: only the store's transition
//     functions write them. The frontend requests an action (publish/pause/
//     archive) and the store resolves the resulting state.
//   - External URLs (websites, cover images) are validated against an
//     allowlist of schemes to reject javascript:/data:/vbscript:.
//   - Validation is authoritative here (mirroring backend DTOs); the UI also
//     validates for UX but never trusts the input blindly.

import { getCurrentUser } from "@/services/users";
import { apiClient } from "@/lib/api-client";
import {
  approveServiceRecord,
  archiveServiceRecord,
  createServiceRecord,
  deleteServiceRecord,
  ensureOwnerRecord,
  getServiceById,
  getServicesRecord,
  pauseServiceRecord,
  publishServiceRecord,
  resumeServiceRecord,
  updateServiceRecord,
} from "@/data/freelancer-services";
import {
  getFreelancerOnboardingDraft,
  saveFreelancerDraft,
} from "@/data/freelancer";
import { pushUserNotification } from "@/services/notifications";
import type {
  FreelancerService,
  FreelancerServiceInput,
  FreelancerServicePage,
  FreelancerServiceQuery,
  FreelancerServiceResult,
  FreelancerServiceResultCode,
} from "@/types/freelancer-services";
import { FREELANCER_SERVICE_RESULT, FREELANCER_SERVICE_STATUS } from "@/types/freelancer-services";
import type { FreelancerPortfolioItem } from "@/types/freelancer";
import { FREELANCER_SERVICE_SAFE_SCHEMES } from "@/config/freelancer-services";

// ── Owner context ───────────────────────────────────────────

function currentUserId(): string | null {
  const user = getCurrentUser();
  return user?.id ?? null;
}

function ok(message: string, extra?: Partial<FreelancerServiceResult>): FreelancerServiceResult {
  return { ok: true, code: FREELANCER_SERVICE_RESULT.OK, message, ...extra };
}

function fail(
  code: FreelancerServiceResultCode,
  message: string
): FreelancerServiceResult {
  return { ok: false, code, message };
}

function isSafeExternalUrl(value: string | undefined | null): boolean {
  if (!value) return true;
  try {
    const url = new URL(value, "https://kampmax.ng");
    return FREELANCER_SERVICE_SAFE_SCHEMES.includes(
      url.protocol as (typeof FREELANCER_SERVICE_SAFE_SCHEMES)[number]
    );
  } catch {
    return false;
  }
}

// ── Validation (mirrors backend DTO validation) ─────────────

interface ValidationIssue {
  field: string;
  message: string;
}

function validateServiceInput(input: FreelancerServiceInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!input.title.trim()) issues.push({ field: "title", message: "Title is required." });
  else if (input.title.trim().length > 120)
    issues.push({ field: "title", message: "Title must be 120 characters or fewer." });

  if (!input.categoryId) issues.push({ field: "categoryId", message: "Category is required." });

  if (input.skills.length === 0)
    issues.push({ field: "skills", message: "Select at least one skill." });

  if (input.shortDescription.trim().length === 0)
    issues.push({ field: "shortDescription", message: "Short description is required." });
  else if (input.shortDescription.trim().length > 160)
    issues.push({ field: "shortDescription", message: "Short description must be 160 characters or fewer." });

  if (input.description.trim().length === 0)
    issues.push({ field: "description", message: "Description is required." });

  if (input.price !== undefined && input.price < 0)
    issues.push({ field: "price", message: "Price cannot be negative." });
  if (input.priceMax !== undefined && input.priceMax < 0)
    issues.push({ field: "priceMax", message: "Maximum price cannot be negative." });
  if (
    input.price !== undefined &&
    input.priceMax !== undefined &&
    input.priceMax < input.price
  ) {
    issues.push({ field: "priceMax", message: "Maximum price must be at least the base price." });
  }
  if (input.deliveryValue !== undefined && input.deliveryValue <= 0)
    issues.push({ field: "deliveryValue", message: "Delivery estimate must be greater than zero." });

  // Reject dangerously-schemed cover images.
  if (input.coverImageUrl && !isSafeExternalUrl(input.coverImageUrl)) {
    issues.push({ field: "coverImageUrl", message: "Cover image uses an unsupported URL scheme." });
  }

  return issues;
}

// ── My Services API ─────────────────────────────────────────

/** Returns the current user's services (optionally filtered). */
export function getMyServices(query: FreelancerServiceQuery = {}): FreelancerService[] {
  const uid = currentUserId();
  if (!uid) return [];
  const list = getServicesRecord(uid);
  let result = list;
  if (query.status && query.status !== "all") {
    result = result.filter((s) => s.status === query.status);
  }
  if (query.search && query.search.trim()) {
    const q = query.search.trim().toLowerCase();
    result = result.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.shortDescription.toLowerCase().includes(q) ||
        s.skills.some((k) => k.toLowerCase().includes(q))
    );
  }
  return result;
}

export function getMyServicesPage(query: FreelancerServiceQuery = {}): FreelancerServicePage {
  const filtered = getMyServices(query);
  return { items: filtered, total: filtered.length };
}

// ── Public services reader (Module 32) ──────────────────────
// Public freelancer profile preview: ONLY published + visible services are
// surfaced. Ownership is passed by the server page (slug → owner), never taken
// from the client. Status/visibility remain backend-authoritative.
export function getPublicFreelancerServices(userId: string): FreelancerService[] {
  if (!userId) return [];
  return getServicesRecord(userId).filter(
    (s) =>
      s.status === FREELANCER_SERVICE_STATUS.PUBLISHED &&
      s.visibility === "visible"
  );
}

export function getMyService(serviceId: string): FreelancerService | null {
  const uid = currentUserId();
  if (!uid) return null;
  return getServiceById(uid, serviceId);
}

/** Creates a service as a backend-owned DRAFT. */
export function createMyService(input: FreelancerServiceInput): FreelancerServiceResult {
  const uid = currentUserId();
  if (!uid) return fail(FREELANCER_SERVICE_RESULT.UNAUTHORIZED, "Not authenticated.");
  const issues = validateServiceInput(input);
  if (issues.length > 0)
    return { ok: false, code: FREELANCER_SERVICE_RESULT.VALIDATION, message: issues[0].message };
  const service = createServiceRecord(uid, input);
  return ok("Service draft created.", { service });
}

/** Updates an existing owned service (draft/published business fields). */
export function updateMyService(serviceId: string, input: FreelancerServiceInput): FreelancerServiceResult {
  const uid = currentUserId();
  if (!uid) return fail(FREELANCER_SERVICE_RESULT.UNAUTHORIZED, "Not authenticated.");
  const existing = getServiceById(uid, serviceId);
  if (!existing) return fail(FREELANCER_SERVICE_RESULT.NOT_FOUND, "Service not found.");
  const issues = validateServiceInput(input);
  if (issues.length > 0)
    return { ok: false, code: FREELANCER_SERVICE_RESULT.VALIDATION, message: issues[0].message };
  // Rejected/draft services can be edited freely; published services keep
  // editing their business fields (pricing/description) as allowed.
  const updated = updateServiceRecord(uid, serviceId, input);
  if (!updated) return fail(FREELANCER_SERVICE_RESULT.NOT_FOUND, "Service not found.");
  return ok("Service updated.", { service: updated });
}

/** Requests publication — the backend resolves the resulting status. */
export function publishMyService(serviceId: string): FreelancerServiceResult {
  const uid = currentUserId();
  if (!uid) return fail(FREELANCER_SERVICE_RESULT.UNAUTHORIZED, "Not authenticated.");
  const res = publishServiceRecord(uid, serviceId);
  if (!res.ok) return fail(FREELANCER_SERVICE_RESULT.CONFLICT, "This service cannot be published from its current state.");
  pushUserNotification({
    userId: uid,
    type: "account",
    category: "marketplace",
    title: "Service submitted for review",
    message: "Your service is now being reviewed by our team.",
    actionUrl: "/freelancer/services",
  });
  return ok("Service submitted for review.", { status: res.status });
}

/** Simulates the backend completing review (prototype only). */
export function approveMyServiceForDemo(serviceId: string): FreelancerServiceResult {
  const uid = currentUserId();
  if (!uid) return fail(FREELANCER_SERVICE_RESULT.UNAUTHORIZED, "Not authenticated.");
  const res = approveServiceRecord(uid, serviceId);
  if (!res.ok) return fail(FREELANCER_SERVICE_RESULT.CONFLICT, "This service cannot be approved from its current state.");
  return ok("Service published.", { status: res.status });
}

export function pauseMyService(serviceId: string): FreelancerServiceResult {
  const uid = currentUserId();
  if (!uid) return fail(FREELANCER_SERVICE_RESULT.UNAUTHORIZED, "Not authenticated.");
  const res = pauseServiceRecord(uid, serviceId);
  if (!res.ok) return fail(FREELANCER_SERVICE_RESULT.CONFLICT, "Only published services can be paused.");
  return ok("Service paused.", { status: res.status });
}

export function resumeMyService(serviceId: string): FreelancerServiceResult {
  const uid = currentUserId();
  if (!uid) return fail(FREELANCER_SERVICE_RESULT.UNAUTHORIZED, "Not authenticated.");
  const res = resumeServiceRecord(uid, serviceId);
  if (!res.ok) return fail(FREELANCER_SERVICE_RESULT.CONFLICT, "Only paused services can be resumed.");
  return ok("Service submitted for review.", { status: res.status });
}

export function archiveMyService(serviceId: string): FreelancerServiceResult {
  const uid = currentUserId();
  if (!uid) return fail(FREELANCER_SERVICE_RESULT.UNAUTHORIZED, "Not authenticated.");
  const res = archiveServiceRecord(uid, serviceId);
  if (!res.ok) return fail(FREELANCER_SERVICE_RESULT.CONFLICT, "This service cannot be archived from its current state.");
  return ok("Service archived.", { status: res.status });
}

export function deleteMyService(serviceId: string): FreelancerServiceResult {
  const uid = currentUserId();
  if (!uid) return fail(FREELANCER_SERVICE_RESULT.UNAUTHORIZED, "Not authenticated.");
  const deleted = deleteServiceRecord(uid, serviceId);
  if (!deleted) return fail(FREELANCER_SERVICE_RESULT.NOT_FOUND, "Service not found.");
  return ok("Service deleted.");
}

// ── Portfolio API (backend: /portfolio) ─────────────────────
// Real persistence via the NestJS portfolio module. The backend stores a
// full date and has no category/cover-image URL, so:
//   - completionDate is sent as YYYY-MM-01 and read back as YYYY-MM
//   - categoryId / imageUrl are not persisted server-side yet

export interface BackendPortfolioItem {
  id: string;
  title: string;
  description: string | null;
  projectUrl: string | null;
  technologies: string[] | null;
  completionDate: string | null;
  isPublic: boolean;
}

export function fromBackendPortfolio(p: BackendPortfolioItem): FreelancerPortfolioItem {
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? "",
    skills: p.technologies ?? [],
    externalUrl: p.projectUrl ?? undefined,
    completionDate: p.completionDate ? p.completionDate.slice(0, 7) : undefined,
    visible: p.isPublic,
  };
}

function toBackendPortfolio(input: Partial<Omit<FreelancerPortfolioItem, "id">>) {
  return {
    title: input.title,
    description: input.description || undefined,
    projectUrl: input.externalUrl || undefined,
    technologies: input.skills,
    completionDate: input.completionDate ? `${input.completionDate}-01` : undefined,
    isPublic: input.visible,
  };
}

function apiFail(error: { status?: number; message?: string }): FreelancerServiceResult {
  if (error.status === 401) return fail(FREELANCER_SERVICE_RESULT.UNAUTHORIZED, "Not authenticated.");
  if (error.status === 404) return fail(FREELANCER_SERVICE_RESULT.NOT_FOUND, error.message || "Portfolio project not found.");
  return fail(FREELANCER_SERVICE_RESULT.NOT_FOUND, error.message || "Something went wrong. Please try again.");
}

export async function fetchMyPortfolio(): Promise<{
  items: FreelancerPortfolioItem[];
  error: string | null;
}> {
  const { data, error } = await apiClient.get<{ items: BackendPortfolioItem[] }>("/portfolio/me?limit=100");
  if (error) return { items: [], error: error.message || "Couldn't load your portfolio." };
  return { items: (data?.items ?? []).map(fromBackendPortfolio), error: null };
}

export async function fetchMyPortfolioItem(itemId: string): Promise<FreelancerPortfolioItem | null> {
  const { items } = await fetchMyPortfolio();
  return items.find((p) => p.id === itemId) ?? null;
}

export async function createMyPortfolioItem(
  input: Omit<FreelancerPortfolioItem, "id">
): Promise<FreelancerServiceResult> {
  const { error } = await apiClient.post("/portfolio", toBackendPortfolio(input));
  return error ? apiFail(error) : ok("Portfolio project created.");
}

export async function updateMyPortfolioItem(
  itemId: string,
  input: Omit<FreelancerPortfolioItem, "id">
): Promise<FreelancerServiceResult> {
  const { error } = await apiClient.patch(`/portfolio/${itemId}`, toBackendPortfolio(input));
  return error ? apiFail(error) : ok("Portfolio project updated.");
}

/** Toggles a portfolio item's public visibility. */
export async function setMyPortfolioItemVisibility(
  itemId: string,
  visible: boolean
): Promise<FreelancerServiceResult> {
  const { error } = await apiClient.patch(`/portfolio/${itemId}`, { isPublic: visible });
  return error ? apiFail(error) : ok("Portfolio visibility updated.");
}

export async function deleteMyPortfolioItem(itemId: string): Promise<FreelancerServiceResult> {
  const { error } = await apiClient.delete(`/portfolio/${itemId}`);
  return error ? apiFail(error) : ok("Portfolio project deleted.");
}

// ── Aggregate (dashboard integration) ───────────────────────

export function getFreelancerContentSummary(): {
  services: { total: number; published: number; draft: number };
} {
  const services = getMyServices();
  return {
    services: {
      total: services.length,
      published: services.filter((s) => s.status === FREELANCER_SERVICE_STATUS.PUBLISHED).length,
      draft: services.filter(
        (s) =>
          s.status === FREELANCER_SERVICE_STATUS.DRAFT ||
          s.status === FREELANCER_SERVICE_STATUS.REJECTED
      ).length,
    },
  };
}

// ── Expected backend endpoints (service layer mirrors these) ──
//
//   GET   /freelancer/services          (?status&search)
//   GET   /freelancer/services/:id
//   POST  /freelancer/services          (create draft)
//   PUT   /freelancer/services/:id      (update business fields)
//   POST  /freelancer/services/:id/publish
//   POST  /freelancer/services/:id/pause
//   POST  /freelancer/services/:id/resume
//   POST  /freelancer/services/:id/archive
//   DELETE /freelancer/services/:id
//   GET   /freelancer/portfolio         (from freelancer profile store)
//   GET   /freelancer/portfolio/:id
//   POST  /freelancer/portfolio         (create project)
//   PUT   /freelancer/portfolio/:id     (update project)
//   DELETE /freelancer/portfolio/:id
//   GET   /freelancer/content/summary   (dashboard counts)

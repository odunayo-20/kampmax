// ============================================================
// FREELANCER SERVICES & PORTFOLIO  (live)
// ============================================================
//
// A freelancer's services and portfolio are read and written on the server.
// Ownership comes from the signed-in account, and a service's status is
// decided there: this module asks to publish, pause or archive and reports
// what the server answers. Nothing is kept in the browser, and a failure is
// reported as a failure.

import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  FreelancerService,
  FreelancerServiceInput,
  FreelancerServicePage,
  FreelancerServiceQuery,
  FreelancerServiceResult,
  FreelancerServiceResultCode,
  FreelancerServiceStatus,
} from "@/types/freelancer-services";
import {
  FREELANCER_SERVICE_RESULT,
  FREELANCER_SERVICE_STATUS,
} from "@/types/freelancer-services";
import type { FreelancerPortfolioItem } from "@/types/freelancer";
import { FREELANCER_SERVICE_SAFE_SCHEMES } from "@/config/freelancer-services";

function ok(message: string, extra?: Partial<FreelancerServiceResult>): FreelancerServiceResult {
  return { ok: true, code: FREELANCER_SERVICE_RESULT.OK, message, ...extra };
}

function fail(code: FreelancerServiceResultCode, message: string): FreelancerServiceResult {
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

// ── Validation (the server checks again) ────────────────────

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
  if (input.price !== undefined && input.priceMax !== undefined && input.priceMax < input.price) {
    issues.push({ field: "priceMax", message: "Maximum price must be at least the base price." });
  }
  if (input.deliveryValue !== undefined && input.deliveryValue <= 0)
    issues.push({ field: "deliveryValue", message: "Delivery estimate must be greater than zero." });

  if (input.coverImageUrl && !isSafeExternalUrl(input.coverImageUrl)) {
    issues.push({ field: "coverImageUrl", message: "Cover image uses an unsupported URL scheme." });
  }
  return issues;
}

// ── Server shape <-> editor shape ───────────────────────────

interface BackendService {
  id: string;
  freelancerId: string;
  title: string;
  slug: string;
  description: string | null;
  category: { id: string; name: string } | null;
  startingPrice: number | null;
  priceMax: number | null;
  deliveryDays: number | null;
  deliveryValue: number | null;
  deliveryUnit: "HOURS" | "DAYS" | "WEEKS";
  pricingModel: "FIXED" | "STARTING_AT" | "HOURLY" | "PROJECT";
  shortDescription: string | null;
  skills: string[];
  revisions: number | null;
  deliverables: string[];
  coverImageUrl: string | null;
  status: "DRAFT" | "PUBLISHED" | "PAUSED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

const STATUS_FROM_SERVER: Record<BackendService["status"], FreelancerServiceStatus> = {
  DRAFT: FREELANCER_SERVICE_STATUS.DRAFT,
  PUBLISHED: FREELANCER_SERVICE_STATUS.PUBLISHED,
  PAUSED: FREELANCER_SERVICE_STATUS.PAUSED,
  ARCHIVED: FREELANCER_SERVICE_STATUS.ARCHIVED,
};

export function fromBackendService(b: BackendService): FreelancerService {
  return {
    id: b.id,
    userId: b.freelancerId,
    title: b.title,
    categoryId: b.category?.id ?? "",
    skills: b.skills ?? [],
    shortDescription: b.shortDescription ?? "",
    description: b.description ?? "",
    pricing: b.pricingModel.toLowerCase() as FreelancerService["pricing"],
    price: b.startingPrice ?? undefined,
    priceMax: b.priceMax ?? undefined,
    deliveryValue: b.deliveryValue ?? b.deliveryDays ?? undefined,
    deliveryUnit: b.deliveryUnit.toLowerCase() as FreelancerService["deliveryUnit"],
    revisions: b.revisions ?? undefined,
    deliverables: b.deliverables ?? [],
    coverImageUrl: b.coverImageUrl ?? undefined,
    status: STATUS_FROM_SERVER[b.status] ?? FREELANCER_SERVICE_STATUS.DRAFT,
    visibility: b.status === "PUBLISHED" ? "visible" : "hidden",
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

function toBackendBody(input: FreelancerServiceInput) {
  const has = (v: unknown) => v !== undefined && v !== null && v !== "";
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    shortDescription: input.shortDescription.trim(),
    categoryId: input.categoryId,
    skills: input.skills,
    pricingModel: input.pricing.toUpperCase(),
    startingPrice: has(input.price) ? input.price : undefined,
    priceMax: has(input.priceMax) ? input.priceMax : undefined,
    deliveryValue: has(input.deliveryValue) ? input.deliveryValue : undefined,
    deliveryUnit: input.deliveryUnit.toUpperCase(),
    revisions: has(input.revisions) ? input.revisions : undefined,
    deliverables: input.deliverables,
    coverImageUrl: has(input.coverImageUrl) ? input.coverImageUrl : undefined,
  };
}

function serviceFail(error: ApiError): FreelancerServiceResult {
  if (error.status === 401) return fail(FREELANCER_SERVICE_RESULT.UNAUTHORIZED, "Please sign in again.");
  if (error.status === 404) return fail(FREELANCER_SERVICE_RESULT.NOT_FOUND, "Service not found.");
  if (error.status === 409) return fail(FREELANCER_SERVICE_RESULT.CONFLICT, error.message || "That conflicts with another service.");
  return fail(FREELANCER_SERVICE_RESULT.VALIDATION, error.message || "Something went wrong. Please try again.");
}

// ── My Services ─────────────────────────────────────────────

/** The signed-in freelancer's services, newest first. Throws a message the page can show. */
export async function fetchMyServices(query: FreelancerServiceQuery = {}): Promise<FreelancerServicePage> {
  const status =
    query.status && query.status !== "all"
      ? ({ draft: "DRAFT", published: "PUBLISHED", paused: "PAUSED", archived: "ARCHIVED" } as Record<string, string>)[query.status]
      : undefined;
  // The server has no "submitted/under review/rejected": those tabs are empty by design.
  if (query.status && query.status !== "all" && !status) return { items: [], total: 0 };

  const qs = new URLSearchParams({ limit: "100" });
  if (status) qs.set("status", status);
  if (query.search?.trim()) qs.set("search", query.search.trim());
  const { data, error } = await apiClient.get<{ items: BackendService[]; meta: { total: number } }>(`/services/me?${qs}`);
  if (error || !data) throw new Error(error?.message || "Could not load your services.");
  return { items: data.items.map(fromBackendService), total: data.meta?.total ?? data.items.length };
}

/** One of your services; null when it does not exist or is not yours. */
export async function fetchMyService(serviceId: string): Promise<FreelancerService | null> {
  const { data, error } = await apiClient.get<BackendService>(`/services/me/${serviceId}`);
  if (data) return fromBackendService(data);
  if (error?.status === 404 || error?.status === 400) return null;
  throw new Error(error?.message || "Could not load this service.");
}

/** Creates a service as a draft. */
export async function createMyService(input: FreelancerServiceInput): Promise<FreelancerServiceResult> {
  const issues = validateServiceInput(input);
  if (issues.length > 0) return fail(FREELANCER_SERVICE_RESULT.VALIDATION, issues[0].message);
  const { data, error } = await apiClient.post<ReturnType<typeof toBackendBody>, BackendService>("/services", toBackendBody(input));
  if (error || !data) return serviceFail(error ?? (new Error("No response") as ApiError));
  return ok("Service draft created.", { service: fromBackendService(data) });
}

export async function updateMyService(serviceId: string, input: FreelancerServiceInput): Promise<FreelancerServiceResult> {
  const issues = validateServiceInput(input);
  if (issues.length > 0) return fail(FREELANCER_SERVICE_RESULT.VALIDATION, issues[0].message);
  const { data, error } = await apiClient.patch<ReturnType<typeof toBackendBody>, BackendService>(`/services/${serviceId}`, toBackendBody(input));
  if (error || !data) return serviceFail(error ?? (new Error("No response") as ApiError));
  return ok("Service updated.", { service: fromBackendService(data) });
}

async function transition(path: string, message: string): Promise<FreelancerServiceResult> {
  const { data, error } = await apiClient.post<undefined, BackendService>(path);
  if (error || !data) return serviceFail(error ?? (new Error("No response") as ApiError));
  return ok(message, { status: STATUS_FROM_SERVER[data.status], service: fromBackendService(data) });
}

/** Publishes the service so clients can find it. */
export const publishMyService = (serviceId: string) => transition(`/services/${serviceId}/publish`, "Service published.");
export const resumeMyService = (serviceId: string) => transition(`/services/${serviceId}/publish`, "Service is live again.");
export const pauseMyService = (serviceId: string) => transition(`/services/${serviceId}/pause`, "Service paused.");

/** Archives the service; it is hidden but kept. */
export async function archiveMyService(serviceId: string): Promise<FreelancerServiceResult> {
  const { error } = await apiClient.delete(`/services/${serviceId}`);
  return error ? serviceFail(error) : ok("Service archived.", { status: FREELANCER_SERVICE_STATUS.ARCHIVED });
}

/** The server archives rather than erases, so "delete" is the same as archive. */
export const deleteMyService = archiveMyService;

/** Published services of one freelancer (by profile id), for their public page. */
export async function fetchPublicFreelancerServices(freelancerId: string): Promise<FreelancerService[]> {
  const { data, error } = await apiClient.get<{ items: BackendService[] }>(
    `/services/public/?freelancerId=${encodeURIComponent(freelancerId)}&limit=50`
  );
  if (error || !data) return [];
  return data.items.map(fromBackendService);
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

// ── Dashboard counts ────────────────────────────────────────

export async function fetchFreelancerContentSummary(): Promise<{
  services: { total: number; published: number; draft: number };
}> {
  const { items } = await fetchMyServices();
  return {
    services: {
      total: items.length,
      published: items.filter((s) => s.status === FREELANCER_SERVICE_STATUS.PUBLISHED).length,
      draft: items.filter((s) => s.status === FREELANCER_SERVICE_STATUS.DRAFT).length,
    },
  };
}


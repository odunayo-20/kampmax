import { apiClient } from "@/lib/api-client";
import type {
  ServiceProviderOnboardingDraft,
  ServiceProviderOnboardingDocument,
  ServiceProviderOnboardingSummary,
  ServiceProviderProfile,
  ServiceProviderServiceDraft,
  ServiceProviderPortfolioItemDraft,
  ServiceProviderOnboardingStatus,
  ServiceProviderOnboardingStepId,
  ServiceProviderSubmitResult,
  ServiceProviderDocumentStatus,
  ServiceProviderServiceStatus,
  ServiceProviderType,
  ServiceProviderLocationType,
  ServiceProviderPricingModel,
  ServiceProviderBookingPreference,
  ServiceProviderVerificationStatus,
} from "@/types/service-provider";
import {
  SERVICE_PROVIDER_ONBOARDING_STATUS,
  SERVICE_PROVIDER_ONBOARDING_STEP,
  SERVICE_PROVIDER_ONBOARDING_STEPS,
  SERVICE_PROVIDER_SUBMIT_RESULT,
  SERVICE_PROVIDER_DOCUMENT_STATUS,
  SERVICE_PROVIDER_VERIFICATION_STATUS,
  SERVICE_PROVIDER_SERVICE_STATUS,
  SERVICE_PROVIDER_TYPE,
  SERVICE_PROVIDER_LOCATION_TYPE,
  SERVICE_PROVIDER_PRICING_MODEL,
  SERVICE_PROVIDER_BOOKING_PREFERENCE,
  BLOCKING_SP_ONBOARDING_STATUSES,
} from "@/types/service-provider";
import { getCurrentUser } from "@/services/users";
import { spOnboardingStore, initialSpDraft, spDocumentRequirements, serviceProviderProfiles, getSpProfileByUserId } from "@/data/service-provider";
import { categories } from "@/data/categories";

// ============================================================
// SERVICE PROVIDER ONBOARDING SERVICE LAYER
// ============================================================
//
// Isolates all service-provider onboarding access behind a single module that maps 1:1
// to a future backend API:
//   GET    /me/service-provider/onboarding            → status + resume
//   POST   /me/service-provider/onboarding            → create application
//   PATCH  /me/service-provider/onboarding            → save draft
//   POST   /me/service-provider/onboarding/documents  → upload/replace a document
//   GET    /me/service-provider/onboarding/documents  → document requirements + state
//   POST   /me/service-provider/onboarding/verify     → verification submission
//   POST   /me/service-provider/onboarding/submit     → submit for review
//
// AUTHORIZATION: ownership is ALWAYS derived from the authenticated identity
// (getCurrentUser().id). We never trust providerId / userId / applicationId
// supplied by the client. Every application is keyed by owner.
//
// SECURITY: this layer never decides approval, verification, document
// approval, or professional verification. Those are backend/admin decisions. It only
// reports whatever status the backend returns and never exposes internal
// notes, risk scores, public document URLs, or raw sensitive data.

// Owner-scoped store. In production this is the backend; here we keep an
// in-memory map keyed by the authenticated user id to model ownership.
type OwnerStore = Record<string, ServiceProviderOnboardingDraft>;
const store: OwnerStore = {
  [spOnboardingStore.draft.userId]: { ...spOnboardingStore.draft },
};

function ownerId(): string {
  // Derive ownership from the authenticated identity — never trust client.
  return getCurrentUser().id;
}

function scramble(current: ServiceProviderOnboardingDraft): void {
  current.updatedAt = new Date().toISOString();
}

// ── Status & summary ─────────────────────────────────────────

export function getSpOnboardingSummary(): ServiceProviderOnboardingSummary {
  const uid = ownerId();
  const app = store[uid];
  if (!app) {
    return {
      userId: uid,
      hasServiceProviderProfile: false,
      status: null,
      currentStep: null,
    };
  }
  // Check if user has an approved profile
  const profile = getSpProfileByUserId(uid);
  return {
    userId: uid,
    hasServiceProviderProfile: !!profile,
    status: app.status,
    currentStep: app.currentStep,
    displayName: app.profile.displayName || app.provider.displayName,
    resumePath: "/onboarding/service-provider/1",
  };
}

export function getSpOnboardingStatus(): ServiceProviderOnboardingStatus | null {
  return store[ownerId()]?.status ?? null;
}

export function getSpOnboardingDraft(): ServiceProviderOnboardingDraft | null {
  const app = store[ownerId()];
  if (!app) return null;
  return cloneSafe(app);
}

/** Deep-ish clone so callers can't mutate the store accidentally. */
function cloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function getSpDocumentRequirements() {
  return cloneSafe(spDocumentRequirements);
}

// ── Create / update (save progress) ──────────────────────────

export function createSpApplication(): { created: boolean; id: string } {
  const uid = ownerId();
  if (store[uid]) return { created: false, id: store[uid].applicationId ?? "" };
  const now = new Date().toISOString();
  const app: ServiceProviderOnboardingDraft = {
    applicationId: `sp_app_${uid}_${Date.now()}`,
    userId: uid,
    status: SERVICE_PROVIDER_ONBOARDING_STATUS.DRAFT,
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
      days: [
        { dayIndex: 0, label: "Monday", isAvailable: true, openTime: "09:00", closeTime: "18:00" },
        { dayIndex: 1, label: "Tuesday", isAvailable: true, openTime: "09:00", closeTime: "18:00" },
        { dayIndex: 2, label: "Wednesday", isAvailable: true, openTime: "09:00", closeTime: "18:00" },
        { dayIndex: 3, label: "Thursday", isAvailable: true, openTime: "09:00", closeTime: "18:00" },
        { dayIndex: 4, label: "Friday", isAvailable: true, openTime: "09:00", closeTime: "18:00" },
        { dayIndex: 5, label: "Saturday", isAvailable: true, openTime: "10:00", closeTime: "16:00" },
        { dayIndex: 6, label: "Sunday", isAvailable: false },
      ],
      appointmentBufferMinutes: 15,
      minAdvanceNoticeHours: 2,
      maxAdvanceBookingDays: 30,
      bookingPreference: "request_approval",
    },
    pricing: {
      travelFee: 0,
      emergencyFee: 0,
      weekendFee: 0,
      minimumBookingQuantity: 1,
    },
    portfolio: [],
    verification: { status: "not_required" },
    documents: spDocumentRequirements.map((d) => ({
      ...d,
      id: `doc_${d.documentType}`,
      status: "not_uploaded",
    })),
  };
  store[uid] = app;
  return { created: true, id: app.applicationId ?? "" };
}

export function saveSpDraft(
  data: Partial<ServiceProviderOnboardingDraft> & { currentStep: ServiceProviderOnboardingStepId }
): { ok: boolean } {
  const app = store[ownerId()];
  if (!app) return { ok: false };
  // Save progress: keep DRAFT/IN_PROGRESS semantics, never overwrite a
  // submitted/reviewed application from a partially filled form.
  if (BLOCKING_SP_ONBOARDING_STATUSES.includes(app.status)) {
    return { ok: false };
  }
  Object.assign(app, data);
  if (app.status === SERVICE_PROVIDER_ONBOARDING_STATUS.DRAFT) {
    app.status = SERVICE_PROVIDER_ONBOARDING_STATUS.IN_PROGRESS;
  }
  app.currentStep = data.currentStep;
  scramble(app);
  return { ok: true };
}

// ── Service management ───────────────────────────────────────

export function addSpService(
  service: Omit<ServiceProviderServiceDraft, "id"> & { id?: string }
): { ok: boolean; id?: string } {
  const app = store[ownerId()];
  if (!app) return { ok: false };
  const newId = service.id ?? `svc_${Date.now()}`;
  const newService = { ...service, id: newId };
  app.services.push(newService);
  scramble(app);
  return { ok: true, id: newId };
}

export function updateSpService(
  serviceId: string,
  updates: Partial<ServiceProviderServiceDraft>
): { ok: boolean } {
  const app = store[ownerId()];
  if (!app) return { ok: false };
  const idx = app.services.findIndex((s) => s.id === serviceId);
  if (idx === -1) return { ok: false };
  Object.assign(app.services[idx], updates);
  scramble(app);
  return { ok: true };
}

export function removeSpService(serviceId: string): { ok: boolean } {
  const app = store[ownerId()];
  if (!app) return { ok: false };
  const idx = app.services.findIndex((s) => s.id === serviceId);
  if (idx === -1) return { ok: false };
  app.services.splice(idx, 1);
  scramble(app);
  return { ok: true };
}

// ── Portfolio management ─────────────────────────────────────

export function addSpPortfolioItem(
  item: Omit<ServiceProviderPortfolioItemDraft, "id"> & { id?: string }
): { ok: boolean; id?: string } {
  const app = store[ownerId()];
  if (!app) return { ok: false };
  const newId = item.id ?? `port_${Date.now()}`;
  const newItem = { ...item, id: newId };
  app.portfolio.push(newItem);
  scramble(app);
  return { ok: true, id: newId };
}

export function removeSpPortfolioItem(portfolioId: string): { ok: boolean } {
  const app = store[ownerId()];
  if (!app) return { ok: false };
  const idx = app.portfolio.findIndex((p) => p.id === portfolioId);
  if (idx === -1) return { ok: false };
  app.portfolio.splice(idx, 1);
  scramble(app);
  return { ok: true };
}

// ── Document upload / replace ────────────────────────────────
// Simulates an authenticated upload endpoint. Returns a PRIVATE reference,
// never a public URL. Only documents owned by the current user are affected.

export interface SpUploadResult {
  ok: boolean;
  error?: string;
  privateRef?: string;
  fileName?: string;
}

const MAX_UPLOADS_PER_TIMESLOT = 10;

export function uploadSpDocument(
  documentType: string,
  fileName: string,
  fileSizeBytes: number,
  fileType: string
): SpUploadResult {
  const app = store[ownerId()];
  if (!app) return { ok: false, error: "No service provider application found." };

  const req = spDocumentRequirements.find((d) => d.documentType === documentType);
  if (!req) return { ok: false, error: "Unknown document type." };

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!req.acceptedFormats.includes(ext)) {
    return { ok: false, error: `Only ${req.acceptedFormats.join(", ")} are allowed.` };
  }
  const maxBytes = req.maxSizeMb * 1024 * 1024;
  if (fileSizeBytes > maxBytes) {
    return { ok: false, error: `File must be ${req.maxSizeMb}MB or smaller.` };
  }
  void fileType;
  if (fileSizeBytes === 0) return { ok: false, error: "File is empty." };

  let doc = app.documents.find((d) => d.documentType === documentType);
  if (!doc) {
    doc = { ...req, id: `doc_${documentType}`, status: "not_uploaded" } as ServiceProviderOnboardingDocument;
    app.documents.push(doc);
  }
  doc.fileName = fileName;
  doc.status = SERVICE_PROVIDER_DOCUMENT_STATUS.UPLOADED;
  doc.privateRef = `private://sp-app/${app.applicationId}/${documentType}/${Date.now()}`;
  doc.actionMessage = undefined;
  scramble(app);

  void MAX_UPLOADS_PER_TIMESLOT;
  return { ok: true, privateRef: doc.privateRef, fileName };
}

export function replaceSpDocument(
  documentType: string,
  fileName: string,
  fileSizeBytes: number,
  fileType: string
): SpUploadResult {
  if (!store[ownerId()]?.documents.some((d) => d.documentType === documentType)) {
    return { ok: false, error: "No existing document to replace." };
  }
  return uploadSpDocument(documentType, fileName, fileSizeBytes, fileType);
}

export function removeSpDocument(documentType: string): { ok: boolean; error?: string } {
  const app = store[ownerId()];
  if (!app) return { ok: false, error: "No service provider application found." };
  const doc = app.documents.find((d) => d.documentType === documentType);
  if (!doc) return { ok: false, error: "Document not found." };
  doc.status = SERVICE_PROVIDER_DOCUMENT_STATUS.NOT_UPLOADED;
  doc.fileName = undefined;
  doc.privateRef = undefined;
  doc.actionMessage = undefined;
  scramble(app);
  return { ok: true };
}

// ── Verification submission ──────────────────────────────────

export function submitSpVerification(type: "identity" | "business" | "professional"): {
  ok: boolean;
  status: ServiceProviderVerificationStatus;
  message: string;
} {
  const app = store[ownerId()];
  if (!app) return { ok: false, status: "not_required", message: "No application found." };

  app.verification = {
    type: type as "identity" | "business" | "professional",
    status: SERVICE_PROVIDER_VERIFICATION_STATUS.PENDING,
  };
  scramble(app);
  return { ok: true, status: SERVICE_PROVIDER_VERIFICATION_STATUS.PENDING, message: "Verification submitted for review." };
}

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

// ── Submit for review ────────────────────────────────────────

export function submitSpApplication(): {
  success: boolean;
  result: ServiceProviderSubmitResult;
  message: string;
} {
  const app = store[ownerId()];
  if (!app) return { success: false, result: SERVICE_PROVIDER_SUBMIT_RESULT.MISSING_INFORMATION, message: "You have not started an application." };

  if (
    app.status === SERVICE_PROVIDER_ONBOARDING_STATUS.PENDING_REVIEW ||
    app.status === SERVICE_PROVIDER_ONBOARDING_STATUS.APPROVED
  ) {
    return { success: false, result: SERVICE_PROVIDER_SUBMIT_RESULT.ALREADY_SUBMITTED, message: "This application has already been submitted." };
  }

  // Backend validation — mirrors real checks; UI can't bypass these.
  if (!app.provider.displayName) {
    return { success: false, result: SERVICE_PROVIDER_SUBMIT_RESULT.MISSING_INFORMATION, message: "Provider display name is required." };
  }
  if (!app.profile.displayName) {
    return { success: false, result: SERVICE_PROVIDER_SUBMIT_RESULT.MISSING_INFORMATION, message: "Profile display name is required." };
  }
  if (!app.category.primaryCategoryId) {
    return { success: false, result: SERVICE_PROVIDER_SUBMIT_RESULT.MISSING_INFORMATION, message: "Choose a primary service category." };
  }
  if (app.services.length === 0) {
    return { success: false, result: SERVICE_PROVIDER_SUBMIT_RESULT.MISSING_INFORMATION, message: "Add at least one service." };
  }
  if (!app.location.primaryCampusId) {
    return { success: false, result: SERVICE_PROVIDER_SUBMIT_RESULT.MISSING_INFORMATION, message: "Primary campus is required." };
  }
  if (app.verification.status === SERVICE_PROVIDER_VERIFICATION_STATUS.PENDING ||
      app.verification.status === SERVICE_PROVIDER_VERIFICATION_STATUS.ACTION_REQUIRED) {
    return { success: false, result: SERVICE_PROVIDER_SUBMIT_RESULT.VERIFICATION_REQUIRED, message: "Verification is still required before submitting." };
  }
  const requiredDoc = app.documents.find((d) => d.required && d.status !== "uploaded" && d.status !== "approved");
  if (requiredDoc) {
    return { success: false, result: SERVICE_PROVIDER_SUBMIT_RESULT.DOCUMENT_REQUIRED, message: `Required document missing: ${requiredDoc.label}.` };
  }

  app.status = SERVICE_PROVIDER_ONBOARDING_STATUS.PENDING_REVIEW;
  app.submittedAt = new Date().toISOString();
  app.currentStep = SERVICE_PROVIDER_ONBOARDING_STEPS;
  app.adminMessage = undefined;
  scramble(app);
  return { success: true, result: SERVICE_PROVIDER_SUBMIT_RESULT.SUBMITTED, message: "Submitted. Kampmax will review your application." };
}

// ── Public profile access ────────────────────────────────────

export function getSpPublicProfile(slug: string): ServiceProviderProfile | undefined {
  return serviceProviderProfiles.find((p) => p.slug === slug);
}

export function getSpCategories() {
  // Reuse existing categories for now; backend would have service-specific taxonomy
  return categories;
}
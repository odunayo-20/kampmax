// ============================================================
// EMPLOYER / CLIENT ONBOARDING DATA STORE  (Module 26)
// ============================================================
// In-memory mock store for the employer/client onboarding flow.
// Backend-authoritative — this store simulates what a future NestJS
// employer-profile service would persist (status, verification,
// completion, approval). A fresh user always starts at DRAFT.
//
// SECURITY: owner-scoped by userId. Status/verification/approval are
// never set by the frontend; the store (acting as the backend) is the
// only writer of those values.

import type { EmployerOnboardingDraft, EmployerOnboardingStepId, EmployerOnboardingStatus } from "@/types/employer";
import { EMPLOYER_ONBOARDING_STATUS } from "@/types/employer";

// ── Store ───────────────────────────────────────────────────

interface EmployerStoreRecord {
  draft: EmployerOnboardingDraft;
}

const store = new Map<string, EmployerStoreRecord>();

// ── Helpers ─────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function freshId(): string {
  return `emp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function cloneDraft(d: EmployerOnboardingDraft): EmployerOnboardingDraft {
  return JSON.parse(JSON.stringify(d));
}

// ── Fresh draft (inactive by default — no active employer yet) ──

function defaultDraft(userId: string): EmployerOnboardingDraft {
  return {
    userId,
    status: EMPLOYER_ONBOARDING_STATUS.DRAFT,
    currentStep: 1 as EmployerOnboardingStepId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    clientType: "",
    profile: {},
    organization: {},
    contact: {},
    location: {},
    preferences: { categories: [] },
    verification: { status: "not_started" },
  };
}

// ── Mock approved employer application (for demo of the active role) ──
// Mirrors the freelancer/service-provider pattern: a fully-filled,
// backend-approved record backing an "active employer" state so the
// role activation & multi-role switching can be demonstrated. A fresh
// user (any id other than the demo owner) still starts at DRAFT.

// Demo owner = current user (Adebayo, id "u1") so the role is active.
const DEMO_EMPLOYER_USER_ID = "u1";

function approvedSeedDraft(): EmployerOnboardingDraft {
  return {
    userId: DEMO_EMPLOYER_USER_ID,
    status: EMPLOYER_ONBOARDING_STATUS.APPROVED,
    currentStep: 5 as EmployerOnboardingStepId,
    createdAt: daysAgo(40),
    updatedAt: daysAgo(1),
    submittedAt: daysAgo(38),
    approvedSlug: "oluwaseun-labs",
    clientType: "business",
    profile: {
      displayName: "Adebayo Oluwaseun",
      headline: "Founder & Product Manager",
      about:
        "I run a small product studio building tools for student entrepreneurs. I hire talented developers, designers and marketers on campus.",
      industry: "Technology",
      website: "https://oluwaseunlabs.example.com",
      logoUrl: null,
    },
    organization: {
      name: "Oluwaseun Labs",
      businessType: "startup",
      industry: "Technology",
      description:
        "A product studio building tools for student entrepreneurs.",
      size: "2_10",
      website: "https://oluwaseunlabs.example.com",
    },
    contact: {
      email: "adebayo@oluwaseunlabs.example.com",
      phone: "+2348012345678",
      preferredContact: "in_app",
    },
    location: {
      campusId: "rugipo",
      city: "Owo",
      state: "Ondo",
      workPreference: "hybrid",
      remoteAvailable: true,
    },
    preferences: {
      categories: ["ec1", "ec2", "ec3"],
      experience: "intermediate",
      workType: "project",
      projectDuration: "one_to_three_months",
      budgetMin: 150000,
      budgetMax: 2000000,
    },
    verification: {
      status: "verified",
      type: "email",
      note: "Account email verified.",
    },
  };
}

// ── Seed the approved demo record at module load ────────────
store.set(DEMO_EMPLOYER_USER_ID, { draft: approvedSeedDraft() });

// ── Store API ───────────────────────────────────────────────

export function createEmployerApplication(
  userId: string
): { created: boolean; draft: EmployerOnboardingDraft } {
  const existing = store.get(userId);
  if (existing) return { created: false, draft: cloneDraft(existing.draft) };

  const draft = defaultDraft(userId);
  store.set(userId, { draft });
  return { created: true, draft: cloneDraft(draft) };
}

export function getEmployerOnboardingDraft(
  userId: string
): EmployerOnboardingDraft | null {
  const rec = store.get(userId);
  return rec ? cloneDraft(rec.draft) : null;
}

export function saveEmployerDraft(draft: EmployerOnboardingDraft): void {
  const existing = store.get(draft.userId);
  if (existing) {
    existing.draft = { ...cloneDraft(draft), updatedAt: nowIso() };
  } else {
    store.set(draft.userId, { draft: { ...cloneDraft(draft), updatedAt: nowIso() } });
  }
}

export function getEmployerOnboardingStatus(
  userId: string
): EmployerOnboardingStatus {
  const rec = store.get(userId);
  return rec ? rec.draft.status : EMPLOYER_ONBOARDING_STATUS.DRAFT;
}

export function submitEmployerApplication(
  userId: string
): { success: boolean; message: string } {
  const rec = store.get(userId);
  if (!rec) return { success: false, message: "No application found." };
  if (rec.draft.status === EMPLOYER_ONBOARDING_STATUS.PENDING_REVIEW) {
    return { success: false, message: "Your profile is already under review." };
  }
  if (rec.draft.status === EMPLOYER_ONBOARDING_STATUS.APPROVED) {
    return { success: false, message: "Your employer profile is already active." };
  }

  // Backend-authoritative: the store (backend) sets status, never the client.
  rec.draft.status = EMPLOYER_ONBOARDING_STATUS.PENDING_REVIEW;
  rec.draft.submittedAt = nowIso();
  rec.draft.updatedAt = nowIso();
  return { success: true, message: "Employer profile submitted for review." };
}

export type SetEmployerAdminStatusResult =
  | { ok: true; draft: EmployerOnboardingDraft }
  | { ok: false; code: "NOT_FOUND" | "TRANSITION_NOT_ALLOWED"; message: string };

export { cloneDraft, freshId, EMPLOYER_ONBOARDING_STATUS };

// ============================================================
// FREELANCER DASHBOARD SERVICE  (Module 22 — Dashboard)
// ============================================================
//
// Maps 1:1 to future backend endpoints:
//   GET /freelancer/dashboard   → overview + profile + activity
//
// AUTHORIZATION: ownership is ALWAYS derived from the authenticated identity
// (getCurrentUser().id). We never trust a freelancerId supplied by the client.
//
// SECURITY: approval, verification, availability and visibility are all
// backend-authoritative (here: the freelancer onboarding store). The dashboard
// only reports the returned state — it never forces a profile active client-side,
// never fabricates earnings/proposal/contract counts, and never exposes private
// documents, internal notes or server secrets.
//
// Unlike the vendor/service-provider modules this mirrors, M23–M25 (marketplace,
// proposals, contracts, financials) are NOT implemented yet. Those dashboard
// sections therefore render true empty states + `—` placeholders so the library
// is API-ready but never fakes activity.

import { apiClient } from "@/lib/api-client";
import { getCurrentUser, getUserById } from "@/services/users";
import {
  getFreelancerByApprovedSlug,
  getFreelancerOnboardingDraft,
  getFreelancerOnboardingStatus,
} from "@/data/freelancer";
import { FREELANCER_CATEGORIES } from "@/config/freelancer";
import { getNotifications, getUnreadNotificationCount } from "@/services/notifications";
import { computeFlCompletion } from "@/services/freelancer";
import { getFreelancerContracts } from "@/services/contract";
import { CONTRACT_STATUS } from "@/types/contract";
import type { FreelancerOnboardingDraft, FreelancerOnboardingStatus } from "@/types/freelancer";
import { FREELANCER_ONBOARDING_STATUS } from "@/types/freelancer";
import type {
  FreelancerDashboard,
  FreelancerDashboardMetric,
  FreelancerDashAvailability,
  FreelancerProfileStatus,
} from "@/types/freelancer-dashboard";
import { FREELANCER_DASHBOARD_SECTIONS } from "@/config/freelancer-dashboard";

// ── Access gate ─────────────────────────────────────────────

export const FREELANCER_DASHBOARD_GATE = {
  APPROVED: "approved",
  PENDING_REVIEW: "pending_review",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
  IN_PROGRESS: "in_progress",
  NO_FREELANCER: "no_freelancer",
} as const;

export type FreelancerDashboardGateKind =
  (typeof FREELANCER_DASHBOARD_GATE)[keyof typeof FREELANCER_DASHBOARD_GATE];

export interface FreelancerAccess {
  kind: FreelancerDashboardGateKind;
  status: FreelancerOnboardingStatus | null;
  canUseDashboard: boolean;
  message: string | null;
  displayName?: string;
}

export function getFreelancerDashboardAccess(): FreelancerAccess {
  const user = getCurrentUser();
  const draft = getFreelancerOnboardingDraft(user.id);
  const status = getFreelancerOnboardingStatus(user.id);

  if (!draft) {
    return {
      kind: FREELANCER_DASHBOARD_GATE.NO_FREELANCER,
      status: null,
      canUseDashboard: false,
      message: "You don't have a freelancer profile yet.",
      displayName: user.name,
    };
  }

  const base = {
    displayName: user.name,
  };

  switch (status) {
    case FREELANCER_ONBOARDING_STATUS.APPROVED:
      return {
        kind: FREELANCER_DASHBOARD_GATE.APPROVED,
        status,
        canUseDashboard: true,
        message: null,
        ...base,
      };
    case FREELANCER_ONBOARDING_STATUS.PENDING_REVIEW:
      return {
        kind: FREELANCER_DASHBOARD_GATE.PENDING_REVIEW,
        status,
        canUseDashboard: false,
        message: "Your freelancer profile is under review.",
        ...base,
      };
    case FREELANCER_ONBOARDING_STATUS.REJECTED:
      return {
        kind: FREELANCER_DASHBOARD_GATE.REJECTED,
        status,
        canUseDashboard: false,
        message: "Your freelancer profile requires changes before it can go live.",
        ...base,
      };
    case FREELANCER_ONBOARDING_STATUS.SUSPENDED:
      return {
        kind: FREELANCER_DASHBOARD_GATE.SUSPENDED,
        status,
        canUseDashboard: false,
        message: "Your freelancer profile is currently unavailable.",
        ...base,
      };
    default:
      // DRAFT / IN_PROGRESS → resume onboarding.
      return {
        kind: FREELANCER_DASHBOARD_GATE.IN_PROGRESS,
        status,
        canUseDashboard: false,
        message: "Complete your freelancer profile to go live.",
        ...base,
      };
  }
}

function hasDashboardAccess(): boolean {
  return getFreelancerDashboardAccess().canUseDashboard;
}

// ── Profile status (backend-computed, mirrors future API) ───

export function computeFreelancerProfileStatus(): FreelancerProfileStatus {
  const user = getCurrentUser();
  const draft = getFreelancerOnboardingDraft(user.id);
  const status = getFreelancerOnboardingStatus(user.id);

  if (!draft) {
    return {
      status: FREELANCER_ONBOARDING_STATUS.DRAFT,
      completionPercentage: 0,
      missing: [],
      isPublic: false,
      verification: "not_required",
    };
  }

  const missing: FreelancerProfileStatus["missing"] = [];

  const headlineOk = !!draft.profile.headline?.trim();
  const bioOk = !!draft.profile.bio?.trim();
  if (!headlineOk) {
    missing.push({ key: "headline", label: "Professional headline", description: "Add a headline that describes your work.", href: "/onboarding/freelancer/1" });
  }
  if (!bioOk) {
    missing.push({ key: "bio", label: "Bio", description: "Tell clients about your experience.", href: "/onboarding/freelancer/1" });
  }

  if (draft.categories.length === 0 || draft.skills.length === 0) {
    missing.push({ key: "skills", label: "Skills", description: "Add your categories and key skills.", href: "/onboarding/freelancer/2" });
  }

  if (draft.experience.length === 0) {
    missing.push({ key: "experience", label: "Experience", description: "Add your work history.", href: "/onboarding/freelancer/3" });
  }

  if (draft.education.length === 0) {
    missing.push({ key: "education", label: "Education", description: "Add your educational background.", href: "/onboarding/freelancer/4" });
  }

  if (draft.certifications.length === 0) {
    missing.push({ key: "certifications", label: "Certifications", description: "Add certifications to strengthen your profile.", href: "/onboarding/freelancer/5" });
  }

  if (draft.portfolio.length === 0) {
    missing.push({ key: "portfolio", label: "Portfolio", description: "Showcase your best work.", href: "/onboarding/freelancer/6" });
  }

  if (!draft.rates.hourlyRate && !draft.rates.projectRate) {
    missing.push({ key: "rates", label: "Rates", description: "Set your hourly or project rates.", href: "/onboarding/freelancer/7" });
  }

  // Completion % is backend-computed from the same draft. Never re-derived in the UI.
  const completionPercentage = computeFlCompletion(draft);

  // Visibility is backend-owned: only an APPROVED profile is publicly discoverable.
  const isPublic = status === FREELANCER_ONBOARDING_STATUS.APPROVED;

  // Verification — surfaced as a simple user-facing state only.
  const verification =
    status === FREELANCER_ONBOARDING_STATUS.APPROVED
      ? "verified"
      : status === FREELANCER_ONBOARDING_STATUS.PENDING_REVIEW
      ? "pending"
      : "not_required";

  return { status, completionPercentage, missing, isPublic, verification };
}

// ── Public freelancer profile (Module 28) ───────────────────
// Read-model an EMPLOYER reviewing an application sees. Only fields the
// backend treats as public — identity+approval, profile, skills, experience,
// education, certifications, visible portfolio and rates. Contact details,
// email, phone, verification artifacts and internal notes are never included.
// Returns null for profiles that aren't approved (no partial private data
// leaks from drafts or in-review records).

export interface PublicFreelancerProfile {
  id: string;
  name: string;
  avatar?: string;
  approved: boolean;
  slug?: string;
  headline?: string;
  bio?: string;
  city?: string;
  remoteAvailable: boolean;
  categories: { id: string; name: string }[];
  skills: string[];
  experience: FreelancerOnboardingDraft["experience"];
  education: FreelancerOnboardingDraft["education"];
  certifications: FreelancerOnboardingDraft["certifications"];
  portfolio: FreelancerOnboardingDraft["portfolio"];
  rates: {
    hourlyRate?: number;
    projectRate?: number;
    negotiable: boolean;
  };
  availability: { status: FreelancerDashAvailability | null; label: string };
}

export function getPublicFreelancerProfile(
  userId: string
): PublicFreelancerProfile | null {
  const draft = getFreelancerOnboardingDraft(userId);
  if (!draft || draft.status !== FREELANCER_ONBOARDING_STATUS.APPROVED) {
    return null;
  }
  return toPublicFreelancerProfile(draft);
}

/**
 * Public freelancer profile lookup by approved slug (Module 32). Pure store
 * lookup — mirrors getEmployerPublicProfileBySlug, so it is safe in server
 * components and never derives from the authenticated client.
 */
export function getPublicFreelancerBySlug(
  slug: string
): PublicFreelancerProfile | null {
  const draft = getFreelancerByApprovedSlug(slug);
  if (!draft || draft.status !== FREELANCER_ONBOARDING_STATUS.APPROVED) {
    return null;
  }
  return toPublicFreelancerProfile(draft);
}

function toPublicFreelancerProfile(
  draft: FreelancerOnboardingDraft
): PublicFreelancerProfile {
  const userId = draft.userId;
  const user = getUserById(userId);
  const categoryLookup = new Map(
    FREELANCER_CATEGORIES.map((c) => [c.id, c.name])
  );
  return {
    id: userId,
    name: user?.name ?? userId,
    avatar: user?.avatar || undefined,
    approved: true,
    slug: draft.approvedSlug,
    headline: draft.profile.headline,
    bio: draft.profile.bio,
    city: draft.profile.city,
    remoteAvailable: draft.profile.remoteAvailable === true,
    categories: draft.categories
      .map((id) => ({ id, name: categoryLookup.get(id) ?? id }))
      .filter((c) => categoryLookup.has(c.id)),
    skills: draft.skills,
    experience: draft.experience,
    education: draft.education,
    certifications: draft.certifications,
    portfolio: draft.portfolio.filter((p) => p.visible),
    rates: { ...draft.rates },
    availability: availabilityLabel(draft.availability.status),
  };
}

// ── Dashboard overview ──────────────────────────────────────

export function getFreelancerDashboard(): FreelancerDashboard | null {
  if (!hasDashboardAccess()) return null;
  const user = getCurrentUser();
  const draft = getFreelancerOnboardingDraft(user.id);
  if (!draft) return null;

  const profileStatus = computeFreelancerProfileStatus();

  // Module 24 — real (backend-scoped to the authenticated user) contract data.
  const contracts = getFreelancerContracts();
  const active = contracts.filter(
    (c) => c.status !== CONTRACT_STATUS.COMPLETED && c.status !== CONTRACT_STATUS.CANCELLED
  ).length;
  const completed = contracts.filter((c) => c.status === CONTRACT_STATUS.COMPLETED).length;
  const awaitingAction = contracts.filter(
    (c) =>
      c.status === CONTRACT_STATUS.PENDING_ACCEPTANCE ||
      c.status === CONTRACT_STATUS.REVISION_REQUESTED
  ).length;

  const metrics: FreelancerDashboardMetric[] = [
    { key: "active_proposals", label: "Active Proposals", valueLabel: "—", tone: "neutral", sublabel: "Module 23" },
    { key: "active_contracts", label: "Active Contracts", valueLabel: String(active), tone: "info" },
    { key: "completed_projects", label: "Completed Projects", valueLabel: String(completed), tone: "success" },
    { key: "total_earnings", label: "Total Earnings", valueLabel: "—", tone: "neutral", sublabel: "Module 25" },
  ];

  // Contract deadlines fed into the dashboard "Next Contract Action" surface.
  const deadlines = contracts
    .filter((c) => c.status !== CONTRACT_STATUS.COMPLETED && c.status !== CONTRACT_STATUS.CANCELLED)
    .slice(0, 5)
    .map((c) => ({ id: c.id, title: c.projectTitle, dueDate: c.deadline }));

  const awaitingActionContract = contracts.find(
    (c) =>
      c.status === CONTRACT_STATUS.PENDING_ACCEPTANCE ||
      c.status === CONTRACT_STATUS.REVISION_REQUESTED
  ) ?? null;

  return {
    profile: {
      headline: draft.profile.headline,
      bio: draft.profile.bio,
      photoUrl: draft.profile.photoUrl,
      city: draft.profile.city,
remoteAvailable: draft.profile.remoteAvailable === true,
      skills: draft.skills,
    },
    profileStatus,
    metrics,
    availability: availabilityLabel(draft.availability.status),
    opportunities: { total: 0, sample: [] },
    proposals: { submitted: 0, underReview: 0, accepted: 0, rejected: 0 },
    contracts: { active, completed },
    deadlines,
    earnings: { thisMonth: 0, pending: 0, available: 0 },
    activity: buildActivity(user.id, awaitingActionContract),
  };
}

// ── Activity feed (profile lifecycle + contract action pending) ──

function buildActivity(
  userId: string,
  awaitingActionContract?: { id: string; projectTitle: string } | null
): FreelancerDashboard["activity"] {
  const status = getFreelancerOnboardingStatus(userId);
  const events: FreelancerDashboard["activity"] = [];

  if (status === FREELANCER_ONBOARDING_STATUS.APPROVED) {
    events.push({
      id: "fl_act_approved",
      kind: "profile_approved",
      title: "Your freelancer profile was approved",
      message: "Your profile is now live and discoverable by clients.",
      href: "/freelancer/dashboard",
      createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    });
  } else if (status === FREELANCER_ONBOARDING_STATUS.PENDING_REVIEW) {
    events.push({
      id: "fl_act_pending",
      kind: "profile_approved",
      title: "Profile submitted for review",
      message: "Our team is reviewing your freelancer profile.",
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    });
  }

  if (awaitingActionContract) {
    events.push({
      id: "fl_act_contract_action",
      kind: "contract_started",
      title: `Action needed: ${awaitingActionContract.projectTitle}`,
      message: "A contract is waiting for your attention.",
      href: `/freelancer/contracts/${awaitingActionContract.id}`,
      createdAt: new Date().toISOString(),
    });
  }

  return events;
}

// ── Notifications summary (reuses the existing notification system) ─

export function getFreelancerNotificationSummary() {
  const user = getCurrentUser();
  const all = getNotifications(user.id);
  return {
    unreadCount: getUnreadNotificationCount(user.id),
    sample: all.slice(0, 4).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.message,
      createdAt: n.createdAt,
    })),
  };
}

// ── Dashboard path helper (mirrors isServiceProviderDashboardPath) ─

/** True when the pathname belongs to the full-screen Freelancer dashboard shell. */
export function isFreelancerDashboardPath(pathname: string): boolean {
  return FREELANCER_DASHBOARD_SECTIONS.some(
    (section) => pathname === section || pathname.startsWith(`${section}/`)
  );
}

// ── Availability mapping (onboarding enum → dashboard enum) ─

const AVAILABILITY_ALIASES: Record<string, FreelancerDashAvailability | undefined> = {
  // Onboarding draft statuses
  available_now: "available",
  available_later: "available_later",
  not_available: "unavailable",
};

function availabilityLabel(
  status: string | undefined
): { status: FreelancerDashAvailability | null; label: string } {
  const mapped = status ? AVAILABILITY_ALIASES[status] : undefined;
  const label =
    mapped === "available"
      ? "Available for work"
      : mapped === "available_later"
      ? "Available later"
      : "Not available";
  return { status: mapped ?? null, label };
}

// ═══════════════════════════════════════════════════════════
// ASYNC BACKEND API — FREELANCER DASHBOARD
// ═══════════════════════════════════════════════════════════

import { getMyFreelancerProfile } from "@/services/freelancer";
import { getFreelancerContractsApi } from "@/services/contract";
import { getMyProposalsApi } from "@/services/proposals";

/**
 * Determine dashboard access gate state from the live backend.
 * Reads verificationStatus from GET /freelancers/me to determine approval gate.
 */
export async function getFreelancerDashboardAccessApi(): Promise<FreelancerAccess> {
  const { profile, error } = await getMyFreelancerProfile();
  if (!error && profile) {
    const vs = profile.verificationStatus;
    const user = getCurrentUser();
    const displayName = user?.name;
    if (vs === "approved" || vs === "APPROVED") {
      return { kind: FREELANCER_DASHBOARD_GATE.APPROVED, status: "APPROVED" as any, canUseDashboard: true, message: null, displayName };
    }
    if (vs === "pending" || vs === "PENDING_REVIEW") {
      return { kind: FREELANCER_DASHBOARD_GATE.PENDING_REVIEW, status: "PENDING_REVIEW" as any, canUseDashboard: false, message: "Your freelancer profile is under review.", displayName };
    }
    if (vs === "rejected" || vs === "REJECTED") {
      return { kind: FREELANCER_DASHBOARD_GATE.REJECTED, status: "REJECTED" as any, canUseDashboard: false, message: "Your freelancer profile requires changes before it can go live.", displayName };
    }
    if (vs === "suspended" || vs === "SUSPENDED") {
      return { kind: FREELANCER_DASHBOARD_GATE.SUSPENDED, status: "SUSPENDED" as any, canUseDashboard: false, message: "Your freelancer profile is currently unavailable.", displayName };
    }
    return { kind: FREELANCER_DASHBOARD_GATE.IN_PROGRESS, status: "DRAFT" as any, canUseDashboard: false, message: "Complete your freelancer profile to go live.", displayName };
  }
  throw error ?? new Error("Unable to load freelancer profile.");
}

/**
 * Load full freelancer dashboard data from the backend.
 * Aggregates: GET /freelancers/me + GET /engagements/me + GET /proposals/me
 */
export async function getFreelancerDashboardApi(): Promise<FreelancerDashboard | null> {
  // Try to get profile from backend
  const { profile, error } = await getMyFreelancerProfile();
  if (error) throw error;

  // Fetch engagements
  const contracts = await getFreelancerContractsApi();

  // Fetch proposals
  const { proposals } = await getMyProposalsApi();

  if (!profile) return null;

  const vs = profile.verificationStatus;
  const isApproved = vs === "approved" || vs === "APPROVED";
  if (!isApproved) return null;

  // Build access gate from live profile
  const user = getCurrentUser();
  const draft = user ? getFreelancerOnboardingDraft(user.id) : null;

  const active = contracts.filter(
    (c) => c.status !== CONTRACT_STATUS.COMPLETED && c.status !== CONTRACT_STATUS.CANCELLED
  ).length;
  const completed = contracts.filter((c) => c.status === CONTRACT_STATUS.COMPLETED).length;

  const submittedProposals = proposals.filter((p) => p.status === "submitted").length;
  const underReview = proposals.filter((p) => p.status === "under_review").length;
  const acceptedProposals = proposals.filter((p) => p.status === "accepted").length;
  const rejectedProposals = proposals.filter((p) => p.status === "rejected").length;

  const awaitingActionContract = contracts.find(
    (c) => c.status === CONTRACT_STATUS.PENDING_ACCEPTANCE || c.status === CONTRACT_STATUS.REVISION_REQUESTED
  ) ?? null;

  const metrics: FreelancerDashboardMetric[] = [
    { key: "active_proposals", label: "Active Proposals", valueLabel: String(submittedProposals + underReview), tone: "neutral" },
    { key: "active_contracts", label: "Active Contracts", valueLabel: String(active), tone: "info" },
    { key: "completed_projects", label: "Completed Projects", valueLabel: String(completed), tone: "success" },
    { key: "total_earnings", label: "Total Earnings", valueLabel: "—", tone: "neutral", sublabel: "Module 25" },
  ];

  const profileStatus = computeFreelancerProfileStatus();
  const deadlines = contracts
    .filter((c) => c.status !== CONTRACT_STATUS.COMPLETED && c.status !== CONTRACT_STATUS.CANCELLED)
    .slice(0, 5)
    .map((c) => ({ id: c.id, title: c.projectTitle, dueDate: c.deadline }));

  return {
    profile: {
      headline: (profile as any).professionalTitle ?? draft?.profile?.headline,
      bio: (profile as any).bio ?? draft?.profile?.bio,
      photoUrl: (profile as any).avatar ?? draft?.profile?.photoUrl,
      city: (profile as any).city ?? draft?.profile?.city,
      remoteAvailable: false,
      skills: (profile as any).skills?.map((s: any) => s.name ?? s) ?? draft?.skills ?? [],
    },
    profileStatus,
    metrics,
    availability: availabilityLabel((profile as any).availabilityStatus ?? draft?.availability?.status),
    opportunities: { total: 0, sample: [] },
    proposals: { submitted: submittedProposals, underReview, accepted: acceptedProposals, rejected: rejectedProposals },
    contracts: { active, completed },
    deadlines,
    earnings: { thisMonth: 0, pending: 0, available: 0 },
    activity: buildActivity(user?.id ?? "", awaitingActionContract),
  };
}

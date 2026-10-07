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
import { getCurrentUser } from "@/services/users";
import {
  getPublicFreelancerById,
  loadProfileSections,
} from "@/services/freelancer";
import { fromBackendPortfolio, type BackendPortfolioItem } from "@/services/freelancer-services";
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



// ── Profile status (backend-computed, mirrors future API) ───


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



/**
 * Public freelancer profile from the real backend, keyed by profile id
 * (GET /freelancers/:id plus its experience/education/certifications and
 * public portfolio). Returns null when the profile is missing or private.
 * Fields the backend doesn't model (categories, remote flag, project rate)
 * are left empty rather than invented.
 */
export async function getPublicFreelancerFromBackend(
  id: string
): Promise<PublicFreelancerProfile | null> {
  const { profile } = await getPublicFreelancerById(id);
  if (!profile) return null;

  const [sections, portfolio] = await Promise.all([
    loadProfileSections(id),
    apiClient.get<{ items: BackendPortfolioItem[] }>(
      `/portfolio/public?freelancerId=${encodeURIComponent(id)}&limit=50`
    ),
  ]);

  const hourlyRate = profile.hourlyRate != null ? Number(profile.hourlyRate) : undefined;

  return {
    id: profile.id,
    name: profile.fullName,
    avatar: profile.avatar ?? undefined,
    approved: profile.verificationStatus === "VERIFIED",
    slug: profile.id,
    headline: profile.professionalTitle ?? undefined,
    bio: profile.bio ?? undefined,
    city: profile.city ?? undefined,
    remoteAvailable: false,
    categories: [],
    skills: profile.skills.map((s) => s.name),
    experience: sections?.experience ?? [],
    education: sections?.education ?? [],
    certifications: sections?.certifications ?? [],
    portfolio: (portfolio.data?.items ?? []).map(fromBackendPortfolio),
    rates: { hourlyRate, negotiable: hourlyRate == null },
    availability: availabilityLabel(profile.availabilityStatus),
  };
}


// ── Dashboard overview ──────────────────────────────────────


// ── Activity feed (profile lifecycle + contract action pending) ──


// ── Notifications summary (reuses the existing notification system) ─


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
  // Backend FreelancerAvailabilityStatus enum
  AVAILABLE: "available",
  BUSY: "available_later",
  UNAVAILABLE: "unavailable",
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
import { formatNaira } from "@/lib/utils";
import type { Contract } from "@/types/contract";
import type { Proposal } from "@/types/opportunity";
import type { FreelancerPrivateProfile } from "@/services/freelancer";
import { getMyProposalsApi } from "@/services/proposals";

/**
 * Determine dashboard access gate state from the live backend.
 *
 * The gate is profile EXISTENCE, not verification status: a
 * FreelancerProfile (POST /freelancers) is the explicit activation step —
 * nothing on the backend blocks an unverified freelancer from browsing or
 * applying to jobs, so "unverified" must not lock the dashboard. Reads
 * GET /freelancers/me: a 404 means the capability was never activated
 * (NO_FREELANCER); any other error is surfaced to the caller; otherwise the
 * profile's real verificationStatus enum (UNVERIFIED/PENDING/VERIFIED/
 * REJECTED) is only used to label the badge shown inside the dashboard.
 */
export async function getFreelancerDashboardAccessApi(): Promise<FreelancerAccess> {
  const user = getCurrentUser();
  const displayName = user?.name;
  const { profile, error } = await getMyFreelancerProfile();

  if (error) {
    if (error.status === 404) {
      return {
        kind: FREELANCER_DASHBOARD_GATE.NO_FREELANCER,
        status: null,
        canUseDashboard: false,
        message: "You don't have a freelancer profile yet.",
        displayName,
      };
    }
    throw error;
  }
  if (!profile) {
    throw new Error("Unable to load freelancer profile.");
  }

  const vs = profile.verificationStatus?.toUpperCase();
  if (vs === "REJECTED") {
    return { kind: FREELANCER_DASHBOARD_GATE.REJECTED, status: "REJECTED" as any, canUseDashboard: true, message: "Your freelancer verification requires changes.", displayName };
  }
  if (vs === "PENDING") {
    return { kind: FREELANCER_DASHBOARD_GATE.PENDING_REVIEW, status: "PENDING_REVIEW" as any, canUseDashboard: true, message: "Your freelancer verification is under review.", displayName };
  }
  return { kind: FREELANCER_DASHBOARD_GATE.APPROVED, status: "APPROVED" as any, canUseDashboard: true, message: null, displayName };
}

/**
 * Load full freelancer dashboard data from the backend.
 * Aggregates: profile + sections + portfolio + proposals + engagements + wallet.
 * Everything shown is read from those; nothing is invented.
 */
export async function getFreelancerDashboardApi(): Promise<FreelancerDashboard | null> {
  const { profile, error } = await getMyFreelancerProfile();
  if (error) throw error;
  if (!profile) return null;

  const [contracts, { proposals }, sections, portfolio, wallet] = await Promise.all([
    getFreelancerContractsApi(),
    getMyProposalsApi({ limit: 100 }),
    loadProfileSections("me"),
    apiClient.get<{ items?: unknown[]; meta?: { total?: number } }>("/portfolio/me?limit=1"),
    apiClient.get<{ balance: number; heldBalance?: number }>("/wallet"),
  ]);

  const active = contracts.filter(
    (c) => c.status !== CONTRACT_STATUS.COMPLETED && c.status !== CONTRACT_STATUS.CANCELLED
  ).length;
  const completed = contracts.filter((c) => c.status === CONTRACT_STATUS.COMPLETED).length;

  const countOf = (status: string) => proposals.filter((p) => p.status === status).length;
  const submittedProposals = countOf("submitted");
  const underReview = countOf("under_review");

  const balance = wallet.data && typeof wallet.data.balance === "number" ? wallet.data.balance : null;

  const metrics: FreelancerDashboardMetric[] = [
    { key: "active_proposals", label: "Active Proposals", valueLabel: String(submittedProposals + underReview), tone: "neutral" },
    { key: "active_contracts", label: "Active Contracts", valueLabel: String(active), tone: "info" },
    { key: "completed_projects", label: "Completed Projects", valueLabel: String(completed), tone: "success" },
    {
      key: "total_earnings",
      label: "Wallet balance",
      valueLabel: balance === null ? "—" : formatNaira(balance),
      tone: "neutral",
    },
  ];

  const portfolioCount = portfolio.error ? 0 : portfolio.data?.meta?.total ?? portfolio.data?.items?.length ?? 0;
  const profileStatus = buildProfileStatus(profile, sections, portfolioCount);

  const deadlines = contracts
    .filter((c) => c.status !== CONTRACT_STATUS.COMPLETED && c.status !== CONTRACT_STATUS.CANCELLED && c.deadline)
    .slice(0, 5)
    .map((c) => ({ id: c.id, title: c.projectTitle, dueDate: c.deadline }));

  return {
    profile: {
      headline: profile.professionalTitle ?? undefined,
      bio: profile.bio ?? undefined,
      photoUrl: profile.avatar ?? undefined,
      city: profile.city ?? undefined,
      remoteAvailable: false,
      skills: profile.skills?.map((sk) => sk.name) ?? [],
    },
    profileStatus,
    metrics,
    availability: availabilityLabel(profile.availabilityStatus),
    opportunities: { total: 0, sample: [] },
    proposals: {
      submitted: submittedProposals,
      underReview,
      accepted: countOf("accepted"),
      rejected: countOf("rejected"),
    },
    contracts: { active, completed },
    deadlines,
    earnings: { thisMonth: 0, pending: wallet.data?.heldBalance ?? 0, available: balance ?? 0 },
    activity: buildActivity(proposals, contracts),
  };
}

const VERIFICATION_TO_STATUS: Record<string, FreelancerOnboardingStatus> = {
  VERIFIED: FREELANCER_ONBOARDING_STATUS.APPROVED,
  PENDING: FREELANCER_ONBOARDING_STATUS.PENDING_REVIEW,
  REJECTED: FREELANCER_ONBOARDING_STATUS.REJECTED,
};

/** How complete the real profile is, and what is still missing. */
function buildProfileStatus(
  profile: FreelancerPrivateProfile,
  sections: Awaited<ReturnType<typeof loadProfileSections>>,
  portfolioCount: number
): FreelancerProfileStatus {
  const checks: { key: string; label: string; description: string; href: string; ok: boolean }[] = [
    { key: "headline", label: "Professional headline", description: "Add a headline that describes your work.", href: "/freelancer/profile", ok: !!profile.professionalTitle?.trim() },
    { key: "bio", label: "Bio", description: "Tell clients about your experience.", href: "/freelancer/profile", ok: !!profile.bio?.trim() },
    { key: "skills", label: "Skills", description: "Add your key skills.", href: "/freelancer/profile", ok: (profile.skills?.length ?? 0) > 0 },
    { key: "experience", label: "Experience", description: "Add your work history.", href: "/freelancer/profile", ok: (sections?.experience.length ?? 0) > 0 },
    { key: "education", label: "Education", description: "Add your educational background.", href: "/freelancer/profile", ok: (sections?.education.length ?? 0) > 0 },
    { key: "certifications", label: "Certifications", description: "Add certifications to strengthen your profile.", href: "/freelancer/profile", ok: (sections?.certifications.length ?? 0) > 0 },
    { key: "portfolio", label: "Portfolio", description: "Showcase your best work.", href: "/freelancer/portfolio", ok: portfolioCount > 0 },
    { key: "rates", label: "Rates", description: "Set your hourly rate.", href: "/freelancer/profile", ok: profile.hourlyRate != null && Number(profile.hourlyRate) > 0 },
  ];
  const vs = profile.verificationStatus?.toUpperCase();
  return {
    status: VERIFICATION_TO_STATUS[vs] ?? FREELANCER_ONBOARDING_STATUS.IN_PROGRESS,
    completionPercentage: Math.round((checks.filter((c) => c.ok).length / checks.length) * 100),
    missing: checks.filter((c) => !c.ok).map(({ key, label, description, href }) => ({ key, label, description, href })),
    isPublic: profile.isPublic,
    verification: vs === "VERIFIED" ? "verified" : vs === "PENDING" ? "pending" : "not_required",
  };
}

/** Recent activity from the freelancer's real proposals and contracts, newest first. */
function buildActivity(proposals: Proposal[], contracts: Contract[]): FreelancerDashboard["activity"] {
  const events: FreelancerDashboard["activity"] = [];

  for (const p of proposals) {
    if (p.status === "accepted") {
      events.push({
        id: `proposal-accepted-${p.id}`,
        kind: "proposal_accepted",
        title: "Proposal accepted",
        message: p.jobTitle ? `Your proposal for "${p.jobTitle}" was accepted.` : "A client accepted your proposal.",
        href: "/freelancer/contracts",
        createdAt: p.updatedAt,
      });
    } else if (p.status === "submitted" || p.status === "under_review" || p.status === "shortlisted") {
      events.push({
        id: `proposal-submitted-${p.id}`,
        kind: "proposal_submitted",
        title: "Proposal submitted",
        message: p.jobTitle ? `You applied to "${p.jobTitle}".` : "You submitted a proposal.",
        href: `/freelancer/proposals/${p.id}`,
        createdAt: p.submittedAt ?? p.createdAt,
      });
    }
  }

  for (const c of contracts) {
    if (c.status === CONTRACT_STATUS.COMPLETED) {
      events.push({
        id: `contract-done-${c.id}`,
        kind: "payment_received",
        title: "Project completed",
        message: `"${c.projectTitle}" was completed.`,
        href: "/freelancer/contracts",
        createdAt: c.updatedAt,
      });
    } else if (c.status !== CONTRACT_STATUS.CANCELLED) {
      events.push({
        id: `contract-${c.id}`,
        kind: "contract_started",
        title: c.nextAction || "Contract in progress",
        message: `"${c.projectTitle}"`,
        href: "/freelancer/contracts",
        createdAt: c.updatedAt,
      });
    }
  }

  return events.sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 8);
}

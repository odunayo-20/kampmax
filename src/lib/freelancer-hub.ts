/**
 * The freelancer dashboard's own rules, the same as the mobile app's freelancer hub (mobile lib/freelancer-hub,
 * freelancer-portal buildCompletion, buildCallouts and VERIFICATION_VIEW): where the jobs stand, what needs the
 * freelancer now, the one profile step to do next, and what verification means. Escrow is contract-groups
 * heldInEscrow. Pure.
 */

import type { Engagement } from "@/services/jobs";
import { isMyMove } from "@/lib/contract-groups";

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

// ---- where the jobs stand ---------------------------------------------------------------

export interface JobPipeline {
  /** Work only the freelancer can move: start it, or deliver again after changes were asked for. */
  toDo: number;
  /** Delivered, waiting for the client to approve. */
  withClient: number;
  paid: number;
}

export function jobPipeline(contracts: Pick<Engagement, "status" | "paymentType">[]): JobPipeline {
  return {
    toDo: contracts.filter((c) => isMyMove(c, "freelancer")).length,
    withClient: contracts.filter((c) => c.status === "SUBMITTED").length,
    paid: contracts.filter((c) => c.status === "COMPLETED").length,
  };
}

/** Under "Held for you". */
export function heldFooter(held: { count: number }): string {
  if (held.count === 0) return "Nothing held right now";
  return `${plural(held.count, "job")} in progress`;
}

// ---- verification -----------------------------------------------------------------------

export type VerificationState = "verified" | "pending" | "rejected" | "unverified";

export function verificationState(status: string | null | undefined): VerificationState {
  const v = (status ?? "").toUpperCase();
  if (v === "VERIFIED" || v === "APPROVED") return "verified";
  if (v === "PENDING" || v === "PENDING_REVIEW" || v === "IN_REVIEW") return "pending";
  if (v === "REJECTED") return "rejected";
  return "unverified";
}

export const VERIFICATION_VIEW: Record<VerificationState, { label: string; title: string; text: string }> = {
  verified: { label: "Verified", title: "You are verified", text: "Clients see a verified badge next to your name." },
  pending: { label: "In review", title: "We are reviewing you", text: "This usually takes a few days. We will tell you when there is an answer." },
  rejected: { label: "Not approved", title: "Your request was not approved", text: "See why and ask for another review." },
  unverified: { label: "Not verified", title: "Get a verified badge", text: "Verified freelancers are trusted more and win more work." },
};

// ---- what needs the freelancer now -------------------------------------------------------

export interface Callout {
  id: string;
  title: string;
  text: string;
  href: string;
  tone: "attention" | "positive" | "info";
}

export function freelancerCallouts(i: { toDo: number; proposalsWon: number; unavailable: boolean; verification: VerificationState }): Callout[] {
  const out: Callout[] = [];
  if (i.toDo > 0) out.push({ id: "contracts", title: `${plural(i.toDo, "contract")} waiting for you`, text: "Start the work or send it back for review.", href: "/freelancer/contracts", tone: "attention" });
  if (i.proposalsWon > 0) {
    out.push({ id: "won", title: i.proposalsWon === 1 ? "An employer accepted a proposal" : `Employers accepted ${i.proposalsWon} proposals`, text: "Open your contracts to get started.", href: "/freelancer/contracts", tone: "positive" });
  }
  if (i.unavailable) out.push({ id: "away", title: "You are set to not taking work", text: "Switch to Available when you can take new projects.", href: "/freelancer/profile", tone: "info" });
  if (i.verification === "rejected") out.push({ id: "verify", title: "Your verification was not approved", text: "See why and ask for another review.", href: "/freelancer/verification", tone: "attention" });
  return out;
}

// ---- the one profile step to do next ----------------------------------------------------

export interface FreelancerNextStep {
  title: string;
  detail: string;
  /** "3 of 8 done". */
  progress: string;
  href: string;
}

export function freelancerNextStep(i: {
  headline?: string | null;
  bio?: string | null;
  skills: number;
  experience: number;
  education: number;
  certifications: number;
  portfolio: number;
  hourlyRate?: number | string | null;
}): FreelancerNextStep | null {
  const profile = "/freelancer/profile";
  const items = [
    { title: "A headline", detail: "One line that says what you do.", done: (i.headline ?? "").trim().length >= 2, href: profile },
    { title: "About you", detail: "A few lines on your work and how you help clients.", done: (i.bio ?? "").trim().length >= 20, href: profile },
    { title: "Skills", detail: "Clients search by skill.", done: i.skills > 0, href: profile },
    { title: "Experience", detail: "Jobs, internships or projects you have done.", done: i.experience > 0, href: profile },
    { title: "Education", detail: "Your school or training.", done: i.education > 0, href: profile },
    { title: "Certifications", detail: "Courses and certificates that back up your skills.", done: i.certifications > 0, href: profile },
    { title: "Portfolio", detail: "Show real work. Profiles with samples get more replies.", done: i.portfolio > 0, href: "/freelancer/portfolio" },
    { title: "Hourly rate", detail: "Tell clients what you charge.", done: Number(i.hourlyRate ?? 0) > 0, href: profile },
  ];
  const next = items.find((x) => !x.done);
  if (!next) return null;
  return { title: next.title, detail: next.detail, href: next.href, progress: `${items.filter((x) => x.done).length} of ${items.length} done` };
}

// ---- the latest money movement ----------------------------------------------------------

/** "Received ₦12,000 · Payment for Logo design", from the newest completed wallet entry; null when there is none. */
export function latestPaymentLine(entries: { status: string; direction: string; amount: number; description: string }[], formatMoney: (n: number) => string): string | null {
  const hit = entries.find((t) => t.status === "completed");
  if (!hit) return null;
  const verb = hit.direction === "credit" ? "Received" : "Paid out";
  return [`${verb} ${formatMoney(hit.amount)}`, hit.description?.trim()].filter(Boolean).join(" · ");
}

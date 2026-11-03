// ============================================================
// ENGAGEMENT MILESTONES — PRESENTATION HELPERS
// ============================================================
// Display only. The backend owns every amount, status and payment; this just
// describes where a contract is so the wording can say which milestone is
// being funded or approved, and how much that is.

import type { Engagement, MilestoneStatus } from "@/services/jobs";
import { todayISO } from "@/lib/milestone-plan";

export interface CurrentMilestoneInfo {
  /** 1-based. */
  position: number;
  total: number;
  title: string;
  /** What funding or approving it now moves, for the confirmation text. */
  amount: number;
  /** How many milestones were already paid out. */
  paidCount: number;
}

/**
 * A due date (YYYY-MM-DD) as "12 Nov", with the year only when it is not this
 * one. Built from the parts, not parsed as a Date, so the day never shifts
 * with the viewer's timezone.
 */
export function formatDueDate(dueDate: string, today: string = todayISO()): string {
  const [year, month, day] = dueDate.split("-").map(Number);
  const sameYear = year === Number(today.slice(0, 4));
  return new Date(year, month - 1, day).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export interface DueInfo {
  label: string;
  overdue: boolean;
}

/**
 * What to say about a milestone's due date, or null when there is nothing to
 * say: no date, or the milestone is finished either way. Display only — nothing
 * happens to a contract when a date passes.
 */
export function describeDue(
  dueDate: string | null | undefined,
  status: MilestoneStatus,
  today: string = todayISO()
): DueInfo | null {
  if (!dueDate || status === "COMPLETED" || status === "CANCELLED") return null;
  const when = formatDueDate(dueDate, today);
  return dueDate < today ? { label: `Overdue · due ${when}`, overdue: true } : { label: `Due ${when}`, overdue: false };
}

export interface MilestoneAtStake {
  /** The amount a ruling on this dispute moves: the disputed milestone, not the whole contract. */
  amount: number;
  /** "milestone 2 of 3, “Build”" when the contract has several; undefined for a single payment. */
  label?: string;
}

/**
 * What a dispute is actually about. Only one milestone is ever held in escrow,
 * so an admin deciding to pay or refund must see that milestone's amount, not
 * the contract's total. An open dispute is about the current milestone; a
 * settled one is about the latest milestone that carries a ruling.
 */
export function milestoneAtStake(
  engagement: Pick<Engagement, "milestones" | "currentMilestonePosition" | "agreedAmount" | "dispute">
): MilestoneAtStake {
  const { milestones, currentMilestonePosition, agreedAmount, dispute } = engagement;
  const current = milestones.find((m) => m.position === currentMilestonePosition);
  const settled = dispute?.resolvedAt
    ? [...milestones].reverse().find((m) => m.disputeOutcome !== null)
    : undefined;
  const target = settled ?? current;

  if (!target) return { amount: Number(agreedAmount) };
  return {
    amount: target.amount,
    label: milestones.length > 1 ? `milestone ${target.position} of ${milestones.length}, “${target.title}”` : undefined,
  };
}

/**
 * The milestone a contract is on, or undefined for a contract with a single
 * payment — those keep the plain "fund / approve the project" wording.
 */
export function describeCurrentMilestone(
  engagement: Pick<Engagement, "milestones" | "currentMilestonePosition">
): CurrentMilestoneInfo | undefined {
  const { milestones, currentMilestonePosition } = engagement;
  if (milestones.length < 2) return undefined;

  const current = milestones.find((m) => m.position === currentMilestonePosition);
  if (!current) return undefined;

  return {
    position: current.position,
    total: milestones.length,
    title: current.title,
    amount: current.amount,
    paidCount: milestones.filter((m) => m.status === "COMPLETED").length,
  };
}

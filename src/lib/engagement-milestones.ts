// ============================================================
// ENGAGEMENT MILESTONES — PRESENTATION HELPERS
// ============================================================
// Display only. The backend owns every amount, status and payment; this just
// describes where a contract is so the wording can say which milestone is
// being funded or approved, and how much that is.

import type { Engagement, MilestoneStatus } from "@/services/jobs";
import { todayISO } from "@/lib/milestone-plan";
import { formatNaira } from "@/lib/utils";
import { hourlyTerms, hoursWorth } from "@/lib/hourly";

export interface CurrentMilestoneInfo {
  /** 1-based. */
  position: number;
  total: number;
  title: string;
  /** What funding or approving it now moves, for the confirmation text. */
  amount: number;
  /** How many milestones were already paid out. */
  paidCount: number;
  /**
   * Set for a week of an hourly contract. `amount` is then the most the week
   * can cost (what is held in escrow); what is actually paid is `worth`.
   */
  hourly?: {
    loggedMinutes: number;
    /** What the hours logged so far are worth, as the backend will pay them. */
    worth: number;
  };
}

/** How a contract's price reads: "₦250,000", or "₦3,000/hr · up to 20 h/week" for an hourly one. */
export function contractPriceLabel(
  engagement: Pick<Engagement, "paymentType" | "hourlyRate" | "weeklyHourLimit" | "agreedAmount">
): string {
  if (engagement.paymentType === "HOURLY" && engagement.hourlyRate != null && engagement.weeklyHourLimit != null) {
    return hourlyTerms(engagement.hourlyRate, engagement.weeklyHourLimit);
  }
  return formatNaira(Number(engagement.agreedAmount));
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
  /** What is held in escrow for the disputed milestone, and what a ruling to refund returns. */
  amount: number;
  /**
   * What a ruling to release pays the freelancer. The same as `amount` for a
   * fixed milestone; for an hourly week, only the hours logged (the rest of the
   * escrow goes back to the employer).
   */
  release: number;
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
  engagement: Pick<
    Engagement,
    "milestones" | "currentMilestonePosition" | "agreedAmount" | "dispute" | "hourlyRate"
  >
): MilestoneAtStake {
  const { milestones, currentMilestonePosition, agreedAmount, dispute, hourlyRate } = engagement;
  const current = milestones.find((m) => m.position === currentMilestonePosition);
  const settled = dispute?.resolvedAt
    ? [...milestones].reverse().find((m) => m.disputeOutcome !== null)
    : undefined;
  const target = settled ?? current;

  if (!target) return { amount: Number(agreedAmount), release: Number(agreedAmount) };

  // A week pays the hours logged; once settled, what was actually paid.
  const week = target.kind === "WEEK";
  const release = !week
    ? target.amount
    : target.billedAmount ?? hoursWorth(hourlyRate ?? 0, target.loggedMinutes);
  return {
    amount: target.amount,
    release,
    label: week
      ? `${target.title.toLowerCase()}`
      : milestones.length > 1
        ? `milestone ${target.position} of ${milestones.length}, “${target.title}”`
        : undefined,
  };
}

/**
 * The milestone a contract is on, or undefined for a contract with a single
 * payment — those keep the plain "fund / approve the project" wording.
 */
export function describeCurrentMilestone(
  engagement: Pick<Engagement, "milestones" | "currentMilestonePosition" | "paymentType" | "hourlyRate">
): CurrentMilestoneInfo | undefined {
  const { milestones, currentMilestonePosition } = engagement;
  const hourly = engagement.paymentType === "HOURLY";
  // Fixed contracts with a single payment keep the plain wording; every hourly
  // week is a week, even the first.
  if (!hourly && milestones.length < 2) return undefined;

  const current = milestones.find((m) => m.position === currentMilestonePosition);
  if (!current) return undefined;

  if (hourly) {
    return {
      position: current.position,
      total: current.position,
      title: current.title,
      amount: current.amount,
      paidCount: milestones.filter((m) => m.status === "COMPLETED").length,
      hourly: {
        loggedMinutes: current.loggedMinutes,
        worth: hoursWorth(engagement.hourlyRate ?? 0, current.loggedMinutes),
      },
    };
  }

  return {
    position: current.position,
    total: milestones.length,
    title: current.title,
    amount: current.amount,
    paidCount: milestones.filter((m) => m.status === "COMPLETED").length,
  };
}

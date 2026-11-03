// ============================================================
// PAYMENT PLAN (MILESTONES) — PROPOSAL FORM HELPERS
// ============================================================
// UX helpers only: they keep the form honest while it is being filled in. The
// backend is the authority and re-checks everything — how many milestones,
// each one's title and minimum, and that the plan adds up exactly.

import type { ProposalMilestone } from "@/types/opportunity";
import { formatNaira } from "@/lib/utils";

export const MAX_MILESTONES = 10;
export const MIN_MILESTONES = 2;
export const MIN_MILESTONE_AMOUNT = 100;
export const MILESTONE_TITLE_MIN = 3;
export const MILESTONE_TITLE_MAX = 100;
export const MILESTONE_DESCRIPTION_MAX = 500;

/** A milestone as typed into the form: raw strings, parsed only when sending. */
export interface MilestoneRow {
  title: string;
  description: string;
  amount: string;
}

export const emptyMilestoneRow = (): MilestoneRow => ({ title: "", description: "", amount: "" });

/** Whole kobo, so decimal rounding can never make a plan look right or wrong. */
const toKobo = (value: string | number): number => Math.round(Number(value) * 100);

const hasAmount = (row: MilestoneRow): boolean =>
  row.amount.trim() !== "" && Number.isFinite(Number(row.amount));

/** What the milestones add up to so far, in naira (rows without a valid amount count as nothing). */
export function planTotal(rows: MilestoneRow[]): number {
  return rows.reduce((kobo, row) => kobo + (hasAmount(row) ? toKobo(row.amount) : 0), 0) / 100;
}

/** How much of `total` is still unassigned, in naira. Negative means the plan is over. */
export function planRemaining(rows: MilestoneRow[], total: number): number {
  return (toKobo(total) - toKobo(planTotal(rows))) / 100;
}

export interface PlanErrors {
  /** About the plan as a whole (count, or it not adding up). */
  plan?: string;
  /** About a single milestone, by its index. */
  rows: Record<number, { title?: string; amount?: string }>;
}

/** Returns what is wrong with the plan, or null when it is ready to send. No rows means "one payment". */
export function validatePlan(rows: MilestoneRow[], total: number | undefined): PlanErrors | null {
  if (rows.length === 0) return null;

  const errors: PlanErrors = { rows: {} };
  const flag = (index: number, field: "title" | "amount", message: string) => {
    errors.rows[index] = { ...errors.rows[index], [field]: message };
  };

  if (rows.length < MIN_MILESTONES) {
    errors.plan = `Add at least ${MIN_MILESTONES} milestones, or turn milestones off.`;
  } else if (rows.length > MAX_MILESTONES) {
    errors.plan = `Use at most ${MAX_MILESTONES} milestones.`;
  }

  rows.forEach((row, index) => {
    const title = row.title.trim();
    if (title.length < MILESTONE_TITLE_MIN) flag(index, "title", "Give this milestone a title.");
    else if (title.length > MILESTONE_TITLE_MAX) {
      flag(index, "title", `Keep the title under ${MILESTONE_TITLE_MAX} characters.`);
    }
    if (!hasAmount(row)) flag(index, "amount", "Enter an amount.");
    else if (toKobo(row.amount) < MIN_MILESTONE_AMOUNT * 100) {
      flag(index, "amount", `At least ${formatNaira(MIN_MILESTONE_AMOUNT)}.`);
    }
  });

  if (!errors.plan && total !== undefined && Object.keys(errors.rows).length === 0) {
    const remaining = planRemaining(rows, total);
    if (remaining > 0) errors.plan = `${formatNaira(remaining)} of ${formatNaira(total)} is not assigned to a milestone yet.`;
    else if (remaining < 0) errors.plan = `The milestones are ${formatNaira(-remaining)} over ${formatNaira(total)}.`;
  }

  return errors.plan || Object.keys(errors.rows).length > 0 ? errors : null;
}

/** The plan as the API wants it. Call only once `validatePlan` found nothing wrong. */
export function toProposalMilestones(rows: MilestoneRow[]): ProposalMilestone[] {
  return rows.map((row) => ({
    title: row.title.trim(),
    description: row.description.trim() || undefined,
    amount: Number(row.amount),
  }));
}

/**
 * For saving a draft: only the rows that are finished. A draft may be
 * half-written, but the backend validates every milestone it receives, so an
 * unfinished row would make the whole draft fail to save.
 */
export function finishedMilestones(rows: MilestoneRow[]): ProposalMilestone[] {
  return toProposalMilestones(
    rows.filter(
      (row) =>
        row.title.trim().length >= MILESTONE_TITLE_MIN &&
        row.title.trim().length <= MILESTONE_TITLE_MAX &&
        hasAmount(row) &&
        toKobo(row.amount) >= MIN_MILESTONE_AMOUNT * 100
    )
  );
}

/** A saved plan back into editable form rows. */
export function rowsFromMilestones(milestones: ProposalMilestone[] | undefined): MilestoneRow[] {
  return (milestones ?? []).map((m) => ({
    title: m.title,
    description: m.description ?? "",
    amount: String(m.amount),
  }));
}

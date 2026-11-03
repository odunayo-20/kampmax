"use client";

import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { formatNaira } from "@/lib/utils";
import {
  MAX_MILESTONES,
  MILESTONE_DESCRIPTION_MAX,
  MILESTONE_TITLE_MAX,
  MIN_MILESTONES,
  emptyMilestoneRow,
  planRemaining,
  planTotal,
  type MilestoneRow,
  type PlanErrors,
} from "@/lib/milestone-plan";

interface MilestonePlanEditorProps {
  rows: MilestoneRow[];
  /** The proposed amount the milestones must add up to; undefined until it is entered. */
  total: number | undefined;
  onChange: (rows: MilestoneRow[]) => void;
  errors?: PlanErrors | null;
  disabled?: boolean;
}

/**
 * Lets a freelancer split a price into milestones. The client funds and pays
 * one milestone at a time, so the freelancer is paid as each step is approved.
 */
export function MilestonePlanEditor({ rows, total, onChange, errors, disabled }: MilestonePlanEditorProps) {
  // Every row repeats the same labels, and Input derives its id from the label,
  // so each field needs its own id or the labels would all point at the first one.
  const idBase = useId();
  const enabled = rows.length > 0;
  const setRow = (index: number, patch: Partial<MilestoneRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const assigned = planTotal(rows);
  const remaining = total !== undefined ? planRemaining(rows, total) : undefined;
  const balanced = remaining === 0;

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-neutral-900">Payment plan</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Split the job into milestones. The client funds and pays one milestone at a time, so you&apos;re paid
            for each step as it&apos;s approved. Leave this off for a single payment.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-neutral-800">
          <input
            type="checkbox"
            checked={enabled}
            disabled={disabled}
            onChange={(e) =>
              onChange(e.target.checked ? Array.from({ length: MIN_MILESTONES }, emptyMilestoneRow) : [])
            }
            className="h-4 w-4 rounded border-neutral-300 text-primary-600"
          />
          Use milestones
        </label>
      </div>

      {enabled && (
        <>
          <ol className="mt-4 space-y-4">
            {rows.map((row, index) => (
              <li key={index} className="rounded-lg border border-neutral-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Milestone {index + 1}
                  </p>
                  {rows.length > MIN_MILESTONES && (
                    <button
                      type="button"
                      onClick={() => onChange(rows.filter((_, i) => i !== index))}
                      disabled={disabled}
                      aria-label={`Remove milestone ${index + 1}`}
                      className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-error-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_11rem]">
                  <Input
                    id={`${idBase}-title-${index}`}
                    label="Title"
                    value={row.title}
                    maxLength={MILESTONE_TITLE_MAX}
                    placeholder="e.g. Design mockups"
                    onChange={(e) => setRow(index, { title: e.target.value })}
                    error={errors?.rows[index]?.title}
                    disabled={disabled}
                  />
                  <Input
                    id={`${idBase}-amount-${index}`}
                    label="Amount (₦)"
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    placeholder="e.g. 50000"
                    value={row.amount}
                    onChange={(e) => setRow(index, { amount: e.target.value })}
                    error={errors?.rows[index]?.amount}
                    disabled={disabled}
                  />
                </div>
                <div className="mt-3">
                  <Input
                    id={`${idBase}-description-${index}`}
                    label="What's included (optional)"
                    value={row.description}
                    maxLength={MILESTONE_DESCRIPTION_MAX}
                    placeholder="e.g. Home, listing and checkout screens"
                    onChange={(e) => setRow(index, { description: e.target.value })}
                    disabled={disabled}
                  />
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange([...rows, emptyMilestoneRow()])}
              disabled={disabled || rows.length >= MAX_MILESTONES}
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              Add milestone
            </Button>

            <p
              role="status"
              aria-live="polite"
              className={
                "text-xs font-medium " +
                (balanced ? "text-success-700" : remaining === undefined ? "text-neutral-500" : "text-warning-800")
              }
            >
              {remaining === undefined
                ? `${formatNaira(assigned)} assigned. Enter your proposed amount above to check the total.`
                : balanced
                  ? `${formatNaira(assigned)} of ${formatNaira(total ?? 0)} assigned`
                  : remaining > 0
                    ? `${formatNaira(assigned)} of ${formatNaira(total ?? 0)} assigned · ${formatNaira(remaining)} left`
                    : `${formatNaira(assigned)} of ${formatNaira(total ?? 0)} assigned · ${formatNaira(-remaining)} over`}
            </p>
          </div>

          {errors?.plan && (
            <p role="alert" className="mt-2 text-xs text-error-600">
              {errors.plan}
            </p>
          )}
        </>
      )}
    </section>
  );
}

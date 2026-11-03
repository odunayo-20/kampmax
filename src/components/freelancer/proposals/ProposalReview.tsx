"use client";

import { Pencil, Send } from "lucide-react";
import { Button } from "@/components/ui";
import type { Opportunity, Proposal } from "@/types/opportunity";
import { formatNaira } from "@/lib/utils";
import { DURATION_LABEL, WORK_ARRANGEMENT_LABEL } from "@/config/opportunity";
import { ProposalFormValues } from "./proposal-form-values";

interface ProposalReviewProps {
  opportunity: Opportunity;
  values: ProposalFormValues;
  onEdit: () => void;
  onSubmit: () => void;
  submitting?: boolean;
}

export function ProposalReview({
  opportunity: o,
  values,
  onEdit,
  onSubmit,
  submitting,
}: ProposalReviewProps) {
  const amount = Number(values.proposedAmount);
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const delivery = Number(values.deliveryValue);

  return (
    <div className="space-y-6">
      {/* Job summary */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">{o.title}</h2>
        <p className="mt-1 text-xs text-neutral-500">{o.employer.name}</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-neutral-600 sm:grid-cols-4">
          <dt className="sr-only">Budget</dt>
          <dd className="font-medium text-neutral-800">
            {o.budget.min !== undefined || o.budget.max !== undefined
              ? `${o.budget.min !== undefined ? formatNaira(o.budget.min) : ""}–${o.budget.max !== undefined ? formatNaira(o.budget.max) : "open"}`
              : "Negotiable"}
          </dd>
          <dt className="sr-only">Duration</dt>
          <dd>{DURATION_LABEL[o.duration]}</dd>
          <dt className="sr-only">Arrangement</dt>
          <dd>{WORK_ARRANGEMENT_LABEL[o.workArrangement]}</dd>
          <dt className="sr-only">Experience</dt>
          <dd className="capitalize">{o.experienceLevel}</dd>
        </dl>
      </section>

      {/* Cover letter */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Cover letter</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
          {values.coverLetter}
        </p>
      </section>

      {/* Price & delivery */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Price & delivery</h3>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-neutral-500">Proposed amount</dt>
            <dd className="mt-0.5 font-semibold text-neutral-900">
              {hasAmount ? formatNaira(amount) : "Not specified"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Delivery estimate</dt>
            <dd className="mt-0.5 font-semibold text-neutral-900">
              {Number.isFinite(delivery) && delivery > 0
                ? `${delivery} ${values.deliveryUnit}`
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      {/* Payment plan */}
      {values.milestones.length > 0 && (
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-900">Payment plan</h3>
          <p className="mt-1 text-xs text-neutral-500">
            The client funds and pays one milestone at a time, in this order.
          </p>
          <ol className="mt-3 divide-y divide-neutral-100">
            {values.milestones.map((m, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-800">
                    {i + 1}. {m.title.trim()}
                  </p>
                  {m.description.trim() && (
                    <p className="mt-0.5 text-xs text-neutral-500">{m.description.trim()}</p>
                  )}
                </div>
                <span className="shrink-0 font-semibold text-neutral-900">{formatNaira(Number(m.amount))}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Screening answers */}
      {o.screeningQuestions.length > 0 && (
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-900">Client questions</h3>
          <div className="mt-3 space-y-4">
            {o.screeningQuestions.map((q) => (
              <div key={q.id}>
                <p className="text-sm font-medium text-neutral-800">{q.question}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">
                  {values.screeningAnswers[q.id] || <span className="italic text-neutral-400">No answer</span>}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Attachments */}
      {values.attachments.length > 0 && (
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-900">Attachments</h3>
          <ul className="mt-3 space-y-1.5">
            {values.attachments.map((a) => (
              <li key={a.id} className="text-sm text-neutral-700">
                • {a.filename}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" variant="outline" onClick={onEdit} disabled={submitting}>
          <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
          Edit
        </Button>
        <Button type="button" onClick={onSubmit} disabled={submitting}>
          <Send className="mr-1.5 h-4 w-4" aria-hidden />
          {submitting ? "Submitting…" : "Submit proposal"}
        </Button>
      </div>
    </div>
  );
}

export type { Proposal };

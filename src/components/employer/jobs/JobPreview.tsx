"use client";

import {
  Briefcase,
  Building2,
  CalendarDays,
  Clock,
  MapPin,
  Wallet,
} from "lucide-react";
import type {
  OpportunityDuration,
  OpportunityInput,
  OpportunityWorkArrangement,
} from "@/types/opportunity";
import {
  DURATION_LABEL,
  WORK_ARRANGEMENT_LABEL,
} from "@/config/opportunity";
import { useCategories } from "@/hooks/use-taxonomy";
import { formatNairaCompact } from "@/lib/utils";

function budgetLabel(input: OpportunityInput["budget"]): string {
  const { type, min, max } = input;
  const money = (v?: number) => (v === undefined ? null : formatNairaCompact(v));
  const minLabel = money(min);
  const maxLabel = money(max);
  let label = "Negotiable";
  if (minLabel && maxLabel) label = `${minLabel}–${maxLabel}`;
  else if (minLabel) label = `${minLabel}+`;
  else if (maxLabel) label = `Up to ${maxLabel}`;
  return type === "hourly" ? `${label}/hr` : type === "contract" ? `Contract · ${label}` : label;
}

function durationLabel(input: OpportunityInput["duration"]): string {
  return DURATION_LABEL[input as OpportunityDuration] ?? input;
}

/**
 * Renders a job as it will appear on the marketplace / public detail page.
 * Used for the create/edit preview step.
 */
export function JobPreview({
  values,
  employerName,
}: {
  values: OpportunityInput;
  employerName?: string;
}) {
  const { nameById } = useCategories("JOB");
  const category = nameById.get(values.categoryId) ?? "Other";
  const arrangement = WORK_ARRANGEMENT_LABEL[
    values.workArrangement as OpportunityWorkArrangement
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <span className="text-xs font-medium uppercase tracking-wider text-primary-600">
          {category}
        </span>
        <h2 className="mt-1 text-xl font-bold text-neutral-900">
          {values.title.trim() || "Untitled job"}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">{employerName}</p>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-600">
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-neutral-400" aria-hidden /> {budgetLabel(values.budget)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-neutral-400" aria-hidden /> {arrangement}
          </span>
          {values.location.city && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-neutral-400" aria-hidden /> {values.location.city}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-neutral-400" aria-hidden /> {durationLabel(values.duration)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-neutral-400" aria-hidden />
            Closes{" "}
            {values.deadline
              ? new Date(`${values.deadline}T23:59:59`).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </span>
          <span className="inline-flex items-center gap-1.5 capitalize">
            {values.experienceLevel.replace(/_/g, " ")}
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-neutral-700">
          {values.summary.trim() || "No summary yet."}
        </p>

        {values.skills.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-medium capitalize text-neutral-700">Skills</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {values.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-neutral-900">About this job</h2>
        <div className="mt-3 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-neutral-800">Description</h3>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
              {values.description.trim() || "—"}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-800">Requirements</h3>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
              {values.requirements.trim() || "—"}
            </p>
          </div>
        </div>
      </section>

      {values.screeningQuestions.length > 0 && (
        <section className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-900">Client questions</h2>
          <ul className="mt-3 space-y-2">
            {values.screeningQuestions.map((q, idx) => (
              <li key={q.id} className="text-sm text-neutral-700">
                <span className="font-medium">
                  {idx + 1}. {q.question}
                </span>
                {q.optional && (
                  <span className="ml-1 text-xs text-neutral-400">(optional)</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
          <Building2 className="h-4 w-4 text-neutral-400" aria-hidden /> Public info shown
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-neutral-500">
          Your public employer summary — name, descriptor, location and verified
          status — is attached to the job from your approved employer profile.
          Contact details are never shown.
        </p>
      </section>
    </div>
  );
}
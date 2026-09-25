"use client";

import { Pencil, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui";
import {
  EMPLOYER_BUSINESS_TYPES,
  EMPLOYER_EXPERIENCE_LEVELS,
  LEGACY_HIRING_CATEGORY_NAMES,
  EMPLOYER_PROJECT_DURATIONS,
  EMPLOYER_WORK_PREFERENCES,
  EMPLOYER_WORK_TYPES,
  isOrganizationLikeClientType,
  EMPLOYER_CLIENT_TYPES,
  EMPLOYER_CONTACT_METHODS,
} from "@/config/employer";
import { getEmployerPublicPreview } from "@/services/employer";
import { getCampusById } from "@/services/campus";
import { formatNaira } from "@/lib/utils";
import { useCategories } from "@/hooks/use-taxonomy";
import type { EmployerOnboardingDraft } from "@/types/employer";

interface StepReviewProps {
  draft: EmployerOnboardingDraft | null;
  onSubmit: () => void;
  isSubmitting?: boolean;
  onEditStep?: (step: number) => void;
}

function labelFor<T extends readonly { value: string; label: string }[]>(
  options: T,
  value: string | undefined
): string {
  if (!value) return "—";
  const found = options.find((o) => o.value === value);
  return found ? found.label : value;
}

export function StepReview({ draft, onSubmit, isSubmitting = false, onEditStep }: StepReviewProps) {
  const { nameById } = useCategories("JOB");
  const preview = getEmployerPublicPreview(draft);
  const campus = draft?.location.campusId ? getCampusById(draft.location.campusId) : undefined;
  const clientTypeLabel =
    EMPLOYER_CLIENT_TYPES.find((t) => t.value === draft?.clientType)?.label ?? "—";

  const categoryNames = (draft?.preferences.categories ?? [])
    .map((id) => nameById.get(id) ?? LEGACY_HIRING_CATEGORY_NAMES[id])
    .filter(Boolean) as string[];

  const workPrefLabel = labelFor(EMPLOYER_WORK_PREFERENCES, draft?.location.workPreference);

  const sections: {
    title: string;
    step: number;
    rows: { label: string; value: string }[];
  }[] = [
    {
      title: "Profile",
      step: 1,
      rows: [
        { label: "Client Type", value: clientTypeLabel },
        { label: "Display Name", value: draft?.profile.displayName || "—" },
        { label: "Headline", value: draft?.profile.headline || "—" },
        { label: "Industry", value: draft?.profile.industry || "—" },
        { label: "About", value: draft?.profile.about || "—" },
      ],
    },
    ...(isOrganizationLikeClientType(draft?.clientType ?? "")
      ? [
          {
            title: "Organization",
            step: 2,
            rows: [
              { label: "Organization Name", value: draft?.organization.name || "—" },
              {
                label: "Business Type",
                value: labelFor(EMPLOYER_BUSINESS_TYPES, draft?.organization.businessType),
              },
              { label: "Industry", value: draft?.organization.industry || "—" },
              { label: "Size", value: draft?.organization.size || "—" },
              { label: "Description", value: draft?.organization.description || "—" },
            ],
          },
        ]
      : []),
    {
      title: "Contact & Location",
      step: 3,
      rows: [
        { label: "Email", value: draft?.contact.email || "—" },
        { label: "Phone", value: draft?.contact.phone || "—" },
        {
          label: "Preferred Contact",
          value: labelFor(EMPLOYER_CONTACT_METHODS, draft?.contact.preferredContact),
        },
        { label: "Campus", value: campus?.name || "—" },
        { label: "City / State", value: [draft?.location.city, draft?.location.state].filter(Boolean).join(", ") || "—" },
        { label: "Work Preference", value: workPrefLabel },
        {
          label: "Remote Available",
          value: draft?.location.remoteAvailable ? "Yes" : "No",
        },
      ],
    },
    {
      title: "Hiring Preferences",
      step: 4,
      rows: [
        { label: "Categories", value: categoryNames.length ? categoryNames.join(", ") : "—" },
        {
          label: "Experience Level",
          value: labelFor(EMPLOYER_EXPERIENCE_LEVELS, draft?.preferences.experience),
        },
        { label: "Work Type", value: labelFor(EMPLOYER_WORK_TYPES, draft?.preferences.workType) },
        {
          label: "Project Duration",
          value: labelFor(EMPLOYER_PROJECT_DURATIONS, draft?.preferences.projectDuration),
        },
        {
          label: "Budget Preference",
          value:
            draft?.preferences.budgetMin || draft?.preferences.budgetMax
              ? `${draft?.preferences.budgetMin ? `₦${formatNaira(draft.preferences.budgetMin)}` : "—"} – ${
                  draft?.preferences.budgetMax ? `₦${formatNaira(draft.preferences.budgetMax)}` : "—"
                }`
              : "—",
        },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">Review Employer Profile</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Confirm the details below before submitting. You can go back to edit any section.
        </p>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="rounded-xl border border-kampmax-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-kampmax-border">
            <h3 className="font-semibold text-kampmax-text">{section.title}</h3>
            {onEditStep && (
              <button
                type="button"
                onClick={() => onEditStep(section.step)}
                className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:underline"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit
              </button>
            )}
          </div>
          <dl className="divide-y divide-kampmax-border">
            {section.rows.map((row) => (
              <div key={row.label} className="px-4 py-3 flex justify-between gap-6 text-sm">
                <dt className="text-kampmax-text-secondary">{row.label}</dt>
                <dd className="text-kampmax-text text-right font-medium break-words">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      {preview && (
        <div className="rounded-xl border border-kampmax-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-success-600" aria-hidden />
            <h3 className="font-semibold text-kampmax-text">Public Profile Preview</h3>
            {preview.verified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-success-100 text-success-700">
                Verified
              </span>
            )}
          </div>
          <p className="text-base font-semibold text-kampmax-text">{preview.name}</p>
          {preview.descriptor && (
            <p className="text-sm text-kampmax-text-secondary">{preview.descriptor}</p>
          )}
          {preview.about && <p className="mt-2 text-sm text-kampmax-text">{preview.about}</p>}
          {preview.location && (
            <p className="mt-2 text-xs text-kampmax-text-secondary">{preview.location}</p>
          )}
          <p className="mt-3 text-xs text-kampmax-text-secondary">
            Only fields the backend deems public appear here. Contact details stay private.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? "Submitting..." : "Submit Profile"}
        </Button>
      </div>
    </div>
  );
}

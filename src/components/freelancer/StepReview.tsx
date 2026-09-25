"use client";

import { Button } from "@/components/ui";
import { FREELANCER_CATEGORIES } from "@/config/freelancer";
import { useCategories } from "@/hooks/use-taxonomy";
import { FREELANCER_EMPLOYMENT_TYPES, FREELANCER_QUALIFICATIONS } from "@/config/freelancer";
import type { FreelancerOnboardingDraft } from "@/types/freelancer";
import { CheckCircle, AlertCircle } from "lucide-react";

interface Props {
  draft: FreelancerOnboardingDraft | null;
  onSubmit: () => void;
}

/** Names come from the SKILL taxonomy; legacy drafts saved with static "fc" ids still resolve. */
function categoryNames(ids: string[], nameById: Map<string, string>): string {
  return ids
    .map((id) => nameById.get(id) ?? FREELANCER_CATEGORIES.find((c) => c.id === id)?.name ?? id)
    .join(", ");
}

function employmentLabel(value: string): string {
  return FREELANCER_EMPLOYMENT_TYPES.find((t) => t.value === value)?.label ?? value;
}

function qualificationLabel(value: string): string {
  return FREELANCER_QUALIFICATIONS.find((q) => q.value === value)?.label ?? value;
}

export function StepReview({ draft, onSubmit }: Props) {
  const { nameById } = useCategories("SKILL");
  if (!draft) return null;

  const sections = [
    { title: "Profile", complete: Boolean(draft.profile.headline && draft.profile.bio) },
    { title: "Skills & Categories", complete: draft.categories.length > 0 && draft.skills.length > 0 },
    { title: "Experience", complete: draft.experience.length > 0 },
    { title: "Education", complete: draft.education.length > 0 },
    { title: "Certifications", complete: draft.certifications.length > 0 },
    { title: "Portfolio", complete: draft.portfolio.length > 0 },
    { title: "Rates", complete: Boolean(draft.rates.hourlyRate || draft.rates.projectRate) },
    { title: "Availability", complete: true },
    { title: "Work Preferences", complete: draft.preferences.workArrangements.length > 0 },
  ];

  const allComplete = sections.every((s) => s.complete);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">Review & Submit</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Review your profile before submitting for approval.
        </p>
      </div>

      {/* Completion checklist */}
      <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-200">
        {sections.map((s) => (
          <div key={s.title} className="flex items-center gap-3 px-4 py-3">
            {s.complete
              ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              : <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            }
            <span className={`text-sm ${s.complete ? "text-kampmax-text" : "text-amber-700"}`}>{s.title}</span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-kampmax-text">Profile Summary</h3>
        <div className="grid gap-2 text-sm">
          <Row label="Headline" value={draft.profile.headline} />
          <Row label="Bio" value={draft.profile.bio} />
          <Row label="City" value={draft.profile.city} />
          <Row label="Remote" value={draft.profile.remoteAvailable ? "Yes" : "No"} />
          <Row label="Categories" value={categoryNames(draft.categories, nameById)} />
          <Row label="Skills" value={draft.skills.join(", ")} />
          <Row label="Experience" value={`${draft.experience.length} position(s)`} />
          <Row label="Education" value={`${draft.education.length} record(s)`} />
          <Row label="Certifications" value={`${draft.certifications.length} record(s)`} />
          <Row label="Portfolio" value={`${draft.portfolio.length} item(s)`} />
          <Row label="Hourly Rate" value={draft.rates.hourlyRate ? `₦${draft.rates.hourlyRate.toLocaleString()}/hr` : "—"} />
          <Row label="Project Rate" value={draft.rates.projectRate ? `₦${draft.rates.projectRate.toLocaleString()}` : "—"} />
          <Row label="Availability" value={draft.availability.status.replace("_", " ")} />
          <Row label="Working Days" value={draft.availability.workingDays.join(", ")} />
          <Row label="Hours" value={`${draft.availability.workingHoursStart}–${draft.availability.workingHoursEnd}`} />
          <Row label="Work Arrangements" value={draft.preferences.workArrangements.join(", ")} />
          <Row label="Project Types" value={draft.preferences.projectTypes.join(", ")} />
        </div>
      </div>

      {/* Submit */}
      <div className="border-t border-neutral-200 pt-6">
        <Button
          onClick={onSubmit}
          className="w-full"
          size="lg"
        >
          Submit Profile for Review
        </Button>
        <p className="mt-2 text-xs text-center text-kampmax-text-secondary">
          Our team will review your profile within 48 hours.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <span className="text-kampmax-text-secondary">{label}</span>
      <span className="text-kampmax-text font-medium">{value || "—"}</span>
    </div>
  );
}

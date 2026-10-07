"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";
import { FREELANCER_QUALIFICATIONS } from "@/config/freelancer";
import { freshId } from "@/services/freelancer-onboarding";
import type { FreelancerEducation, FreelancerOnboardingDraft } from "@/types/freelancer";

interface Props {
  draft: FreelancerOnboardingDraft | null;
  onUpdate: (data: Partial<FreelancerOnboardingDraft>) => void;
}

export function StepEducation({ draft, onUpdate }: Props) {
  const items = draft?.education ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id ?? null);

  const add = () => {
    const id = freshId();
    const newItem: FreelancerEducation = { id, institution: "", qualification: "", fieldOfStudy: "", startYear: "", endYear: "", description: "" };
    onUpdate({ education: [...items, newItem] });
    setExpandedId(id);
  };

  const update = (id: string, patch: Partial<FreelancerEducation>) => {
    onUpdate({ education: items.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  };

  const remove = (id: string) => {
    onUpdate({ education: items.filter((e) => e.id !== id) });
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">Education</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Your educational background (optional but recommended).
        </p>
      </div>

      {items.map((edu) => (
        <div key={edu.id} className="border border-neutral-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setExpandedId(expandedId === edu.id ? null : edu.id)} className="text-left flex-1">
              <p className="text-sm font-medium text-kampmax-text">
                {edu.institution || "Untitled institution"}{edu.fieldOfStudy ? ` — ${edu.fieldOfStudy}` : ""}
              </p>
              <p className="text-xs text-kampmax-text-secondary">
                {edu.qualification || ""} {edu.startYear ? `(${edu.startYear}${edu.endYear ? `–${edu.endYear}` : ""})` : ""}
              </p>
            </button>
            <button type="button" onClick={() => remove(edu.id)} className="p-1 text-neutral-400 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {expandedId === edu.id && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-kampmax-text mb-1">Institution</label>
                <Input value={edu.institution} onChange={(e) => update(edu.id, { institution: e.target.value })} placeholder="e.g., University of Lagos" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-kampmax-text mb-1">Qualification</label>
                  <select
                    value={edu.qualification}
                    onChange={(e) => update(edu.id, { qualification: e.target.value })}
                    className="w-full h-10 px-3 text-sm bg-white border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
                  >
                    <option value="">Select...</option>
                    {FREELANCER_QUALIFICATIONS.map((q) => (
                      <option key={q.value} value={q.value}>{q.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-kampmax-text mb-1">Field of Study</label>
                  <Input value={edu.fieldOfStudy} onChange={(e) => update(edu.id, { fieldOfStudy: e.target.value })} placeholder="e.g., Computer Science" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-kampmax-text mb-1">Start Year</label>
                  <Input type="number" min={1990} max={2030} value={edu.startYear} onChange={(e) => update(edu.id, { startYear: e.target.value })} placeholder="2020" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-kampmax-text mb-1">End Year</label>
                  <Input type="number" min={1990} max={2035} value={edu.endYear ?? ""} onChange={(e) => update(edu.id, { endYear: e.target.value || undefined })} placeholder="2024" />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" onClick={add} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Add Education
      </Button>
    </div>
  );
}

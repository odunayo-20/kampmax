"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";
import { FREELANCER_EMPLOYMENT_TYPES } from "@/config/freelancer";
import { freshId } from "@/services/freelancer-onboarding";
import type { FreelancerExperience, FreelancerOnboardingDraft } from "@/types/freelancer";

interface Props {
  draft: FreelancerOnboardingDraft | null;
  onUpdate: (data: Partial<FreelancerOnboardingDraft>) => void;
}

export function StepExperience({ draft, onUpdate }: Props) {
  const items = draft?.experience ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id ?? null);

  const add = () => {
    const id = freshId();
    const newItem: FreelancerExperience = {
      id,
      jobTitle: "",
      company: "",
      startDate: "",
      currentlyWorking: false,
      employmentType: "full_time",
      description: "",
    };
    onUpdate({ experience: [...items, newItem] });
    setExpandedId(id);
  };

  const update = (id: string, patch: Partial<FreelancerExperience>) => {
    onUpdate({
      experience: items.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  };

  const remove = (id: string) => {
    onUpdate({ experience: items.filter((e) => e.id !== id) });
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">Work Experience</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Show clients your professional background.
        </p>
      </div>

      {items.map((exp) => (
        <div key={exp.id} className="border border-neutral-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
              className="text-left flex-1"
            >
              <p className="text-sm font-medium text-kampmax-text">
                {exp.jobTitle || "Untitled position"}{exp.company ? ` at ${exp.company}` : ""}
              </p>
              <p className="text-xs text-kampmax-text-secondary">
                {exp.startDate || "No date"}{exp.currentlyWorking ? " — Present" : ""}
              </p>
            </button>
            <button type="button" onClick={() => remove(exp.id)} className="p-1 text-neutral-400 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {expandedId === exp.id && (
            <div className="space-y-3 pt-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-kampmax-text mb-1">Job Title</label>
                  <Input
                    value={exp.jobTitle}
                    onChange={(e) => update(exp.id, { jobTitle: e.target.value })}
                    placeholder="e.g., Frontend Developer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-kampmax-text mb-1">Company</label>
                  <Input
                    value={exp.company}
                    onChange={(e) => update(exp.id, { company: e.target.value })}
                    placeholder="e.g., Acme Corp"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-kampmax-text mb-1">Start Date</label>
                  <Input
                    type="month"
                    value={exp.startDate}
                    onChange={(e) => update(exp.id, { startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-kampmax-text mb-1">Employment Type</label>
                  <select
                    value={exp.employmentType}
                    onChange={(e) => update(exp.id, { employmentType: e.target.value })}
                    className="w-full h-10 px-3 text-sm bg-white border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
                  >
                    {FREELANCER_EMPLOYMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-kampmax-text mb-1">End Date</label>
                  <Input
                    type="month"
                    value={exp.endDate ?? ""}
                    onChange={(e) => update(exp.id, { endDate: e.target.value || undefined })}
                    disabled={exp.currentlyWorking}
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-kampmax-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exp.currentlyWorking}
                      onChange={(e) => update(exp.id, { currentlyWorking: e.target.checked, endDate: e.target.checked ? undefined : exp.endDate })}
                      className="rounded border-neutral-300"
                    />
                    Currently working here
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-kampmax-text mb-1">Description</label>
                <textarea
                  value={exp.description}
                  onChange={(e) => update(exp.id, { description: e.target.value })}
                  placeholder="What did you do in this role?"
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 resize-y"
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" onClick={add} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Add Experience
      </Button>
    </div>
  );
}

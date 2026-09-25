"use client";

import { cn } from "@/lib/utils";
import { useCategoryTree } from "@/hooks/use-taxonomy";
import type { FreelancerOnboardingDraft } from "@/types/freelancer";
import { X } from "lucide-react";

interface Props {
  draft: FreelancerOnboardingDraft | null;
  onUpdate: (data: Partial<FreelancerOnboardingDraft>) => void;
}

/**
 * Categories are the root nodes of the SKILL taxonomy and skills are their
 * children, all served by the API. Skills are stored by name (the backend
 * resolves names against the admin-managed list and rejects unknown ones).
 */
export function StepSkills({ draft, onUpdate }: Props) {
  const { data: tree = [], isLoading, isError } = useCategoryTree("SKILL");

  const selectedCategories = draft?.categories ?? [];
  const selectedSkills = draft?.skills ?? [];

  const toggleCategory = (categoryId: string) => {
    const next = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((id) => id !== categoryId)
      : [...selectedCategories, categoryId];
    onUpdate({ categories: next });
  };

  const toggleSkill = (skill: string) => {
    const next = selectedSkills.includes(skill)
      ? selectedSkills.filter((s) => s !== skill)
      : [...selectedSkills, skill];
    onUpdate({ skills: next });
  };

  const visibleCategories = tree.filter((c) => selectedCategories.includes(c.id));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">Skills & Categories</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Choose the categories you work in and your key skills.
        </p>
      </div>

      {/* Categories */}
      <div>
        <label className="block text-sm font-medium text-kampmax-text mb-3">
          Categories <span className="text-red-500">*</span>
        </label>
        {isLoading && <p className="text-sm text-kampmax-text-secondary">Loading…</p>}
        {isError && (
          <p className="text-sm text-kampmax-error">Couldn&apos;t load categories. Refresh to retry.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {tree.map((cat) => {
            const selected = selectedCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                  selected
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-kampmax-text border-neutral-200 hover:border-primary-300"
                )}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-kampmax-text-secondary">
          Select one or more categories.
        </p>
      </div>

      {/* Skills (from selected categories) */}
      {visibleCategories.length > 0 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-kampmax-text">
            Skills <span className="text-red-500">*</span>
          </label>
          {visibleCategories.map((cat) => (
            <div key={cat.id} className="border border-neutral-200 rounded-lg p-4">
              <span className="text-sm font-medium text-kampmax-text">{cat.name}</span>
              <div className="flex flex-wrap gap-2 mt-3">
                {cat.children.map((skill) => {
                  const selected = selectedSkills.includes(skill.name);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.name)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                        selected
                          ? "bg-primary-50 text-primary-700 border-primary-300"
                          : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-300"
                      )}
                    >
                      {skill.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected summary */}
      {selectedSkills.length > 0 && (
        <div className="bg-primary-50 rounded-lg p-4">
          <p className="text-sm font-medium text-primary-700 mb-2">Selected skills ({selectedSkills.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-800"
              >
                {skill}
                <button type="button" onClick={() => toggleSkill(skill)} className="hover:text-primary-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

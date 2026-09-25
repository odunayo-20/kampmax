"use client";

import { useState } from "react";
import { Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  EMPLOYER_EXPERIENCE_LEVELS,
  EMPLOYER_PROJECT_DURATIONS,
  EMPLOYER_WORK_TYPES,
} from "@/config/employer";
import { useCategoryTree } from "@/hooks/use-taxonomy";
import type { EmployerOnboardingDraft } from "@/types/employer";

interface StepPreferencesProps {
  draft: EmployerOnboardingDraft | null;
  onUpdate: (data: Partial<EmployerOnboardingDraft>) => void;
}

export function StepPreferences({ draft, onUpdate }: StepPreferencesProps) {
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const prefs = draft?.preferences ?? { categories: [] as string[] };
  const { data: hiringCategories = [], isLoading: categoriesLoading } = useCategoryTree("JOB");

  const toggleCategory = (id: string) => {
    const current = prefs.categories;
    const next = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];
    onUpdate({ preferences: { ...prefs, categories: next } });
  };

  const setBudget = (key: "budgetMin" | "budgetMax", value: string) => {
    const num = value.replace(/[^\d]/g, "");
    const parsed = num ? parseInt(num, 10) : undefined;
    const min = key === "budgetMin" ? parsed : prefs.budgetMin;
    const max = key === "budgetMax" ? parsed : prefs.budgetMax;
    if (min !== undefined && max !== undefined && min > max) {
      setBudgetError("Minimum budget cannot exceed maximum budget.");
    } else {
      setBudgetError(null);
    }
    onUpdate({ preferences: { ...prefs, [key]: parsed } });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">Hiring Preferences</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          What kind of freelancers are you looking for? This helps match you with the right
          people. Detailed job requirements are posted separately when you create a job.
        </p>
      </div>

      {/* Categories */}
      <fieldset>
        <legend className="block text-sm font-medium text-kampmax-text mb-3">
          Categories You Hire For <span className="text-kampmax-error">*</span>
        </legend>
        {categoriesLoading && <p className="text-sm text-kampmax-text-secondary">Loading…</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {hiringCategories.map((cat) => {
            const selected = draft?.preferences.categories.includes(cat.id) ?? false;
            return (
              <label
                key={cat.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  selected
                    ? "border-primary-600 ring-1 ring-primary-600 bg-primary-50"
                    : "border-kampmax-border hover:border-primary-200"
                )}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleCategory(cat.id)}
                  className="mt-0.5 h-4 w-4 accent-primary-600"
                />
                <span className="flex-1">
                  <span className="block font-medium text-kampmax-text text-sm">{cat.name}</span>
                  <span className="block text-xs text-kampmax-text-secondary">
                    {cat.description ?? ""}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <Select
          id="experience"
          label="Preferred Experience Level"
          value={draft?.preferences.experience ?? ""}
          onChange={(e) =>
            onUpdate({ preferences: { ...prefs, experience: e.target.value } })
          }
          placeholder="Any level"
        >
          {EMPLOYER_EXPERIENCE_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>

        <Select
          id="workType"
          label="Preferred Work Type"
          value={draft?.preferences.workType ?? ""}
          onChange={(e) =>
            onUpdate({ preferences: { ...prefs, workType: e.target.value } })
          }
          placeholder="Select work type"
        >
          {EMPLOYER_WORK_TYPES.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </Select>
      </div>

      <Select
        id="projectDuration"
        label="Typical Project Duration"
        value={draft?.preferences.projectDuration ?? ""}
        onChange={(e) =>
          onUpdate({ preferences: { ...prefs, projectDuration: e.target.value } })
        }
        placeholder="Select a duration"
      >
        {EMPLOYER_PROJECT_DURATIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </Select>

      {/* Budget preferences — preferences only, no wallet/money logic */}
      <fieldset>
        <legend className="block text-sm font-medium text-kampmax-text mb-1.5">
          Budget Preference (Optional)
        </legend>
        <p className="text-xs text-kampmax-text-secondary mb-3">
          An indication of your typical project budget to help match you with the right
          freelancers. This is a preference only and does not reserve any money.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            id="budgetMin"
            label="Minimum project budget (₦)"
            inputMode="numeric"
            value={draft?.preferences.budgetMin ?? ""}
            onChange={(e) => setBudget("budgetMin", e.target.value)}
            placeholder="e.g., 50000"
          />
          <Input
            id="budgetMax"
            label="Maximum project budget (₦)"
            inputMode="numeric"
            value={draft?.preferences.budgetMax ?? ""}
            onChange={(e) => setBudget("budgetMax", e.target.value)}
            placeholder="e.g., 500000"
          />
        </div>
        {budgetError && (
          <p className="mt-1 text-xs text-kampmax-error">{budgetError}</p>
        )}
      </fieldset>
    </div>
  );
}

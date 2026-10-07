"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { freshId } from "@/services/freelancer-onboarding";
import type { FreelancerPortfolioItem, FreelancerOnboardingDraft } from "@/types/freelancer";
import { useCategories } from "@/hooks/use-taxonomy";
import { cn } from "@/lib/utils";

interface Props {
  draft: FreelancerOnboardingDraft | null;
  onUpdate: (data: Partial<FreelancerOnboardingDraft>) => void;
}

export function StepPortfolio({ draft, onUpdate }: Props) {
  const items = draft?.portfolio ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id ?? null);

  const add = () => {
    const id = freshId();
    const newItem: FreelancerPortfolioItem = { id, title: "", description: "", skills: [], visible: true };
    onUpdate({ portfolio: [...items, newItem] });
    setExpandedId(id);
  };

  const update = (id: string, patch: Partial<FreelancerPortfolioItem>) => {
    onUpdate({ portfolio: items.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  };

  const remove = (id: string) => {
    onUpdate({ portfolio: items.filter((p) => p.id !== id) });
    if (expandedId === id) setExpandedId(null);
  };

  const toggleSkill = (itemId: string, skill: string, current: string[]) => {
    const next = current.includes(skill) ? current.filter((s) => s !== skill) : [...current, skill];
    update(itemId, { skills: next });
  };

  const { categories: skillNodes } = useCategories("SKILL");
  const allSkills = draft?.skills ?? [];
  const showSkills =
    allSkills.length > 0
      ? allSkills
      : skillNodes.filter((n) => !n.hasChildren).slice(0, 15).map((n) => n.name);

  return (
    <div className="space-y-6">
      <p role="note" className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800">
        Projects added here are not saved with your application. After you finish, add them from Portfolio in your dashboard.
      </p>
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">Portfolio</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Showcase your best work to attract clients.
        </p>
      </div>

      {items.map((item) => (
        <div key={item.id} className="border border-neutral-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className="text-left flex-1">
              <p className="text-sm font-medium text-kampmax-text">{item.title || "Untitled project"}</p>
              <p className="text-xs text-kampmax-text-secondary">{item.skills.slice(0, 3).join(", ")}{item.skills.length > 3 ? ` +${item.skills.length - 3} more` : ""}</p>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => update(item.id, { visible: !item.visible })}
                className="p-1 text-neutral-400 hover:text-kampmax-text"
                title={item.visible ? "Visible" : "Hidden"}
              >
                {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-neutral-300" />}
              </button>
              <button type="button" onClick={() => remove(item.id)} className="p-1 text-neutral-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {expandedId === item.id && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-kampmax-text mb-1">Project Title</label>
                <Input value={item.title} onChange={(e) => update(item.id, { title: e.target.value })} placeholder="e.g., E-commerce Website Redesign" />
              </div>
              <div>
                <label className="block text-xs font-medium text-kampmax-text mb-1">Description</label>
                <textarea
                  value={item.description}
                  onChange={(e) => update(item.id, { description: e.target.value })}
                  placeholder="What was the project about? What did you deliver?"
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 resize-y"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-kampmax-text mb-1">External URL</label>
                <Input value={item.externalUrl ?? ""} onChange={(e) => update(item.id, { externalUrl: e.target.value || undefined })} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-kampmax-text mb-2">Skills used</label>
                <div className="flex flex-wrap gap-1.5">
                  {showSkills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(item.id, skill, item.skills)}
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium border transition-colors",
                        item.skills.includes(skill) ? "bg-primary-50 text-primary-700 border-primary-300" : "bg-neutral-50 text-neutral-500 border-neutral-200"
                      )}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" onClick={add} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Add Portfolio Item
      </Button>
    </div>
  );
}

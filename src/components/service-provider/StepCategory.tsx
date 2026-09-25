"use client";

import { useMemo, useState } from "react";
import { useCategoryTree } from "@/hooks/use-taxonomy";
import { Search, ChevronDown, Plus, X, Tag } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ServiceProviderOnboardingDraft } from "@/types/service-provider";


interface StepCategoryProps {
  draft: ServiceProviderOnboardingDraft | null;
  onUpdate: (data: Partial<ServiceProviderOnboardingDraft>) => void;
}

export function StepCategory({ draft, onUpdate }: StepCategoryProps) {
  const [search, setSearch] = useState("");
  const { data: tree = [] } = useCategoryTree("SERVICE");
  // Root SERVICE categories; the subtitle is the admin description or the subcategory names.
  const CATEGORIES = useMemo(
    () =>
      tree.map((n) => ({
        id: n.id,
        name: n.name,
        icon: n.icon ?? "🏷️",
        sub: n.description ?? n.children.map((c) => c.name).join(", "),
      })),
    [tree]
  );
  const [primaryOpen, setPrimaryOpen] = useState(false);
  const [secondaryOpen, setSecondaryOpen] = useState(false);

  const primaryId = draft?.category?.primaryCategoryId;
  const secondaryIds = draft?.category?.secondaryCategoryIds ?? [];

  const filteredCategories = CATEGORIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.sub.toLowerCase().includes(search.toLowerCase())
  );

  const primaryCategory = CATEGORIES.find((c) => c.id === primaryId);
  const secondaryCategories = CATEGORIES.filter((c) => secondaryIds.includes(c.id));

  const handlePrimarySelect = (id: string) => {
    onUpdate({ category: { ...draft?.category, primaryCategoryId: id } });
    setPrimaryOpen(false);
  };

  const handleSecondaryToggle = (id: string) => {
    const newIds = secondaryIds.includes(id)
      ? secondaryIds.filter((s) => s !== id)
      : [...secondaryIds, id];
    onUpdate({ category: { ...draft?.category, secondaryCategoryIds: newIds } });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const isPrimarySelected = (id: string) => primaryId === id;
  const isSecondarySelected = (id: string) => secondaryIds.includes(id);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">Service Categories</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Choose the categories that best describe your services. This helps customers find you.
        </p>
      </div>

      {/* Primary Category */}
      <div>
        <label className="block text-sm font-medium text-kampmax-text mb-2">
          Primary Category <span className="text-kampmax-error">*</span>
        </label>
        <div className="relative">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPrimaryOpen(!primaryOpen)}
              className={cn(
                "w-full flex items-center justify-between h-11 px-3 bg-white border rounded-lg",
                primaryCategory
                  ? "border-primary-300 bg-primary-50"
                  : "border-neutral-200 hover:border-primary-300"
              )}
            >
              <div className="flex items-center gap-3">
                <Search className="h-4 w-4 text-neutral-400 absolute left-3" />
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder={primaryCategory ? `Search...` : "Select primary category"}
                  className="w-full h-11 pl-10 pr-10 text-sm bg-transparent focus:outline-none"
                  readOnly
                />
              </div>
              <ChevronDown className={cn("h-4 w-4 text-neutral-400 transition-transform", primaryOpen && "rotate-180")} />
            </button>
          </div>

          {primaryOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-auto">
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search categories..."
                className="w-full h-10 px-3 pl-9 text-sm border-b border-neutral-100 focus:outline-none"
              />
              <Search className="absolute left-3 top-13 h-4 w-4 text-neutral-400" />
              <div className="py-1">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handlePrimarySelect(cat.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                      isPrimarySelected(cat.id) && "bg-primary-50 text-primary-700"
                    )}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-kampmax-text">{cat.name}</p>
                      <p className="text-xs text-kampmax-text-secondary">{cat.sub}</p>
                    </div>
                    {isPrimarySelected(cat.id) && <Tag className="h-4 w-4 text-primary-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {primaryCategory && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary-50 border border-primary-200 p-3">
            <span className="text-lg">{primaryCategory.icon}</span>
            <div>
              <p className="font-medium text-primary-800">Primary: {primaryCategory.name}</p>
              <p className="text-xs text-primary-700">{primaryCategory.sub}</p>
            </div>
            <button
              type="button"
              onClick={() => onUpdate({ category: { ...draft?.category, primaryCategoryId: undefined } })}
              className="ml-auto text-xs text-primary-600 hover:underline"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {/* Secondary Categories */}
      <div>
        <label className="block text-sm font-medium text-kampmax-text mb-2">
          Additional Categories (Optional)
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSecondaryOpen(!secondaryOpen)}
            className={cn(
              "w-full flex items-center justify-between h-11 px-3 bg-white border rounded-lg",
              secondaryIds.length > 0 ? "border-primary-300 bg-primary-50" : "border-neutral-200"
            )}
          >
            <div className="flex items-center gap-3 flex-1">
              <Search className="h-4 w-4 text-neutral-400 absolute left-3" />
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder={secondaryIds.length > 0 ? `${secondaryIds.length} selected` : "Add more categories"}
                className="w-full h-11 pl-10 pr-10 text-sm bg-transparent focus:outline-none"
                readOnly
              />
            </div>
            <ChevronDown className={cn("h-4 w-4 text-neutral-400 transition-transform", secondaryOpen && "rotate-180")} />
          </button>

          {secondaryOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-auto">
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search categories..."
                className="w-full h-10 px-3 pl-9 text-sm border-b border-neutral-100 focus:outline-none"
              />
              <Search className="absolute left-3 top-13 h-4 w-4 text-neutral-400" />
              <div className="py-1">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSecondaryToggle(cat.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                      isSecondarySelected(cat.id) && "bg-primary-50 text-primary-700"
                    )}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-kampmax-text">{cat.name}</p>
                      <p className="text-xs text-kampmax-text-secondary">{cat.sub}</p>
                    </div>
                    {isSecondarySelected(cat.id) && <span className="ml-auto h-4 w-4 rounded-full border-2 border-primary-600 flex items-center justify-center"><span className="h-1.5 w-1.5 rounded-full bg-primary-600" /></span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {secondaryIds.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {secondaryCategories.map((cat) => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 px-3 py-1 text-sm font-medium text-primary-700"
              >
                <span className="text-lg">{cat.icon}</span>
                {cat.name}
                <button
                  type="button"
                  onClick={() => handleSecondaryToggle(cat.id)}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-primary-600 hover:bg-primary-100"
                  aria-label={`Remove ${cat.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {primaryCategory && (
        <div className="rounded-lg bg-success-50 border border-success-200 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-success-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-success-800">
              <p className="font-medium">Primary category selected</p>
              <p className="mt-1">You can add up to 3 additional categories to increase your visibility.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
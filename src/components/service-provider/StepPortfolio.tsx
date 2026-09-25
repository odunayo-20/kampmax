"use client";

import { useState } from "react";
import { Plus, Image, Trash2, X, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { TaxonomySelect } from "@/components/taxonomy";
import type { ServiceProviderOnboardingDraft, ServiceProviderPortfolioItemDraft } from "@/types/service-provider";

interface StepPortfolioProps {
  draft: ServiceProviderOnboardingDraft | null;
  onUpdate: (data: Partial<ServiceProviderOnboardingDraft>) => void;
}

export function StepPortfolio({ draft, onUpdate }: StepPortfolioProps) {
  const [portfolio, setPortfolio] = useState<ServiceProviderPortfolioItemDraft[]>(
    draft?.portfolio?.map((p) => ({ ...p })) ?? []
  );
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPortfolio((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], image: dataUrl };
        onUpdate({ portfolio: updated });
        return updated;
      });
    };
    reader.readAsDataURL(file);
  };

  const addPortfolioItem = () => {
    const current = draft?.portfolio ?? portfolio;
    if (current.length >= 10) return;
    const newItem: ServiceProviderPortfolioItemDraft = {
      image: "",
      title: "",
      description: "",
      categoryId: draft?.category?.primaryCategoryId ?? "",
    };
    const next = [...current, newItem];
    setPortfolio(next);
    onUpdate({ portfolio: next });
  };

  const updateItem = (index: number, updates: Partial<ServiceProviderPortfolioItemDraft>) => {
    setPortfolio((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      onUpdate({ portfolio: updated });
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setPortfolio((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      onUpdate({ portfolio: updated });
      return updated;
    });
  };

  const openPreview = (index: number) => {
    setPreviewIndex(index);
  };

  const closePreview = () => {
    setPreviewIndex(null);
  };

  const nextPreview = () => {
    setPreviewIndex((i) => (i !== null && i < portfolio.length - 1 ? i + 1 : 0));
  };

  const prevPreview = () => {
    setPreviewIndex((i) => (i !== null && i > 0 ? i - 1 : portfolio.length - 1));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-kampmax-text">Portfolio</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-700">
              {portfolio.length}/10
            </span>
          </div>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            Showcase your work. Add photos of completed projects to build trust with customers.
          </p>
        </div>
        <Button
          variant={portfolio.length >= 10 ? "outline" : "primary"}
          onClick={addPortfolioItem}
          disabled={portfolio.length >= 10}
          className="self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          {portfolio.length >= 10 ? "Limit Reached" : "Add Portfolio Item"}
        </Button>
      </div>

      {/* Portfolio Grid */}
      {portfolio.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-neutral-300 p-12 text-center">
          <Camera className="mx-auto h-12 w-12 text-neutral-300 mb-4" />
          <h3 className="text-lg font-medium text-kampmax-text">No portfolio items yet</h3>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            Add photos of your work to show customers what you can do.
          </p>
          <Button className="mt-4" onClick={addPortfolioItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Item
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {portfolio.map((item, index) => (
            <div key={index} className="rounded-xl border border-kampmax-border bg-white overflow-hidden flex flex-col">
              <div className="relative group aspect-[4/3] bg-neutral-100 overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title || `Portfolio item ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="h-10 w-10 text-neutral-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => openPreview(index)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-kampmax-text hover:bg-neutral-100"
                    aria-label="View full size"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/90 text-white hover:bg-red-600"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3 flex-1">
                <Input
                  value={item.title}
                  onChange={(e) => updateItem(index, { title: e.target.value })}
                  placeholder="Title (e.g., iPhone 13 Screen Replacement)"
                  maxLength={80}
                />
                <textarea
                  value={item.description}
                  onChange={(e) => updateItem(index, { description: e.target.value })}
                  placeholder="Describe the project..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600/20 resize-y"
                  maxLength={300}
                />
                <TaxonomySelect
                  type="SERVICE"
                  value={item.categoryId}
                  onChange={(id) => updateItem(index, { categoryId: id })}
                  placeholder="Select category"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-screen Preview Modal */}
      {previewIndex !== null && portfolio[previewIndex]?.image && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={closePreview}
          role="dialog"
          aria-modal="true"
          aria-label="Portfolio preview"
        >
          <button
            type="button"
            onClick={closePreview}
            className="absolute top-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close preview"
          >
            <X className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={prevPreview}
            className="absolute left-6 flex h-full items-center p-4 text-white hover:text-primary-400"
            aria-label="Previous"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            type="button"
            onClick={nextPreview}
            className="absolute right-6 flex h-full items-center p-4 text-white hover:text-primary-400"
            aria-label="Next"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
          <div className="max-w-4xl max-h-[80vh]">
            <img
              src={portfolio[previewIndex].image}
              alt={portfolio[previewIndex].title || `Portfolio item ${previewIndex + 1}`}
              className="w-full h-auto max-h-[70vh] rounded-lg shadow-2xl"
            />
            <div className="mt-4 text-center text-white">
              <h3 className="text-lg font-semibold">{portfolio[previewIndex].title || "Untitled"}</h3>
              <p className="mt-1 text-sm text-white/70">{portfolio[previewIndex].description}</p>
              <p className="mt-2 text-xs text-white/50">
                {previewIndex + 1} of {portfolio.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, ImagePlus, AlertCircle } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  addSpDashboardPortfolioItem,
  getSpPortfolio,
  moveSpDashboardPortfolioItem,
  removeSpDashboardPortfolioItem,
  setSpDashboardPortfolioItemVisibility,
} from "@/services/service-provider-dashboard";
import { spServiceCategoryName } from "@/data/service-categories";
import { TaxonomySelect } from "@/components/taxonomy";
import type { ServiceProviderDashboardPortfolioItem } from "@/types/service-provider-dashboard";

/** Backend-moderation aware portfolio manager. Provider requests changes;
 * visibility/reorder/delete still go through the owner-scoped service. */
export function PortfolioManager() {
  const [items, setItems] = useState<ServiceProviderDashboardPortfolioItem[]>(() => getSpPortfolio());
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", description: "", categoryId: "", image: "" });

  function withError(res: { ok: boolean; error?: string }): boolean {
    if (res.ok) {
      setError(null);
      setItems(getSpPortfolio());
      return true;
    }
    setError(res.error ?? "Something went wrong.");
    return false;
  }

  function handleAdd() {
    const res = addSpDashboardPortfolioItem({
      title: draft.title,
      description: draft.description,
      categoryId: draft.categoryId,
      image: draft.image.trim(),
      visible: true,
    });
    if (withError(res)) {
      setShowAdd(false);
      setDraft({ title: "", description: "", categoryId: "", image: "" });
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 ring-1 ring-inset ring-error-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-kampmax-text-secondary">
          {items.length} item{items.length !== 1 ? "s" : ""} · show your best work to build trust.
        </p>
        <Button variant="primary" size="sm" onClick={() => setShowAdd((s) => !s)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Item
        </Button>
      </div>

      {showAdd && (
        <div className="space-y-4 rounded-xl border border-kampmax-border bg-white p-5">
          <h3 className="text-sm font-bold text-kampmax-text">New portfolio item</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-kampmax-text">Title *</label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="e.g., Custom PC Build"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-kampmax-text">Description</label>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                rows={2}
                placeholder="What did you create or fix?"
                className="w-full text-sm rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-kampmax-text">Category</label>
              <TaxonomySelect
                type="SERVICE"
                value={draft.categoryId}
                onChange={(id) => setDraft((d) => ({ ...d, categoryId: id }))}
                placeholder="Select category"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-kampmax-text">Image URL</label>
              <Input
                value={draft.image}
                onChange={(e) => setDraft((d) => ({ ...d, image: e.target.value }))}
                placeholder="Leave empty for a sample image"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd}>
              Add to portfolio
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-kampmax-border bg-white p-12 text-center">
          <ImagePlus className="mx-auto mb-2 h-8 w-8 text-neutral-300" aria-hidden />
          <p className="text-sm text-kampmax-text-secondary">No portfolio items yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <PortfolioCard
              key={item.id}
              item={item}
              index={index}
              total={items.length}
              onMove={(dir) => withError(moveSpDashboardPortfolioItem(item.id, dir))}
              onToggleVisibility={() =>
                withError(setSpDashboardPortfolioItemVisibility(item.id, !item.visible))
              }
              onRemove={() => withError(removeSpDashboardPortfolioItem(item.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PortfolioCard({
  item,
  index,
  total,
  onMove,
  onToggleVisibility,
  onRemove,
}: {
  item: ServiceProviderDashboardPortfolioItem;
  index: number;
  total: number;
  onMove: (dir: "up" | "down") => void;
  onToggleVisibility: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-kampmax-border bg-white">
      <div className="relative aspect-[4/3] bg-neutral-100">
        <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
        {!item.visible && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-kampmax-navy/80 px-2 py-0.5 text-[11px] font-medium text-white">
            <EyeOff className="h-3 w-3" aria-hidden /> Hidden
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate text-sm font-bold text-kampmax-text">{item.title}</h3>
        <p className="mt-0.5 truncate text-xs text-kampmax-text-muted">{spServiceCategoryName(item.categoryId)}</p>
        <p className="mt-1.5 line-clamp-2 text-xs text-kampmax-text-secondary">{item.description}</p>
        <div className="mt-3 flex items-center justify-between border-t border-kampmax-border pt-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="p-1.5"
              aria-label="Move up"
              disabled={index === 0}
              onClick={() => onMove("up")}
            >
              <ChevronUp className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1.5"
              aria-label="Move down"
              disabled={index === total - 1}
              onClick={() => onMove("down")}
            >
              <ChevronDown className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="p-1.5"
              aria-label={item.visible ? "Hide item" : "Show item"}
              onClick={onToggleVisibility}
            >
              {item.visible ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1.5 text-error-600 hover:bg-error-50"
              aria-label="Remove item"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
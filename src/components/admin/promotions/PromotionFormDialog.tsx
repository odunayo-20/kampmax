"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import {
  PROMOTION_ELIGIBILITY_LABELS,
  PROMOTION_PLACEMENT_LABELS,
  PROMOTION_TYPE_FILTER_ORDER,
  PROMOTION_TYPE_LABELS,
} from "./promotions-meta";
import {
  buildPromotionInput,
  changeType,
  emptyPromotionForm,
  formFromPromotion,
  isDiscountType,
  placementChoicesFor,
  targetListsFor,
  toggleTarget,
  validatePromotionForm,
  type PromotionFormState,
  type PromotionFormType,
  type TargetList,
} from "./promotion-form";
import type {
  ManagedPromotion,
  PromotionEligibility,
  PromotionInput,
  PromotionTargetingOptions,
} from "@/types/admin";

interface PromotionFormDialogProps {
  open: boolean;
  /** null = create mode */
  promotion?: ManagedPromotion | null;
  options: PromotionTargetingOptions;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (input: PromotionInput) => void;
}

export function PromotionFormDialog({
  open,
  promotion,
  options,
  loading = false,
  onClose,
  onSubmit,
}: PromotionFormDialogProps) {
  const [form, setForm] = useState<PromotionFormState>(() => emptyPromotionForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(promotion ? formFromPromotion(promotion) : emptyPromotionForm());
  }, [open, promotion]);

  if (!open) return null;

  const isPercent = form.type === "percentage_discount";
  const isDiscount = isDiscountType(form.type);

  function patch(next: Partial<PromotionFormState>) {
    setForm((f) => ({ ...f, ...next }));
  }

  function submit() {
    const nextErrors = validatePromotionForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(buildPromotionInput(form));
  }

  const shown = new Set(targetListsFor(form.type));
  const single = isDiscount ? " (pick one)" : "";
  const targetingFields: {
    key: TargetList;
    label: string;
    items: { id: string; name: string }[];
    searchable?: boolean;
  }[] = (
    [
      { key: "campusIds", label: isDiscount ? "Campuses" : form.type === "campus_promotion" ? "Campuses to promote" : "Only show on these campuses", items: options.campuses },
      { key: "vendorIds", label: `Vendor${single}`, items: options.vendors, searchable: true },
      { key: "productIds", label: "Products", items: options.products, searchable: true },
      { key: "categoryIds", label: "Category (pick one)", items: options.categories },
    ] as const
  ).filter((f) => shown.has(f.key));

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={promotion ? `Edit ${promotion.name}` : "New promotion"}
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="border-b border-kampmax-border px-5 py-4">
          <h2 className="text-sm font-semibold text-kampmax-text">
            {promotion ? `Edit “${promotion.name}”` : "New promotion"}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-kampmax-text-secondary">
            {isDiscount
              ? "Customers enter the code at checkout. It applies to the items you target, or to the whole basket when nothing is targeted."
              : "A featured slot is shown on the storefront while it runs. It has no code or discount."}
          </p>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              value={form.name}
              placeholder="e.g. Back to Campus Sale"
              error={errors.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm((f) => changeType(f, e.target.value as PromotionFormType))}
            >
              {PROMOTION_TYPE_FILTER_ORDER.map((value) => (
                <option key={value} value={value}>
                  {PROMOTION_TYPE_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>

          {isDiscount && (
            <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label={isPercent ? "Discount (%)" : "Amount off (₦)"}
                type="number"
                min={isPercent ? 1 : 100}
                max={isPercent ? 90 : undefined}
                value={form.discountValue}
                placeholder={isPercent ? "15" : "1500"}
                error={errors.discountValue}
                onChange={(e) => patch({ discountValue: e.target.value })}
              />
              <Input
                label="Code"
                value={form.code}
                placeholder="CAMPUS15"
                error={errors.code}
                onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
              />
              <Input
                label="Min. spend (₦)"
                hint="Optional"
                type="number"
                min={0}
                value={form.minSpend}
                placeholder="5000"
                onChange={(e) => patch({ minSpend: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {isPercent && (
                <Input
                  label="Max discount (₦)"
                  hint="Optional - caps one order"
                  type="number"
                  min={1}
                  value={form.maxDiscount}
                  placeholder="2000"
                  error={errors.maxDiscount}
                  onChange={(e) => patch({ maxDiscount: e.target.value })}
                />
              )}
              <Input
                label="Usage limit"
                hint="Optional - total redemptions"
                type="number"
                min={1}
                value={form.usageLimit}
                placeholder="200"
                error={errors.usageLimit}
                onChange={(e) => patch({ usageLimit: e.target.value })}
              />
              <Input
                label="Per customer"
                hint="Optional - times each can use it"
                type="number"
                min={1}
                value={form.perUserLimit}
                placeholder="1"
                error={errors.perUserLimit}
                onChange={(e) => patch({ perUserLimit: e.target.value })}
              />
            </div>

            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {isDiscount && (
              <Select
                label="Who can use it"
                value={form.eligibility}
                onChange={(e) => patch({ eligibility: e.target.value as PromotionEligibility })}
              >
                {(
                  Object.entries(PROMOTION_ELIGIBILITY_LABELS) as [PromotionEligibility, string][]
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
            <Select
              label={isDiscount ? "Featured on storefront" : "Appears on"}
              value={form.placement}
              error={errors.placement}
              onChange={(e) =>
                patch({ placement: e.target.value as PromotionFormState["placement"] })
              }
            >
              {placementChoicesFor(form.type).map((value) => (
                <option key={value} value={value}>
                  {PROMOTION_PLACEMENT_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(e) => patch({ startDate: e.target.value })}
            />
            <Input
              label="End date"
              type="date"
              value={form.endDate}
              error={errors.endDate}
              onChange={(e) => patch({ endDate: e.target.value })}
            />
          </div>

          <div>
            <label
              htmlFor="promo-description"
              className="mb-1.5 block text-sm font-medium text-kampmax-text"
            >
              Description{" "}
              <span className="font-normal text-kampmax-text-secondary">(internal note)</span>
            </label>
            <textarea
              id="promo-description"
              value={form.description}
              rows={2}
              placeholder="What is this campaign trying to achieve?"
              onChange={(e) => patch({ description: e.target.value })}
              className="w-full rounded-lg border border-kampmax-border bg-white px-3 py-2 text-sm placeholder:text-kampmax-text-secondary/60 focus:border-kampmax-blue focus:outline-none focus:ring-1 focus:ring-kampmax-blue"
            />
          </div>

          {/* Targeting */}
          <div className="rounded-lg border border-dashed border-kampmax-border bg-kampmax-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-kampmax-text-secondary">
              Targeting{" "}
              <span className="font-normal normal-case">
                {isDiscount
                  ? "- pick products, a category or a vendor, or leave empty for everything. Campuses can be added to any of these."
                  : "- pick what to show (up to 12)."}
              </span>
            </p>
            <div className="mt-3 space-y-3">
              {targetingFields.map((field) => (
                <ChipMultiSelect
                  key={field.key}
                  label={field.label}
                  items={field.items}
                  selected={form[field.key]}
                  searchable={field.searchable}
                  error={errors[field.key]}
                  onToggle={(id) => setForm((f) => toggleTarget(f, field.key, id))}
                  onClearAll={() => setForm((f) => ({ ...f, [field.key]: [] }))}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-kampmax-border px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-9 rounded-md border border-kampmax-border bg-white px-3.5 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-blue px-3.5 text-sm font-medium text-white transition-colors hover:bg-kampmax-blue/90 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {promotion ? "Save changes" : "Create promotion"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChipMultiSelect({
  label,
  items,
  selected,
  searchable = false,
  error,
  onToggle,
  onClearAll,
}: {
  label: string;
  items: { id: string; name: string }[];
  selected: string[];
  searchable?: boolean;
  error?: string;
  onToggle: (id: string) => void;
  onClearAll: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-kampmax-text">{label}</span>
        <span className="text-[11px] tabular-nums text-kampmax-text-secondary">
          {selected.length === 0
            ? `All ${label.replace(/ \(.*\)$/, "").toLowerCase()}`
            : `${selected.length} of ${items.length}`}
        </span>
      </div>

      <div
        className={cn(
          "rounded-md border bg-white",
          error ? "border-kampmax-error" : "border-kampmax-border"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-2 pt-2">
          {searchable ? (
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-kampmax-text-secondary" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                aria-label={`Search ${label.toLowerCase()}`}
                className="w-full rounded border-0 bg-transparent pl-6 pr-2 text-xs focus:outline-none focus:ring-0"
              />
            </div>
          ) : (
            <span />
          )}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium text-kampmax-blue transition-colors hover:bg-kampmax-blue/10"
            >
              Clear
            </button>
          )}
        </div>
        <div className="max-h-36 space-y-px overflow-y-auto p-2">
          {filtered.map((item) => {
            const checked = selected.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => onToggle(item.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors hover:bg-kampmax-muted/60",
                  checked && "bg-kampmax-blue/10"
                )}
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                    checked
                      ? "border-kampmax-blue bg-kampmax-blue text-white"
                      : "border-kampmax-border bg-white"
                  )}
                >
                  {checked && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 truncate text-kampmax-text">{item.name}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-kampmax-text-secondary">
              {items.length === 0
                ? "Nothing to pick yet."
                : `No matches for “${query.trim()}”.`}
            </p>
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-kampmax-error">{error}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { VENDOR_PROMOTION_SCOPE_LABELS, VENDOR_PROMOTION_ELIGIBILITY_LABELS } from "@/types/vendor-promotions";
import type { VendorPromotion, VendorPromotionInput, VendorPromotionResult } from "@/types/vendor-promotions";

export interface VendorPromotionFormContext {
  products: { id: string; title: string; price: number }[];
  categories: { id: string; name: string }[];
  limits: { MIN_PERCENT: number; MAX_PERCENT: number; MAX_ACTIVE_SLOTS: number };
  vendorId: string | null;
}

interface PromotionFormProps {
  context: VendorPromotionFormContext;
  initial?: VendorPromotion;
  title: string;
  submitLabel: string;
  onSubmit: (input: VendorPromotionInput) => VendorPromotionResult | Promise<VendorPromotionResult>;
}

const SCOPES = ["all_products", "products", "category", "minimum_order"] as const;

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowLocal(): string {
  return toLocalInput(new Date().toISOString());
}

export function PromotionForm({ context, initial, title, submitLabel, onSubmit }: PromotionFormProps) {
  const [form, setForm] = useState<VendorPromotionInput>(() =>
    initial
      ? {
          title: initial.title,
          description: initial.description,
          discountType: initial.discountType,
          discountValue: initial.discountValue,
          maxDiscountAmount: initial.maxDiscountAmount ?? null,
          scope: initial.scope,
          productIds: [...initial.productIds],
          categoryId: initial.categoryId ?? null,
          minOrderAmount: initial.minOrderAmount ?? null,
          startsAt: toLocalInput(initial.startsAt),
          endsAt: toLocalInput(initial.endsAt),
          eligibility: initial.eligibility,
          usageLimit: initial.usageLimit ?? null,
          perCustomerLimit: initial.perCustomerLimit ?? null,
          stackable: initial.stackable,
        }
      : {
          title: "",
          description: "",
          discountType: "percentage",
          discountValue: 10,
          maxDiscountAmount: null,
          scope: "all_products",
          productIds: [],
          categoryId: null,
          minOrderAmount: null,
          startsAt: nowLocal(),
          endsAt: "",
          eligibility: "all_customers",
          usageLimit: null,
          perCustomerLimit: null,
          stackable: false,
        }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof VendorPromotionInput>(key: K, value: VendorPromotionInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  async function submit() {
    setNotice(null);
    setError(null);
    const result = await onSubmit(form);
    if (result.ok) {
      setNotice("Saved. You can activate it from the promotions list whenever you're ready.");
    } else {
      setError(result.error ?? "Could not save promotion.");
      if (result.errors) setErrors(result.errors);
    }
  }

  return (
    <div className="rounded-xl border border-kampmax-border bg-white p-4 sm:p-6">
      <h1 className="text-lg font-bold text-kampmax-text">{title}</h1>
      <p className="mt-0.5 text-sm text-kampmax-text-secondary">
        Promotions start as drafts. The platform validates limits and computes discounts.
      </p>

      <div className="mt-5 space-y-5">
        {/* Basic */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-kampmax-text-secondary">Basics</h2>
          <Field label="Title" error={errors.title} required>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={80}
              placeholder="e.g. Weekend 10% off"
              className={inputClass(!!errors.title)}
            />
          </Field>
          <Field label="Description" error={errors.description}>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className={cn(inputClass(!!errors.description), "resize-none")}
            />
          </Field>
        </section>

        {/* Discount */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-kampmax-text-secondary">Discount</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Discount type" error={errors.discountType} required>
              <select value={form.discountType} onChange={(e) => set("discountType", e.target.value as VendorPromotionInput["discountType"])} className={inputClass(!!errors.discountType)}>
                <option value="percentage">Percentage off</option>
                <option value="fixed_amount">Fixed amount off</option>
              </select>
            </Field>
            <Field
              label={form.discountType === "percentage" ? `Discount value (%)` : "Discount amount (₦)"}
              error={errors.discountValue}
              required
              hint={
                form.discountType === "percentage"
                  ? `Platform allows ${context.limits.MIN_PERCENT}–${context.limits.MAX_PERCENT}%`
                  : undefined
              }
            >
              <input
                type="number"
                min={form.discountType === "percentage" ? context.limits.MIN_PERCENT : 1}
                max={form.discountType === "percentage" ? context.limits.MAX_PERCENT : undefined}
                step="0.01"
                value={form.discountValue}
                onChange={(e) => set("discountValue", Number(e.target.value))}
                className={inputClass(!!errors.discountValue)}
              />
            </Field>
          </div>
          {form.discountType === "percentage" && (
            <Field label="Maximum discount amount (₦, optional)" error={errors.maxDiscountAmount}>
              <input
                type="number"
                min={1}
                step="0.01"
                value={form.maxDiscountAmount ?? ""}
                onChange={(e) => set("maxDiscountAmount", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="e.g. 15000"
                className={inputClass(!!errors.maxDiscountAmount)}
              />
            </Field>
          )}
        </section>

        {/* Scope */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-kampmax-text-secondary">Scope</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {SCOPES.map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => set("scope", scope)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  form.scope === scope
                    ? "border-kampmax-blue bg-kampmax-blue/5 text-kampmax-text"
                    : "border-kampmax-border text-kampmax-text-secondary hover:border-kampmax-text-secondary/50"
                )}
              >
                {VENDOR_PROMOTION_SCOPE_LABELS[scope]}
              </button>
            ))}
          </div>

          {form.scope === "products" && (
            <Field label="Select products" error={errors.products} required>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-kampmax-border p-2">
                {context.products.length === 0 && (
                  <p className="px-2 py-2 text-xs text-kampmax-text-secondary">No products in your store yet.</p>
                )}
                {context.products.map((product) => {
                  const checked = form.productIds.includes(product.id);
                  return (
                    <label key={product.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-kampmax-muted/60">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          set("productIds", checked ? form.productIds.filter((id) => id !== product.id) : [...form.productIds, product.id])
                        }
                        className="h-4 w-4 rounded border-kampmax-border"
                      />
                      <span className="min-w-0 flex-1 truncate text-kampmax-text">{product.title}</span>
                      <span className="shrink-0 text-xs text-kampmax-text-secondary">{product.price.toLocaleString("en-NG")}</span>
                    </label>
                  );
                })}
              </div>
            </Field>
          )}

          {form.scope === "category" && (
            <Field label="Category" error={errors.categoryId} required>
              <select value={form.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value || null)} className={inputClass(!!errors.categoryId)}>
                <option value="">Select a category…</option>
                {context.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Minimum order amount (₦, optional)" error={errors.minOrderAmount}>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.minOrderAmount ?? ""}
              onChange={(e) => set("minOrderAmount", e.target.value === "" ? null : Number(e.target.value))}
              placeholder="e.g. 5000"
              className={inputClass(!!errors.minOrderAmount)}
            />
          </Field>
        </section>

        {/* Schedule */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-kampmax-text-secondary">Schedule</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts at" error={errors.startsAt} required>
              <input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} className={inputClass(!!errors.startsAt)} />
            </Field>
            <Field label="Ends at" error={errors.endsAt} required>
              <input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} className={inputClass(!!errors.endsAt)} />
            </Field>
          </div>
        </section>

        {/* Eligibility + limits */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-kampmax-text-secondary">Eligibility & limits</h2>
          <Field label="Who can use it" error={errors.eligibility} required>
            <select value={form.eligibility} onChange={(e) => set("eligibility", e.target.value as VendorPromotionInput["eligibility"])} className={inputClass(!!errors.eligibility)}>
              {(Object.keys(VENDOR_PROMOTION_ELIGIBILITY_LABELS) as (keyof typeof VENDOR_PROMOTION_ELIGIBILITY_LABELS)[]).map((key) => (
                <option key={key} value={key}>
                  {VENDOR_PROMOTION_ELIGIBILITY_LABELS[key]}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Usage limit (optional)" error={errors.usageLimit}>
              <input
                type="number"
                min={1}
                step={1}
                value={form.usageLimit ?? ""}
                onChange={(e) => set("usageLimit", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="Unlimited"
                className={inputClass(!!errors.usageLimit)}
              />
            </Field>
            <Field label="Per-customer limit (optional)" error={errors.perCustomerLimit}>
              <input
                type="number"
                min={1}
                step={1}
                value={form.perCustomerLimit ?? ""}
                onChange={(e) => set("perCustomerLimit", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="e.g. 1"
                className={inputClass(!!errors.perCustomerLimit)}
              />
            </Field>
          </div>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-kampmax-text">
            <input
              type="checkbox"
              checked={form.stackable}
              onChange={(e) => set("stackable", e.target.checked)}
              className="h-4 w-4 rounded border-kampmax-border"
            />
            Allow stacking with other promotions
          </label>
        </section>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-kampmax-error/10 px-3 py-2 text-sm font-medium text-kampmax-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-kampmax-success/10 px-3 py-2 text-sm font-medium text-kampmax-success" role="status">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {notice}
        </p>
      )}

      <div className="mt-5 flex items-center gap-2">
        <Button variant="primary" onClick={submit}>
          {submitLabel}
        </Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          <X className="mr-1 h-4 w-4" aria-hidden />
          Cancel
        </Button>
      </div>
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return cn(
    "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none",
    hasError ? "border-kampmax-error focus:border-kampmax-error" : "border-kampmax-border focus:border-kampmax-blue"
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-kampmax-text-secondary">
        {label}
        {required && <span className="text-kampmax-error"> *</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-kampmax-error">{error}</p>}
      {hint && !error && <p className="mt-1 text-[10px] text-kampmax-text-secondary">{hint}</p>}
    </div>
  );
}
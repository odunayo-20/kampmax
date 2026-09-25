"use client";

import { useState } from "react";
import { AlertCircle, Save } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { TaxonomySelect } from "@/components/taxonomy";
import type {
  ServiceProviderLocationType,
  ServiceProviderPricingModel,
  ServiceProviderServiceStatus,
} from "@/types/service-provider";
import type {
  ServiceProviderServiceInput,
  ServiceProviderDashboardService,
} from "@/types/service-provider-dashboard";

const PRICING_MODELS = [
  { value: "fixed", label: "Fixed Price", hint: "One price, e.g. ₦5,000" },
  { value: "starting_from", label: "Starting From", hint: "Base price, e.g. from ₦5,000" },
  { value: "range", label: "Price Range", hint: "Minimum to maximum price" },
  { value: "quote", label: "Quote Required", hint: "Customer requests a quote" },
] as const;

const LOCATION_TYPES: { value: ServiceProviderLocationType; label: string }[] = [
  { value: "provider_location", label: "At My Location" },
  { value: "customer_location", label: "At Customer's Location" },
  { value: "both", label: "Both" },
  { value: "online", label: "Online Only" },
  { value: "flexible", label: "Flexible" },
];

export interface ServiceFormResult {
  subtype: "created" | "updated";
  name: string;
}

/**
 * Create / edit form for a provider service. Client validation mirrors the
 * backend rules; the actual mutation happens through the owner-scoped service.
 */
export function ServiceForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: ServiceProviderDashboardService;
  onSubmit: (
    input: ServiceProviderServiceInput
  ) => { ok: boolean; error?: string; service?: ServiceProviderDashboardService };
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<ServiceProviderServiceInput>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    categoryId: initial?.categoryId ?? "",
    pricingModel: initial?.pricingModel ?? "fixed",
    price: initial?.price ?? 0,
    priceMax: initial?.priceMax,
    durationMinutes: initial?.durationMinutes ?? 60,
    locationType: initial?.locationType ?? "provider_location",
    status: initial?.status ?? ("draft" as ServiceProviderServiceStatus),
  });
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ServiceProviderServiceInput>(key: K, value: ServiceProviderServiceInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleSubmit() {
    if (!form.name.trim()) return setError("Service name is required.");
    if (!form.categoryId) return setError("Choose a category for this service.");
    setError(null);
    const res = onSubmit(form);
    if (!res.ok) setError(res.error ?? "Unable to save the service.");
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 ring-1 ring-inset ring-error-200" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-kampmax-text">
            Service name <span className="text-kampmax-error">*</span>
          </label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g., Phone Screen Replacement" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-kampmax-text">
            Category <span className="text-kampmax-error">*</span>
          </label>
          <TaxonomySelect
            type="SERVICE"
            value={form.categoryId}
            onChange={(id) => set("categoryId", id)}
            placeholder="Select category"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-kampmax-text">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          placeholder="Describe what this service includes..."
          className="w-full text-sm rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-kampmax-text">Pricing model</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRICING_MODELS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => set("pricingModel", m.value as ServiceProviderPricingModel)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                form.pricingModel === m.value
                  ? "border-primary-600 bg-primary-50"
                  : "border-kampmax-border bg-white hover:border-primary-300"
              )}
            >
              <p className="text-sm font-semibold text-kampmax-text">{m.label}</p>
              <p className="text-xs text-kampmax-text-secondary">{m.hint}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {form.pricingModel === "range" ? (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-kampmax-text">
                Min price (₦) <span className="text-kampmax-error">*</span>
              </label>
              <Input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => set("price", Number(e.target.value) || 0)}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-kampmax-text">Max price (₦)</label>
              <Input
                type="number"
                min="0"
                value={form.priceMax ?? ""}
                onChange={(e) => set("priceMax", e.target.value === "" ? undefined : Number(e.target.value))}
                inputMode="numeric"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-kampmax-text">
              Price (₦) <span className="text-kampmax-error">*</span>
            </label>
            <Input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => set("price", Number(e.target.value) || 0)}
              inputMode="numeric"
            />
            {form.pricingModel === "quote" && (
              <p className="mt-1 text-xs text-kampmax-text-muted">Price field unused; customers request a quote.</p>
            )}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-kampmax-text">
            Duration (minutes) <span className="text-kampmax-error">*</span>
          </label>
          <Input
            type="number"
            min="15"
            step="15"
            max="480"
            value={form.durationMinutes}
            onChange={(e) => set("durationMinutes", Number(e.target.value) || 60)}
            inputMode="numeric"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-kampmax-text">Location type</label>
          <Select value={form.locationType} onChange={(e) => set("locationType", e.target.value as ServiceProviderLocationType)}>
            {LOCATION_TYPES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        </div>
        {!initial && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-kampmax-text">Status</label>
            <Select value={form.status} onChange={(e) => set("status", e.target.value as ServiceProviderServiceStatus)}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-kampmax-border pt-4">
        {onCancel && (
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit}>
          <Save className="h-4 w-4 mr-1.5" />
          {initial ? "Save changes" : "Add service"}
        </Button>
      </div>
    </div>
  );
}
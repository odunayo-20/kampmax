"use client";

import { useRef, useState } from "react";
import { AlertCircle, Save } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { TaxonomySelect } from "@/components/taxonomy";
import { ServiceImagePicker } from "@/components/service-provider/ServiceImagePicker";
import { ServiceGalleryPicker, type GalleryImage } from "@/components/service-provider/ServiceGalleryPicker";
import { servicePriceLabel } from "@/lib/provider-services";
import {
  describeServiceSaveError,
  DESCRIPTION_MAX,
  DURATION_PRESETS,
  durationText,
  LOCATION_OPTIONS,
  makeSlug,
  parseDuration,
  parsePrice,
  PRICING_HINT,
  PRICING_OPTIONS,
  TITLE_MAX,
  validateServiceForm,
  type ServiceFormErrors,
} from "@/lib/service-form";
import type { ServiceProviderLocationType, ServiceProviderPricingModel } from "@/types/service-provider";
import type {
  ServiceProviderServiceInput,
  ServiceProviderDashboardService,
} from "@/types/service-provider-dashboard";

export interface ServiceFormResult {
  subtype: "created" | "updated";
  name: string;
}

type SaveResult = { ok: boolean; error?: string; status?: number; service?: ServiceProviderDashboardService };

function FieldError({ text }: { text?: string }) {
  return text ? (
    <p role="alert" className="mt-1 text-xs text-error-600">
      {text}
    </p>
  ) : null;
}

/**
 * Create / edit form for a provider service. The checks are the same as in the app; the mutation happens through
 * the owner-scoped service. A new service goes live at once (customers see it once the provider is verified).
 */
export function ServiceForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: ServiceProviderDashboardService;
  onSubmit: (input: ServiceProviderServiceInput) => SaveResult | Promise<SaveResult>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [pricingModel, setPricingModel] = useState<ServiceProviderPricingModel>(initial?.pricingModel ?? "fixed");
  const [price, setPrice] = useState(initial && initial.price > 0 ? String(initial.price) : "");
  const [duration, setDuration] = useState(String(initial?.durationMinutes ?? 60));
  const [customDuration, setCustomDuration] = useState(
    initial ? !DURATION_PRESETS.includes(initial.durationMinutes) : false
  );
  const [locationType, setLocationType] = useState<ServiceProviderLocationType>(initial?.locationType ?? "provider_location");
  const [coverMediaId, setCoverMediaId] = useState<string | null | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.images?.[0] ?? null);
  const [gallery, setGallery] = useState<GalleryImage[]>(initial?.gallery ?? []);
  const [galleryChanged, setGalleryChanged] = useState(false);
  const [errors, setErrors] = useState<ServiceFormErrors>({});
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  // One slug per name, so a retry or a double click cannot create a second copy of the service.
  const slug = useRef<{ name: string; value: string } | null>(null);

  const clear = (key: keyof ServiceFormErrors) => setErrors((e) => ({ ...e, [key]: undefined }));
  const parsedPrice = parsePrice(price, pricingModel);
  const preview =
    "value" in parsedPrice && (parsedPrice.value > 0 || pricingModel === "quote")
      ? servicePriceLabel({ pricingModel, price: parsedPrice.value })
      : null;

  async function handleSubmit() {
    if (saving) return;
    const found = validateServiceForm({ name, description, categoryId, pricingModel, price, duration });
    setErrors(found);
    setSaveError("");
    const p = parsePrice(price, pricingModel);
    const d = parseDuration(duration);
    if (Object.keys(found).length > 0 || "error" in p || "error" in d) return;

    const trimmed = name.trim();
    if (!initial && slug.current?.name !== trimmed) slug.current = { name: trimmed, value: makeSlug(trimmed) };
    setSaving(true);
    const res = await onSubmit({
      ...(initial ? {} : { slug: slug.current!.value, status: "active" as const }),
      name: trimmed,
      description: description.trim(),
      categoryId,
      pricingModel,
      price: p.value,
      durationMinutes: d.value,
      locationType,
      ...(coverMediaId !== undefined ? { coverMediaId } : {}),
      ...(galleryChanged ? { galleryMediaIds: gallery.map((g) => g.mediaId) } : {}),
    });
    setSaving(false);
    if (!res.ok) setSaveError(describeServiceSaveError(res.error, res.status));
  }

  const durationChoice = customDuration ? "other" : duration;

  return (
    <div className="space-y-5">
      {saveError && (
        <div className="flex items-start gap-2 rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 ring-1 ring-inset ring-error-200" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {saveError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Input
            label="Service name"
            value={name}
            maxLength={TITLE_MAX}
            error={errors.name}
            onChange={(e) => {
              setName(e.target.value);
              clear("name");
            }}
            placeholder="e.g. Phone screen replacement"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-kampmax-text">Category</label>
          <TaxonomySelect
            type="SERVICE"
            value={categoryId}
            onChange={(id) => {
              setCategoryId(id);
              clear("category");
            }}
            placeholder="Select category"
          />
          <FieldError text={errors.category} />
        </div>
      </div>

      <ServiceImagePicker
        imageUrl={imageUrl}
        onChange={(image) => {
          setImageUrl(image?.url ?? null);
          // A new upload replaces the saved picture; null takes it down.
          setCoverMediaId(image?.mediaId ?? null);
        }}
      />

      <ServiceGalleryPicker
        images={gallery}
        onChange={(next) => {
          setGallery(next);
          // The list sent is the whole gallery, so adding, removing and reordering all work.
          setGalleryChanged(true);
        }}
      />

      <div>
        <label htmlFor="service-description" className="mb-1.5 block text-sm font-medium text-kampmax-text">
          Description
        </label>
        <textarea
          id="service-description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            clear("description");
          }}
          rows={4}
          maxLength={DESCRIPTION_MAX}
          placeholder="What is included, what to bring, anything customers should know."
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20"
        />
        <FieldError text={errors.description} />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-kampmax-text">How do you charge?</label>
        <div role="radiogroup" aria-label="How you charge" className="grid gap-2 sm:grid-cols-2">
          {PRICING_OPTIONS.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={pricingModel === m.value}
              onClick={() => {
                setPricingModel(m.value);
                clear("price");
              }}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                pricingModel === m.value
                  ? "border-primary-600 bg-primary-50"
                  : "border-kampmax-border bg-white hover:border-primary-300"
              )}
            >
              <p className="text-sm font-semibold text-kampmax-text">{m.label}</p>
              <p className="text-xs text-kampmax-text-secondary">{PRICING_HINT[m.value]}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Input
          label={pricingModel === "quote" ? "Price (₦, optional)" : pricingModel === "hourly" ? "Price per hour (₦)" : "Price (₦)"}
          inputMode="decimal"
          value={price}
          error={errors.price}
          placeholder="5,000"
          onChange={(e) => {
            setPrice(e.target.value);
            clear("price");
          }}
        />
        {preview && (
          <p className="mt-2 flex items-center justify-between rounded-lg bg-primary-50 px-3 py-2 text-sm">
            <span className="text-xs text-kampmax-text-secondary">Customers will see</span>
            <span className="font-bold text-primary-700">{preview}</span>
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-kampmax-text">How long does it take?</label>
        <p className="mb-2 text-xs text-kampmax-text-muted">Customers can only pick a time when you say how long the job takes.</p>
        <div role="radiogroup" aria-label="Duration" className="flex flex-wrap gap-2">
          {[...DURATION_PRESETS.map((m) => ({ id: String(m), label: durationText(m) })), { id: "other", label: "Other" }].map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={durationChoice === o.id}
              onClick={() => {
                if (o.id === "other") {
                  setCustomDuration(true);
                  return;
                }
                setCustomDuration(false);
                setDuration(o.id);
                clear("duration");
              }}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                durationChoice === o.id
                  ? "border-primary-600 bg-primary-50 text-primary-700"
                  : "border-kampmax-border bg-white text-kampmax-text-secondary hover:border-primary-300"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        {customDuration && (
          <div className="mt-3 max-w-xs">
            <Input
              label="Minutes"
              inputMode="numeric"
              value={duration}
              maxLength={4}
              placeholder="75"
              hint={(() => {
                const parsed = parseDuration(duration);
                return "value" in parsed ? durationText(parsed.value) : undefined;
              })()}
              onChange={(e) => {
                setDuration(e.target.value);
                clear("duration");
              }}
            />
          </div>
        )}
        <FieldError text={errors.duration} />
      </div>

      <div className="max-w-xs">
        <label className="mb-1.5 block text-sm font-medium text-kampmax-text">Where do you work?</label>
        <Select value={locationType} onChange={(e) => setLocationType(e.target.value as ServiceProviderLocationType)}>
          {LOCATION_OPTIONS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-kampmax-border pt-4">
        {onCancel && (
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={saving}>
          <Save className="mr-1.5 h-4 w-4" aria-hidden />
          {saving ? "Saving…" : initial ? "Save changes" : "Add service"}
        </Button>
      </div>
    </div>
  );
}

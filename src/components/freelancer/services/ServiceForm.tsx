"use client";

import { useState } from "react";
import { Input, Select, Button } from "@/components/ui";
import { TaxonomySelect, TaxonomyMultiSelect } from "@/components/taxonomy";
import {
  FREELANCER_SERVICE_DELIVERY_OPTIONS,
  FREELANCER_SERVICE_PRICING_OPTIONS,
} from "@/config/freelancer-services";
import type {
  FreelancerService,
  FreelancerServiceInput,
} from "@/types/freelancer-services";
import { FREELANCER_SERVICE_PRICING } from "@/types/freelancer-services";
import { X } from "lucide-react";

export interface ServiceFormValues extends FreelancerServiceInput {}

interface ServiceFormProps {
  initial?: FreelancerService | null;
  onSubmit: (values: ServiceFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

function emptyValues(): ServiceFormValues {
  return {
    title: "",
    categoryId: "",
    skills: [],
    shortDescription: "",
    description: "",
    pricing: "fixed",
    deliveryUnit: "days",
    deliverables: [],
    revisions: undefined,
  };
}

export function ServiceForm({ initial, onSubmit, onCancel, isSubmitting }: ServiceFormProps) {
  const [values, setValues] = useState<ServiceFormValues>(() =>
    initial
      ? {
          title: initial.title,
          categoryId: initial.categoryId,
          skills: initial.skills,
          shortDescription: initial.shortDescription,
          description: initial.description,
          pricing: initial.pricing,
          price: initial.price,
          priceMax: initial.priceMax,
          deliveryValue: initial.deliveryValue,
          deliveryUnit: initial.deliveryUnit,
          revisions: initial.revisions,
          deliverables: initial.deliverables,
          coverImageUrl: initial.coverImageUrl,
        }
      : emptyValues()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newDeliverable, setNewDeliverable] = useState("");
  const [coverUrl, setCoverUrl] = useState(values.coverImageUrl ?? "");

  const set = <K extends keyof ServiceFormValues>(key: K, value: ServiceFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
  };

  function addDeliverable() {
    const next = newDeliverable.trim();
    if (!next) return;
    setValues((v) => ({ ...v, deliverables: [...v.deliverables, next] }));
    setNewDeliverable("");
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!values.title.trim()) e.title = "Title is required.";
    if (!values.categoryId) e.categoryId = "Category is required.";
    if (values.skills.length === 0) e.skills = "Select at least one skill.";
    if (!values.shortDescription.trim()) e.shortDescription = "Short description is required.";
    if (!values.description.trim()) e.description = "Description is required.";
    if (
      values.price !== undefined &&
      values.priceMax !== undefined &&
      values.priceMax < values.price
    ) {
      e.priceMax = "Maximum price must be at least the base price.";
    }
    if (coverUrl && coverUrl.trim() && !/^https?:\/\//i.test(coverUrl.trim())) {
      e.coverImageUrl = "Cover image must be a valid http(s) URL.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit({ ...values, coverImageUrl: coverUrl.trim() || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic information */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Basic information</h2>
        <div className="mt-4 space-y-4">
          <Input
            label="Service title"
            placeholder="e.g. Full-Stack Web Development"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            error={errors.title}
            maxLength={120}
            required
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-900">Category</label>
            <TaxonomySelect
              type="SERVICE"
              value={values.categoryId}
              onChange={(id) => set("categoryId", id)}
              placeholder="Select a category"
              error={errors.categoryId}
            />
          </div>
          <Input
            label="Short description"
            placeholder="One or two lines a client sees in search results."
            value={values.shortDescription}
            onChange={(e) => set("shortDescription", e.target.value)}
            error={errors.shortDescription}
            maxLength={160}
            required
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-900">
              Full description
            </label>
            <textarea
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              rows={6}
              placeholder="Describe what you offer, your process, and what's included."
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
              required
            />
            {errors.description && (
              <p className="mt-1 text-xs text-kampmax-error">{errors.description}</p>
            )}
          </div>
        </div>
      </section>

      {/* Skills */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Skills</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Select the skills that describe this service. Pick at least one.
        </p>
        <div className="mt-3">
          <TaxonomyMultiSelect
            type="SKILL"
            valueBy="name"
            leafOnly
            value={values.skills}
            onChange={(skills) => set("skills", skills)}
            placeholder="Search skills…"
          />
        </div>
        {errors.skills && <p className="mt-2 text-xs text-kampmax-error">{errors.skills}</p>}
      </section>

      {/* Pricing & delivery */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Pricing & delivery</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-900">Pricing model</label>
            <Select
              value={values.pricing}
              onChange={(e) => set("pricing", e.target.value as ServiceFormValues["pricing"])}
            >
              {FREELANCER_SERVICE_PRICING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label={values.pricing === FREELANCER_SERVICE_PRICING.HOURLY ? "Hourly rate (NGN)" : "Price (NGN)"}
            type="number"
            min={0}
            step={100}
            value={values.price ?? ""}
            onChange={(e) => set("price", e.target.value ? Number(e.target.value) : undefined)}
            error={errors.price}
          />
          {values.pricing === FREELANCER_SERVICE_PRICING.STARTING_AT && (
            <Input
              label="Maximum price (NGN, optional)"
              type="number"
              min={0}
              step={100}
              value={values.priceMax ?? ""}
              onChange={(e) => set("priceMax", e.target.value ? Number(e.target.value) : undefined)}
              error={errors.priceMax}
            />
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-900">Delivery time</label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                value={values.deliveryValue ?? ""}
                onChange={(e) =>
                  set("deliveryValue", e.target.value ? Number(e.target.value) : undefined)
                }
                aria-label="Delivery estimate value"
                className="w-24"
              />
              <Select
                value={values.deliveryUnit}
                onChange={(e) =>
                  set("deliveryUnit", e.target.value as ServiceFormValues["deliveryUnit"])
                }
                aria-label="Delivery estimate unit"
                className="flex-1"
              >
                {FREELANCER_SERVICE_DELIVERY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <Input
            label="Revisions included (optional)"
            type="number"
            min={0}
            value={values.revisions ?? ""}
            onChange={(e) => set("revisions", e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </section>

      {/* Deliverables */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Deliverables</h2>
        <p className="mt-1 text-xs text-neutral-500">
          What the client receives when the service is complete.
        </p>
        <div className="mt-3 space-y-2">
          {values.deliverables.map((d) => (
            <div
              key={d}
              className="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
            >
              {d}
              <button
                type="button"
                onClick={() =>
                  setValues((v) => ({ ...v, deliverables: v.deliverables.filter((x) => x !== d) }))
                }
                className="rounded p-1 text-neutral-400 hover:text-error-600"
                aria-label={`Remove deliverable: ${d}`}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={newDeliverable}
              onChange={(e) => setNewDeliverable(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDeliverable();
                }
              }}
              placeholder="Add a deliverable and press Enter"
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
            />
            <Button type="button" variant="secondary" onClick={addDeliverable}>
              Add
            </Button>
          </div>
        </div>
      </section>

      {/* Cover image */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Cover image</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Provide a public image URL. Only http(s) URLs are accepted.
        </p>
        <Input
          className="mt-3"
          label="Cover image URL (optional)"
          placeholder="https://…"
          value={coverUrl}
          onChange={(e) => {
            setCoverUrl(e.target.value);
          }}
          error={errors.coverImageUrl}
        />
      </section>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : initial ? "Save service" : "Create service"}
        </Button>
      </div>
    </form>
  );
}

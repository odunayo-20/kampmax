"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Camera, Loader2, Trash2 } from "lucide-react";
import { Button, Input, Select, Avatar } from "@/components/ui";
import { cn, isValidEmail } from "@/lib/utils";
import type {
  EmployerOnboardingDraft,
  EmployerProfileUpdatePayload,
} from "@/types/employer";
import {
  EMPLOYER_CONTACT_METHODS,
  EMPLOYER_EXPERIENCE_LEVELS,
  EMPLOYER_WORK_TYPES,
  EMPLOYER_PROJECT_DURATIONS,
  EMPLOYER_BUSINESS_TYPES,
  EMPLOYER_ORG_SIZES,
  EMPLOYER_WORK_PREFERENCES,
  isOrganizationLikeClientType,
} from "@/config/employer";
import { getEmployerCampusOptions } from "@/services/employer";
import { useCategoryTree } from "@/hooks/use-taxonomy";
import { fetchCampuses } from "@/services/campus";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

function field(
  value?: string
): string {
  return value?.trim() ? value.trim() : "";
}

interface EditFormState {
  displayName: string;
  headline: string;
  about: string;
  industry: string;
  website: string;
  logoUrl: string | null;
  orgName: string;
  orgBusinessType: string;
  orgIndustry: string;
  orgDescription: string;
  orgSize: string;
  orgWebsite: string;
  contactEmail: string;
  contactPhone: string;
  contactPreferred: string;
  campusId: string;
  city: string;
  state: string;
  workPreference: string;
  remoteAvailable: boolean;
  categories: string[];
  experience: string;
  workType: string;
  projectDuration: string;
  budgetMin: string;
  budgetMax: string;
}

function toFormState(draft: EmployerOnboardingDraft): EditFormState {
  return {
    displayName: field(draft.profile.displayName),
    headline: field(draft.profile.headline),
    about: field(draft.profile.about),
    industry: field(draft.profile.industry),
    website: field(draft.profile.website),
    logoUrl: draft.profile.logoUrl ?? null,
    orgName: field(draft.organization.name),
    orgBusinessType: field(draft.organization.businessType),
    orgIndustry: field(draft.organization.industry),
    orgDescription: field(draft.organization.description),
    orgSize: field(draft.organization.size),
    orgWebsite: field(draft.organization.website),
    contactEmail: field(draft.contact.email),
    contactPhone: field(draft.contact.phone),
    contactPreferred: field(draft.contact.preferredContact),
    campusId: field(draft.location.campusId) || "",
    city: field(draft.location.city),
    state: field(draft.location.state),
    workPreference: draft.location.workPreference || "",
    remoteAvailable: !!draft.location.remoteAvailable,
    categories: draft.preferences.categories ?? [],
    experience: field(draft.preferences.experience),
    workType: field(draft.preferences.workType),
    projectDuration: field(draft.preferences.projectDuration),
    budgetMin: typeof draft.preferences.budgetMin === "number" ? String(draft.preferences.budgetMin) : "",
    budgetMax: typeof draft.preferences.budgetMax === "number" ? String(draft.preferences.budgetMax) : "",
  };
}

/**
 * Explicit payload — never `updateProfile(formData)`. Only the editable
 * employer fields are sent; ownership, status, verification and maybe
 * admin fields are backend-owned and never leave the client here.
 */
function toPayload(form: EditFormState): EmployerProfileUpdatePayload {
  const payload: EmployerProfileUpdatePayload = {};

  payload.profile = {
    displayName: form.displayName.trim() || undefined,
    headline: form.headline.trim() || undefined,
    about: form.about.trim() || undefined,
    industry: form.industry.trim() || undefined,
    website: form.website.trim() || undefined,
    logoUrl: form.logoUrl,
  };

  payload.organization = {
    name: form.orgName.trim() || undefined,
    businessType: form.orgBusinessType || undefined,
    industry: form.orgIndustry.trim() || undefined,
    description: form.orgDescription.trim() || undefined,
    size: form.orgSize || undefined,
    website: form.orgWebsite.trim() || undefined,
  };

  payload.contact = {
    email: form.contactEmail.trim() || undefined,
    phone: form.contactPhone.trim() || undefined,
    preferredContact: form.contactPreferred || undefined,
  };

  payload.location = {
    campusId: form.campusId || undefined,
    city: form.city.trim() || undefined,
    state: form.state.trim() || undefined,
    workPreference: (form.workPreference as EmployerOnboardingDraft["location"]["workPreference"]) || "",
    remoteAvailable: form.remoteAvailable,
  };

  const budgetMin = form.budgetMin.trim();
  const budgetMax = form.budgetMax.trim();
  payload.preferences = {
    categories: form.categories,
    experience: form.experience || undefined,
    workType: form.workType || undefined,
    projectDuration: form.projectDuration || undefined,
    budgetMin: budgetMin && Number.isFinite(Number(budgetMin)) ? Number(budgetMin) : undefined,
    budgetMax: budgetMax && Number.isFinite(Number(budgetMax)) ? Number(budgetMax) : undefined,
  };

  return payload;
}

export function EmployerProfileEditForm({
  draft,
  isPending,
  isUpdating,
  onSave,
}: {
  draft: EmployerOnboardingDraft;
  isPending: boolean;
  isUpdating: boolean;
  onSave: (payload: EmployerProfileUpdatePayload) => void;
}) {
  const router = useRouter();
  const { data: hiringCategories = [] } = useCategoryTree("JOB");
  const [form, setForm] = useState<EditFormState>(() => toFormState(draft));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [logoError, setLogoError] = useState<string | null>(null);
  // undefined = unchanged, File = upload on save, null = remove.
  const [logoFile, setLogoFile] = useState<File | null | undefined>(undefined);
  const [campuses, setCampuses] = useState(getEmployerCampusOptions());

  // Load real campuses (UUID ids) — the sync cache starts with mock slug ids.
  useEffect(() => {
    let active = true;
    fetchCampuses({ limit: 100 }).then((res) => {
      if (active && !res.error && res.data.length > 0) setCampuses(res.data);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isPending) {
      setForm(toFormState(draft));
    }
    // only re-sync when the query finishes loading, not on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  const isOrgLike = isOrganizationLikeClientType(draft.clientType);

  const set = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleCategory = (id: string) =>
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(id)
        ? prev.categories.filter((c) => c !== id)
        : [...prev.categories, id],
    }));

  const handleLogo = (file: File | null) => {
    setLogoError(null);
    if (!file) {
      set("logoUrl", null);
      setLogoFile(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setLogoError("Please select an image file (PNG, JPG or WebP).");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Image must be less than 5MB.");
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      set("logoUrl", (event.target?.result as string) ?? null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};

    if (!form.displayName.trim()) {
      errors.displayName = "Display name is required.";
    } else if (form.displayName.trim().length > 80) {
      errors.displayName = "Keep it under 80 characters.";
    }
    if (!form.headline.trim()) {
      errors.headline = "Headline is required.";
    } else if (form.headline.trim().length > 100) {
      errors.headline = "Keep it under 100 characters.";
    }
    if (form.contactEmail.trim() && !isValidEmail(form.contactEmail.trim())) {
      errors.contactEmail = "Enter a valid email address.";
    }
    if (
      form.budgetMin.trim() &&
      form.budgetMax.trim() &&
      Number.isFinite(Number(form.budgetMin)) &&
      Number.isFinite(Number(form.budgetMax)) &&
      Number(form.budgetMin) > Number(form.budgetMax)
    ) {
      errors.budgetMin = "Min can't be above max.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    onSave({ ...toPayload(form), logoFile });
  };

  const budgetReadOnly = !form.budgetMin.trim() && !form.budgetMax.trim();

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Add a live status region for screen readers */}
      <div className="sr-only" role="status" aria-live="polite">
        {isUpdating ? "Saving your changes..." : ""}
      </div>

      {/* Organization logo / avatar */}
      <section aria-labelledby="edit-photo-heading" className="rounded-xl border border-kampmax-border bg-white p-5">
        <h2 id="edit-photo-heading" className="text-sm font-bold text-kampmax-text">
          Profile photo / logo
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Avatar name={form.displayName || draft.userId} src={form.logoUrl ?? undefined} size="lg" />
          <div className="flex flex-col gap-1.5">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
              <Camera className="h-3.5 w-3.5" aria-hidden />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleLogo(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
              Upload
            </label>
            {form.logoUrl && (
              <button
                type="button"
                onClick={() => handleLogo(null)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-error-600 hover:bg-error-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
              </button>
            )}
            {logoError && (
              <p className="text-xs text-error-600" role="alert">
                {logoError}
              </p>
            )}
            <p className="text-xs text-kampmax-text-secondary">
              PNG, JPG or WebP, max 5MB. Square recommended.
            </p>
          </div>
        </div>
      </section>

      {/* Basic information */}
      <section aria-labelledby="edit-basic-heading" className="rounded-xl border border-kampmax-border bg-white p-5">
        <h2 id="edit-basic-heading" className="text-sm font-bold text-kampmax-text">
          Basic information
        </h2>
        <div className="mt-4 space-y-4">
          <Input
            label="Display name"
            id="emp-display-name"
            maxLength={80}
            required
            value={form.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            error={fieldErrors.displayName}
          />
          <Input
            label="Professional headline"
            id="emp-headline"
            maxLength={100}
            required
            value={form.headline}
            onChange={(e) => set("headline", e.target.value)}
            error={fieldErrors.headline}
            hint="e.g. Founder & Product Manager"
          />
          <div>
            <label htmlFor="emp-about" className="block text-sm font-medium text-kampmax-text">
              About / bio
            </label>
            <textarea
              id="emp-about"
              rows={4}
              maxLength={800}
              value={form.about}
              onChange={(e) => set("about", e.target.value)}
              className="mt-1.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-kampmax-text focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/40"
              placeholder="Tell freelancers what you're working on and who you're looking for."
            />
            <p className="mt-1 text-xs text-kampmax-text-secondary">{form.about.length}/800</p>
          </div>
        </div>
      </section>

      {/* Organization information */}
      {isOrgLike && (
        <section aria-labelledby="edit-org-heading" className="rounded-xl border border-kampmax-border bg-white p-5">
          <h2 id="edit-org-heading" className="text-sm font-bold text-kampmax-text">
            Organization information
          </h2>
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            Details about the business or organization you're hiring for.
          </p>
          <div className="mt-4 space-y-4">
            <Input
              label="Organization name"
              id="emp-org-name"
              maxLength={100}
              value={form.orgName}
              onChange={(e) => set("orgName", e.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Business type"
                id="emp-org-biz-type"
                value={form.orgBusinessType}
                onChange={(e) => set("orgBusinessType", e.target.value)}
                placeholder="Select a type"
              >
                {EMPLOYER_BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Organization size"
                id="emp-org-size"
                value={form.orgSize}
                onChange={(e) => set("orgSize", e.target.value)}
                placeholder="Select a size"
              >
                {EMPLOYER_ORG_SIZES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Industry"
                id="emp-org-industry"
                maxLength={60}
                value={form.orgIndustry}
                onChange={(e) => set("orgIndustry", e.target.value)}
                placeholder="e.g. Technology"
              />
              <Input
                label="Organization website"
                id="emp-org-website"
                maxLength={200}
                value={form.orgWebsite}
                onChange={(e) => set("orgWebsite", e.target.value)}
                placeholder="https://example.com"
                type="url"
              />
            </div>
            <div>
              <label htmlFor="emp-org-description" className="block text-sm font-medium text-kampmax-text">
                Organization description
              </label>
              <textarea
                id="emp-org-description"
                rows={4}
                maxLength={800}
                value={form.orgDescription}
                onChange={(e) => set("orgDescription", e.target.value)}
                className="mt-1.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-kampmax-text focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/40"
                placeholder="What does your organization do?"
              />
              <p className="mt-1 text-xs text-kampmax-text-secondary">{form.orgDescription.length}/800</p>
            </div>
          </div>
        </section>
      )}

      {/* Contact + location */}
      <section aria-labelledby="edit-contact-heading" className="rounded-xl border border-kampmax-border bg-white p-5">
        <h2 id="edit-contact-heading" className="text-sm font-bold text-kampmax-text">
          Contact & location
        </h2>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Contact email"
              id="emp-contact-email"
              type="email"
              value={form.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
              error={fieldErrors.contactEmail}
            />
            <Input
              label="Phone"
              id="emp-contact-phone"
              type="tel"
              value={form.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Preferred contact method"
              id="emp-contact-method"
              value={form.contactPreferred}
              onChange={(e) => set("contactPreferred", e.target.value)}
              placeholder="Select a method"
            >
              {EMPLOYER_CONTACT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            <Select
              label="Primary campus"
              id="emp-campus"
              value={form.campusId}
              onChange={(e) => set("campusId", e.target.value)}
              placeholder="Select a campus"
            >
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="City"
              id="emp-city"
              maxLength={60}
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
            <Input
              label="State"
              id="emp-state"
              maxLength={60}
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Work preference"
              id="emp-work-pref"
              value={form.workPreference}
              onChange={(e) => set("workPreference", e.target.value)}
              placeholder="Select a preference"
            >
              {EMPLOYER_WORK_PREFERENCES.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2.5 text-sm font-medium text-kampmax-text">
              <input
                type="checkbox"
                checked={form.remoteAvailable}
                onChange={(e) => set("remoteAvailable", e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600"
              />
              Remote work is available
            </label>
          </div>
        </div>
      </section>

      {/* Website + hiring preferences */}
      <section aria-labelledby="edit-prefs-heading" className="rounded-xl border border-kampmax-border bg-white p-5">
        <h2 id="edit-prefs-heading" className="text-sm font-bold text-kampmax-text">
          Hiring preferences
        </h2>
        <div className="mt-4 space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-kampmax-text">
              Categories you're hiring for
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {hiringCategories.map((c) => {
                const checked = form.categories.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm",
                      checked ? "border-primary-600 bg-primary-50" : "border-neutral-200"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(c.id)}
                      className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600"
                    />
                    <span>
                      <span className="font-medium text-kampmax-text">{c.name}</span>
                      <span className="block text-xs text-kampmax-text-secondary">{c.description ?? ""}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Experience level"
              id="emp-experience"
              value={form.experience}
              onChange={(e) => set("experience", e.target.value)}
              placeholder="Any level"
            >
              {EMPLOYER_EXPERIENCE_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
            <Select
              label="Work type"
              id="emp-work-type"
              value={form.workType}
              onChange={(e) => set("workType", e.target.value)}
              placeholder="Select a type"
            >
              {EMPLOYER_WORK_TYPES.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Project duration"
              id="emp-duration"
              value={form.projectDuration}
              onChange={(e) => set("projectDuration", e.target.value)}
              placeholder="Select a duration"
            >
              {EMPLOYER_PROJECT_DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
            <div />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Budget min (₦)"
              id="emp-budget-min"
              type="number"
              min={0}
              value={form.budgetMin}
              onChange={(e) => set("budgetMin", e.target.value)}
              error={fieldErrors.budgetMin}
            />
            <Input
              label="Budget max (₦)"
              id="emp-budget-max"
              type="number"
              min={0}
              value={form.budgetMax}
              onChange={(e) => set("budgetMax", e.target.value)}
            />
          </div>
          <p className="text-xs text-kampmax-text-secondary">
            {budgetReadOnly
              ? "Leave blank to accept any budget."
              : "Your budget helps freelancers scope their proposal."}
          </p>
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/employer/profile")}
          className="grow sm:grow-0"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isUpdating}
          className="grow sm:grow-0"
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Saving...
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}
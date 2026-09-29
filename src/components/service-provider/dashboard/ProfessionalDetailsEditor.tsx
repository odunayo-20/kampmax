"use client";

import { useEffect, useState } from "react";
import { AlertCircle, BadgeCheck, Save } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  fetchSpProfileRecordLive,
  getSpProfileRecord,
  updateSpProfile,
  updateSpProfileLive,
} from "@/services/service-provider-dashboard";
import type { ServiceProviderDashboardProfileState } from "@/types/service-provider-dashboard";

const EMPTY: ServiceProviderDashboardProfileState = {
  displayName: "",
  bio: "",
  description: "",
  languages: [],
  qualifications: [],
  certifications: [],
};

/**
 * Edits display name, tagline, bio, experience, languages, qualifications and
 * certifications. Changes to review-sensitive fields mark the profile for
 * re-verification (backend-decided); the provider can never change status.
 */
export function ProfessionalDetailsEditor({ onSaved }: { onSaved?: () => void }) {
  const [initial] = useState<ServiceProviderDashboardProfileState>(
    () => ({ ...EMPTY, ...getSpProfileRecord()?.profile })
  );
  const [form, setForm] = useState<ServiceProviderDashboardProfileState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSpProfileRecordLive()
      .then((record) => {
        if (!cancelled && record?.profile) {
          setForm((prev) => ({
            ...prev,
            ...record.profile,
            displayName: record.profile.displayName || prev.displayName,
            bio: record.profile.bio || prev.bio,
            description: record.profile.description || prev.description,
            yearsExperience: record.profile.yearsExperience ?? prev.yearsExperience,
          }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof ServiceProviderDashboardProfileState>(key: K, value: ServiceProviderDashboardProfileState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSave() {
    if (!form.displayName.trim()) {
      setError("Display name is required.");
      setNotice(null);
      return;
    }
    setError(null);
    setSaving(true);

    try {
      const liveRes = await updateSpProfileLive({
        displayName: form.displayName.trim(),
        bio: form.bio?.trim(),
        description: form.description?.trim(),
        yearsExperience: form.yearsExperience,
      });

      if (liveRes.ok) {
        updateSpProfile({
          displayName: form.displayName.trim(),
          tagline: form.tagline?.trim(),
          bio: form.bio?.trim(),
          description: form.description?.trim(),
          yearsExperience: form.yearsExperience,
          languages: form.languages,
          qualifications: form.qualifications,
          certifications: form.certifications,
        });
        setNotice("Profile saved to live server.");
        onSaved?.();
        return;
      }
    } catch {
      // Fallback to local
    } finally {
      setSaving(false);
    }

    const res = updateSpProfile({
      displayName: form.displayName.trim(),
      tagline: form.tagline?.trim(),
      bio: form.bio?.trim(),
      description: form.description?.trim(),
      yearsExperience: form.yearsExperience,
      languages: form.languages,
      qualifications: form.qualifications,
      certifications: form.certifications,
    });
    if (!res.ok) {
      setError(res.error ?? "Unable to save profile.");
      setNotice(null);
      return;
    }
    setNotice(
      res.mayRequireReview
        ? "Saved. Profile changes are pending review and may require re-verification."
        : "Profile saved."
    );
    onSaved?.();
  }

  return (
    <div className="space-y-5">
      {(error || notice) && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ring-1 ring-inset",
            error
              ? "bg-error-50 text-error-700 ring-error-200"
              : "bg-success-50 text-success-700 ring-success-200"
          )}
          role="status"
        >
          {error ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          )}
          {error ?? notice}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-kampmax-text">
            Display name <span className="text-kampmax-error">*</span>
          </label>
          <Input value={form.displayName} onChange={(e) => set("displayName", e.target.value)} placeholder="e.g., Kelechi Technologies" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-kampmax-text">Tagline</label>
          <Input value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} placeholder="e.g., Fast, reliable device repair" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-kampmax-text">Short description</label>
        <textarea
          value={form.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          placeholder="One or two sentences about what you offer."
          className="w-full text-sm rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-kampmax-text">Bio / professional story</label>
        <textarea
          value={form.bio ?? ""}
          onChange={(e) => set("bio", e.target.value)}
          rows={3}
          placeholder="Share your experience and approach."
          className="w-full text-sm rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-kampmax-text">Years of experience</label>
          <Input
            type="number"
            min="0"
            value={form.yearsExperience ?? ""}
            onChange={(e) => set("yearsExperience", e.target.value === "" ? undefined : Number(e.target.value))}
            placeholder="e.g., 4"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-kampmax-text">Service category</label>
          <p className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-kampmax-text-secondary">
            Managed in onboarding
          </p>
          <p className="mt-1 text-xs text-kampmax-text-muted">
            Categories are set when you complete your application.
          </p>
        </div>
      </div>

      {([["languages", "Languages"], ["qualifications", "Qualifications"], ["certifications", "Certifications"]] as const).map(
        ([key, label]) => (
          <div key={key}>
            <label className="mb-1.5 block text-sm font-medium text-kampmax-text">{label}</label>
            <Input
              value={form[key].join(", ")}
              onChange={(e) =>
                set(key, e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
              }
              placeholder="Comma separated"
            />
          </div>
        )
      )}

      <div className="flex items-center justify-end gap-2 border-t border-kampmax-border pt-4">
        <p className="mr-auto text-xs text-kampmax-text-muted">Logo and cover photo are not editable in this prototype.</p>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-1.5" />
          Save changes
        </Button>
      </div>
    </div>
  );
}
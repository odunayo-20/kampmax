"use client";

import { useEffect, useState } from "react";
import { AlertCircle, BadgeCheck, Save } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { fetchSpProfileRecordLive, updateSpProfileLive } from "@/services/service-provider-dashboard";

interface Form {
  displayName: string;
  bio: string;
  yearsExperience?: number;
}

/**
 * Edits the details customers see on the provider's public profile: display
 * name, bio and years of experience. These are saved on the server; the
 * provider can never change their verification status from here.
 */
export function ProfessionalDetailsEditor({ onSaved }: { onSaved?: () => void }) {
  const [form, setForm] = useState<Form | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    fetchSpProfileRecordLive()
      .then((record) => {
        if (cancelled) return;
        setForm({
          displayName: record.profile.displayName ?? "",
          bio: record.profile.bio ?? record.profile.description ?? "",
          yearsExperience: record.profile.yearsExperience,
        });
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (!form) {
    return loadFailed ? (
      <p role="alert" className="text-sm text-kampmax-text-secondary">
        We couldn&apos;t load your details.{" "}
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold text-primary-600 hover:underline">
          Try again
        </button>
      </p>
    ) : (
      <p className="text-sm text-kampmax-text-secondary">Loading your details…</p>
    );
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  async function handleSave() {
    if (!form) return;
    if (!form.displayName.trim()) {
      setError("Display name is required.");
      setNotice(null);
      return;
    }
    setError(null);
    setNotice(null);
    setSaving(true);
    const res = await updateSpProfileLive({
      displayName: form.displayName.trim(),
      bio: form.bio.trim(),
      yearsExperience: form.yearsExperience,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Unable to save your profile.");
      return;
    }
    setNotice("Profile saved.");
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

      <div>
        <label htmlFor="sp-display-name" className="mb-1.5 block text-sm font-medium text-kampmax-text">
          Display name <span className="text-kampmax-error">*</span>
        </label>
        <Input
          id="sp-display-name"
          value={form.displayName}
          onChange={(e) => set("displayName", e.target.value)}
          placeholder="e.g., Kelechi Technologies"
        />
      </div>

      <div>
        <label htmlFor="sp-bio" className="mb-1.5 block text-sm font-medium text-kampmax-text">
          Bio / professional story
        </label>
        <textarea
          id="sp-bio"
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          rows={4}
          placeholder="Share your experience and approach."
          className="w-full text-sm rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sp-years" className="mb-1.5 block text-sm font-medium text-kampmax-text">
            Years of experience
          </label>
          <Input
            id="sp-years"
            type="number"
            min="0"
            value={form.yearsExperience ?? ""}
            onChange={(e) => set("yearsExperience", e.target.value === "" ? undefined : Number(e.target.value))}
            placeholder="e.g., 4"
            inputMode="numeric"
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-kampmax-text">Service category</p>
          <p className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-kampmax-text-secondary">
            Set with each service
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-kampmax-border pt-4">
        <Button onClick={() => void handleSave()} disabled={saving}>
          <Save className="mr-1.5 h-4 w-4" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

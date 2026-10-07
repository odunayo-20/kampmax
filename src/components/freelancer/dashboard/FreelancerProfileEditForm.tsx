"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Avatar, Button, Input, Select } from "@/components/ui";
import { useProviderImageUpload } from "@/hooks/useProviderImageUpload";
import { updateMyFreelancerProfile } from "@/services/freelancer";
import type { FreelancerPrivateProfile } from "@/services/freelancer";

export interface FreelancerProfileEditValues {
  professionalTitle: string;
  bio: string;
  city: string;
  hourlyRate: string;
  availabilityStatus: string;
  skills: string;
}

function toFormValues(profile: {
  headline?: string | null;
  bio?: string | null;
  city?: string | null;
  hourlyRate?: number | null;
  skills?: string[];
} | null): FreelancerProfileEditValues {
  return {
    professionalTitle: profile?.headline ?? "",
    bio: profile?.bio ?? "",
    city: profile?.city ?? "",
    hourlyRate: profile?.hourlyRate != null ? String(profile.hourlyRate) : "",
    availabilityStatus: "AVAILABLE",
    skills: (profile?.skills ?? []).join(", "),
  };
}

const AVAILABILITY_OPTIONS = [
  { value: "AVAILABLE", label: "Available now" },
  { value: "BUSY", label: "Busy" },
  { value: "UNAVAILABLE", label: "Not available" },
];

export function FreelancerProfileEditForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: {
    headline?: string | null;
    bio?: string | null;
    city?: string | null;
    hourlyRate?: number | null;
    skills?: string[];
    photoUrl?: string | null;
  } | null;
  onSaved: (profile: FreelancerPrivateProfile) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<FreelancerProfileEditValues>(() => toFormValues(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The photo is uploaded when chosen and applied when the form is saved.
  const [photo, setPhoto] = useState<{ url: string; mediaId: string } | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const { upload, busy: uploading, error: uploadError } = useProviderImageUpload();

  function set<K extends keyof FreelancerProfileEditValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.professionalTitle.trim() || !values.bio.trim()) {
      setError("Professional title and bio are required.");
      return;
    }
    setSaving(true);
    setError(null);

    const skills = values.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { profile, error: apiError } = await updateMyFreelancerProfile({
      professionalTitle: values.professionalTitle.trim(),
      bio: values.bio.trim(),
      city: values.city.trim() || undefined,
      hourlyRate: values.hourlyRate ? Number(values.hourlyRate) : undefined,
      availabilityStatus: values.availabilityStatus as "AVAILABLE" | "BUSY" | "UNAVAILABLE",
      skills: skills.length ? skills : undefined,
      ...(photo ? { profileMediaId: photo.mediaId } : {}),
    });

    setSaving(false);
    if (apiError || !profile) {
      setError(apiError?.message || "Couldn't save your profile. Please try again.");
      return;
    }
    onSaved(profile);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(error || uploadError) && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error ?? uploadError}</div>
      )}

      <div className="flex items-center gap-4">
        <Avatar name={values.professionalTitle || "You"} src={photo?.url ?? initial?.photoUrl ?? undefined} size="lg" />
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => photoInput.current?.click()} disabled={uploading || saving}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Upload className="mr-2 h-4 w-4" aria-hidden />}
            {uploading ? "Uploading…" : initial?.photoUrl || photo ? "Change photo" : "Add photo"}
          </Button>
          <p className="mt-1 text-xs text-kampmax-text-secondary">Your new photo is applied when you save.</p>
        </div>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Choose a profile photo"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const uploaded = await upload(file, "avatar");
            if (uploaded) setPhoto({ url: uploaded.url, mediaId: uploaded.mediaId });
          }}
        />
      </div>

      <Input
        label="Professional title"
        value={values.professionalTitle}
        onChange={(e) => set("professionalTitle", e.target.value)}
        placeholder="e.g. Full-Stack Developer"
        maxLength={120}
        required
      />

      <div className="w-full">
        <label className="mb-1.5 block text-sm font-medium text-kampmax-text">Bio</label>
        <textarea
          value={values.bio}
          onChange={(e) => set("bio", e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Tell clients what you do and how you can help them."
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm shadow-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="City"
          value={values.city}
          onChange={(e) => set("city", e.target.value)}
          placeholder="e.g. Owo"
        />
        <Input
          label="Hourly rate (₦)"
          type="number"
          min={0}
          value={values.hourlyRate}
          onChange={(e) => set("hourlyRate", e.target.value)}
          placeholder="e.g. 5000"
        />
      </div>

      <Select
        label="Availability"
        value={values.availabilityStatus}
        onChange={(e) => set("availabilityStatus", e.target.value)}
      >
        {AVAILABILITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      <Input
        label="Skills"
        value={values.skills}
        onChange={(e) => set("skills", e.target.value)}
        placeholder="e.g. React, Node.js, UI Design"
        hint="Separate skills with commas."
      />

      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

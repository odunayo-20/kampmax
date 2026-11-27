"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "@/components/ui";
import { serviceProviderDashboardKeys } from "@/lib/query-keys";
import {
  BIO_MAX,
  CITY_MAX,
  describeProfileSaveError,
  NAME_MAX,
  validateProfile,
  type ProfileFormErrors,
} from "@/lib/provider-profile";
import { updateSpProfileLive, type SpProfileDetails } from "@/services/service-provider-dashboard";

export const PROFILE_KEY = ["service-provider", "profile"];

/**
 * Edits the details customers see on the provider's public profile: name, city, years of experience and the
 * introduction. Verification can never be changed from here. Starts from the saved profile the page already loaded.
 */
export function ProfessionalDetailsEditor({ initial }: { initial: SpProfileDetails }) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [city, setCity] = useState(initial.locationCity);
  const [years, setYears] = useState(initial.yearsOfExperience === null ? "" : String(initial.yearsOfExperience));
  const [bio, setBio] = useState(initial.bio);
  const [errors, setErrors] = useState<ProfileFormErrors>({});

  const save = useMutation({
    mutationFn: async () => {
      const res = await updateSpProfileLive({
        displayName,
        bio,
        locationCity: city.trim(),
        // Left blank, the saved number stays as it is.
        ...(years.trim() ? { yearsExperience: Number(years) } : {}),
      });
      if (!res.ok) throw Object.assign(new Error(res.error), { status: res.status });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
      void queryClient.invalidateQueries({ queryKey: serviceProviderDashboardKeys.all });
    },
  });

  function submit() {
    const found = validateProfile({ displayName, years });
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate();
  }

  return (
    <div className="space-y-5">
      <Input
        label="Business or display name"
        value={displayName}
        maxLength={NAME_MAX}
        error={errors.displayName}
        placeholder="e.g. Kelechi Technologies"
        onChange={(e) => {
          setDisplayName(e.target.value);
          setErrors((x) => ({ ...x, displayName: undefined }));
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="City" value={city} maxLength={CITY_MAX} placeholder="Lagos" onChange={(e) => setCity(e.target.value)} />
        <Input
          label="Years of experience"
          inputMode="numeric"
          value={years}
          maxLength={2}
          error={errors.years}
          placeholder="e.g. 4"
          onChange={(e) => {
            setYears(e.target.value);
            setErrors((x) => ({ ...x, years: undefined }));
          }}
        />
      </div>

      <div>
        <label htmlFor="sp-bio" className="mb-1.5 block text-sm font-medium text-kampmax-text">
          Introduction
        </label>
        <textarea
          id="sp-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={BIO_MAX}
          placeholder="What you do, and what makes you good at it."
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20"
        />
        <p className="mt-1 text-right text-xs text-kampmax-text-muted">
          {bio.length} / {BIO_MAX}
        </p>
      </div>

      {save.isError && (
        <p role="alert" className="text-sm text-error-600">
          {describeProfileSaveError((save.error as Error).message, (save.error as { status?: number }).status)}
        </p>
      )}
      {save.isSuccess && (
        <p role="status" className="text-sm text-success-700">
          Saved.
        </p>
      )}
      <div className="flex justify-end border-t border-kampmax-border pt-4">
        <Button onClick={submit} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

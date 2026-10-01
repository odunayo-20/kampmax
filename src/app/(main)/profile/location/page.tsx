"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/atoms/Button";
import { Select } from "@/components/ui/Select";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { useApp } from "@/lib/app-context";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import type { PickedLocation } from "@/lib/maps/types";
import { useDeleteMyLocation, useMyLocation, useSaveMyLocation } from "@/hooks/use-location";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function MyLocationPage() {
  const router = useRouter();
  const { campuses } = useApp();
  const locationQuery = useMyLocation();
  const saveMutation = useSaveMyLocation();
  const deleteMutation = useDeleteMyLocation();
  const saved = locationQuery.data ?? null;

  const [campusOverride, setCampusOverride] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const campusId = campusOverride ?? saved?.campusId ?? "";
  const campusOptions = campuses.filter((c) => UUID.test(c.id));

  async function handleConfirm(location: PickedLocation) {
    setSaveError(null);
    setJustSaved(false);
    try {
      await saveMutation.mutateAsync({ ...location, campusId: campusId || null });
      setJustSaved(true);
    } catch (e) {
      setSaveError(getFriendlyErrorMessage(e));
    }
  }

  async function handleRemove() {
    setSaveError(null);
    setJustSaved(false);
    try {
      await deleteMutation.mutateAsync();
      setCampusOverride(null);
    } catch (e) {
      setSaveError(getFriendlyErrorMessage(e));
    }
  }

  const isSavedValid = Boolean(
    saved &&
      typeof saved.latitude === "number" &&
      typeof saved.longitude === "number" &&
      !isNaN(saved.latitude) &&
      !isNaN(saved.longitude),
  );

  const initial: PickedLocation | null = isSavedValid && saved
    ? {
        latitude: saved.latitude,
        longitude: saved.longitude,
        source: saved.source === "DEVICE" ? "DEVICE" : "MANUAL",
        accuracyMeters: typeof saved.accuracyMeters === "number" ? saved.accuracyMeters : null,
        country: saved.country,
        state: saved.state,
        city: saved.city,
        area: saved.area,
        formattedAddress: saved.formattedAddress,
      }
    : null;

  return (
    <PageContainer narrow className="space-y-4">
      <Breadcrumbs items={[{ label: "Profile", href: "/profile" }, { label: "My Location" }]} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-kampmax-muted"
        >
          <ArrowLeft className="h-5 w-5 text-kampmax-text" />
        </button>
        <h1 className="text-lg font-bold text-kampmax-text">My Location</h1>
      </div>

      <p className="text-sm text-kampmax-text-secondary">
        Your saved location is private to you. It is not shown on your public profile.
      </p>

      {locationQuery.isLoading ? (
        <p role="status" className="py-8 text-center text-sm text-kampmax-text-secondary">
          Loading your location…
        </p>
      ) : locationQuery.isError ? (
        <div className="rounded-xl border border-kampmax-border bg-white p-6 text-center">
          <p className="text-sm text-kampmax-text">Couldn&apos;t load your saved location.</p>
          <button type="button" onClick={() => locationQuery.refetch()} className="mt-2 text-sm font-medium text-kampmax-blue">
            Try again
          </button>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-kampmax-border bg-white p-4">
          {campusOptions.length > 0 && (
            <Select
              label="Campus (optional)"
              value={campusId}
              onChange={(e) => setCampusOverride(e.target.value)}
            >
              <option value="">Not on a campus</option>
              {campusOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}

          <LocationPicker
            key={isSavedValid ? (saved?.updatedAt ?? "saved") : "empty"}
            initial={initial}
            onConfirm={handleConfirm}
            saving={saveMutation.isPending}
            saveError={saveError}
            confirmLabel={isSavedValid ? "Update location" : "Confirm location"}
          />

          {justSaved && (
            <p role="status" className="text-sm text-success-700">
              Location saved.
            </p>
          )}

          {isSavedValid && (
            <div className="border-t border-neutral-200 pt-4">
              <Button type="button" variant="outline" onClick={handleRemove} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Removing…" : "Remove saved location"}
              </Button>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}

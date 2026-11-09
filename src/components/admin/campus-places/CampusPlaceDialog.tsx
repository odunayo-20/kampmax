"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { useCreateCampusPlace, useUpdateCampusPlace } from "@/hooks/admin/use-admin-campus-places";
import {
  CAMPUS_PLACE_TYPES,
  CAMPUS_PLACE_TYPE_LABELS,
  type AdminCampusPlace,
  type CampusPlaceType,
} from "@/types/campus-places";

export interface CampusOption {
  id: string;
  name: string;
}

interface FormState {
  campusId: string;
  name: string;
  type: CampusPlaceType;
  aliases: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
}

const EMPTY: FormState = {
  campusId: "",
  name: "",
  type: "SCHOOL_GATE",
  aliases: "",
  description: "",
  latitude: null,
  longitude: null,
};

function fromPlace(place: AdminCampusPlace): FormState {
  return {
    campusId: place.campusId,
    name: place.name,
    type: place.type,
    aliases: place.aliases.join(", "),
    description: place.description ?? "",
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

/** "Front gate, Gate 1" to a list. The backend removes repeats and the place's own name. */
function parseAliases(text: string): string[] {
  return text
    .split(",")
    .map((a) => a.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 10);
}

/**
 * Add a place, or edit one. The pin is set on the map (search, drag or click),
 * because a wrong pin sends people to the wrong gate. The campus cannot change
 * once a place exists.
 */
export function CampusPlaceDialog({
  open,
  place,
  campuses,
  defaultCampusId,
  onClose,
}: {
  open: boolean;
  /** Null = add; set = edit. */
  place: AdminCampusPlace | null;
  campuses: CampusOption[];
  defaultCampusId?: string;
  onClose: () => void;
}) {
  const create = useCreateCampusPlace();
  const update = useUpdateCampusPlace();
  const saving = create.isPending || update.isPending;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(place ? fromPlace(place) : { ...EMPTY, campusId: defaultCampusId ?? "" });
    setTouched(false);
    setError(null);
  }, [open, place, defaultCampusId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const isEdit = place !== null;
  const hasPin = form.latitude !== null && form.longitude !== null;
  const problems = {
    campus: !form.campusId ? "Choose the campus." : undefined,
    name: form.name.trim().length < 2 ? "Give the place a name." : undefined,
    pin: !hasPin ? "Set the place on the map, then press “Use this spot”." : undefined,
  };
  const invalid = Boolean(problems.campus || problems.name || problems.pin);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (invalid || form.latitude === null || form.longitude === null) return;
    try {
      if (place) {
        await update.mutateAsync({
          id: place.id,
          patch: {
            name: form.name.trim(),
            type: form.type,
            aliases: parseAliases(form.aliases),
            description: form.description.trim(),
            latitude: form.latitude,
            longitude: form.longitude,
          },
        });
      } else {
        await create.mutateAsync({
          campusId: form.campusId,
          name: form.name.trim(),
          type: form.type,
          aliases: parseAliases(form.aliases),
          description: form.description.trim(),
          latitude: form.latitude,
          longitude: form.longitude,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="campus-place-title"
    >
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={() => !saving && onClose()}
      />

      <form
        noValidate
        onSubmit={handleSubmit}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-kampmax-border bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-kampmax-border px-5 py-4">
          <div>
            <h2 id="campus-place-title" className="text-sm font-semibold text-kampmax-text">
              {isEdit ? "Edit place" : "Add place"}
            </h2>
            <p className="text-xs text-kampmax-text-secondary">
              {isEdit
                ? "Changes show on the map straight away."
                : "A place you add is on the map straight away."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
            className="rounded-md p-1 text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-text disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 overflow-y-auto px-5 py-4 sm:grid-cols-2">
          <div>
            <label htmlFor="place-campus" className="mb-1.5 block text-sm font-medium text-kampmax-text">
              Campus
            </label>
            <select
              id="place-campus"
              value={form.campusId}
              disabled={isEdit}
              onChange={(e) => set("campusId", e.target.value)}
              className="h-10 w-full rounded-md border border-kampmax-border bg-white px-2.5 text-sm text-kampmax-text disabled:bg-kampmax-muted/50"
            >
              <option value="">Choose a campus</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {touched && problems.campus && <p className="mt-1 text-xs text-kampmax-error">{problems.campus}</p>}
          </div>

          <div>
            <label htmlFor="place-type" className="mb-1.5 block text-sm font-medium text-kampmax-text">
              Type
            </label>
            <select
              id="place-type"
              value={form.type}
              onChange={(e) => set("type", e.target.value as CampusPlaceType)}
              className="h-10 w-full rounded-md border border-kampmax-border bg-white px-2.5 text-sm text-kampmax-text"
            >
              {CAMPUS_PLACE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CAMPUS_PLACE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            error={touched ? problems.name : undefined}
            placeholder="e.g. Main Gate"
            maxLength={160}
            autoComplete="off"
          />
          <Input
            label="Other names"
            value={form.aliases}
            onChange={(e) => set("aliases", e.target.value)}
            hint="Separate with commas, e.g. Front gate, Gate 1"
            autoComplete="off"
          />

          <div className="sm:col-span-2">
            <label htmlFor="place-description" className="mb-1.5 block text-sm font-medium text-kampmax-text">
              Description <span className="font-normal text-kampmax-text-secondary">(optional)</span>
            </label>
            <textarea
              id="place-description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Anything that helps someone find it"
              className="w-full rounded-md border border-kampmax-border bg-white px-2.5 py-2 text-sm text-kampmax-text"
            />
          </div>

          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-kampmax-text">Location</p>
            {hasPin && (
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs text-kampmax-text-secondary">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                Pin set at {form.latitude!.toFixed(5)}, {form.longitude!.toFixed(5)}
              </p>
            )}
            <LocationPicker
              key={place?.id ?? "new"}
              initial={
                hasPin
                  ? {
                      latitude: form.latitude!,
                      longitude: form.longitude!,
                      source: "MANUAL",
                      accuracyMeters: null,
                      country: null,
                      state: null,
                      city: null,
                      area: null,
                      formattedAddress: null,
                    }
                  : null
              }
              confirmLabel="Use this spot"
              onConfirm={(loc) => setForm((f) => ({ ...f, latitude: loc.latitude, longitude: loc.longitude }))}
            />
            {touched && problems.pin && <p className="mt-1 text-xs text-kampmax-error">{problems.pin}</p>}
          </div>

          {error && (
            <p role="alert" className="text-sm text-kampmax-error sm:col-span-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-kampmax-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-9 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text hover:bg-kampmax-muted/60 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-blue px-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {isEdit ? "Save changes" : "Add place"}
          </button>
        </div>
      </form>
    </div>
  );
}

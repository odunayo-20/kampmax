"use client";

import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccommodationCatalog, useCreateAccommodationProperty, useUpdateAccommodationProperty } from "@/hooks/use-accommodation";
import { useCampusOptions } from "@/hooks/use-campus-options";
import { describeHousingError } from "@/lib/accommodation-text";
import {
  emptyProperty,
  emptyUnit,
  filterCampuses,
  formFromProperty,
  LOST_PROPERTY,
  propertyBody,
  propertyPatch,
  propertyProblems,
  unitBody,
  unitProblems,
  type PropertyErrors,
  type PropertyForm as Form,
  type UnitErrors,
  type UnitForm,
} from "@/lib/agent-properties";
import { publicAccommodationKeys } from "@/lib/query-keys";
import type { AccommodationProperty } from "@/types/accommodation";
import { PropertyPin } from "./PropertyPin";
import { Field, fieldClass } from "./form-parts";
import { RoomFields } from "./RoomFields";

type Props =
  | { mode: "create"; onCreated: (id: string) => void; onCancel: () => void }
  | { mode: "edit"; property: AccommodationProperty; onSaved: () => void; onCancel: () => void };

/**
 * Adding a property with its first room, or editing one's details. Students see the area and city; the street
 * address stays private. The same form as the mobile app's agent-property-form.
 */
export function PropertyForm(props: Props) {
  const queryClient = useQueryClient();
  const catalog = useAccommodationCatalog();
  const { campuses, isLoading: campusesLoading } = useCampusOptions();
  const create = useCreateAccommodationProperty();
  const update = useUpdateAccommodationProperty();
  const editing = props.mode === "edit";
  const [form, setForm] = useState<Form>(() => (props.mode === "edit" ? formFromProperty(props.property) : emptyProperty()));
  const [errors, setErrors] = useState<PropertyErrors>({});
  const [room, setRoom] = useState<UnitForm>(emptyUnit);
  const [roomErrors, setRoomErrors] = useState<UnitErrors>({});
  const [campusQuery, setCampusQuery] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;
  const campusLocked = props.mode === "edit" && !!props.property.campusId;
  const shownCampuses = filterCampuses(campuses, campusQuery);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setErrors((e) => ({ ...e, [key]: undefined }));
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProblem(null);
    const found = propertyProblems(form);
    setErrors(found);
    if (props.mode === "create") {
      const roomFound = unitProblems(room);
      setRoomErrors(roomFound);
      if (Object.keys(found).length > 0 || Object.keys(roomFound).length > 0) return;
      try {
        const created = await create.mutateAsync({ ...propertyBody(form), units: [unitBody(room)] });
        props.onCreated(created.id);
      } catch (reason) {
        // Unclear outcome: it may exist. Refresh so the list shows it before another try.
        if ((reason as { code?: string }).code === "NETWORK_ERROR") {
          void queryClient.invalidateQueries({ queryKey: publicAccommodationKeys.all });
          setProblem(LOST_PROPERTY);
        } else setProblem(describeHousingError(reason));
      }
      return;
    }
    if (Object.keys(found).length > 0) return;
    const patch = propertyPatch(form, props.property);
    if (Object.keys(patch).length === 0) return props.onSaved();
    try {
      await update.mutateAsync({ id: props.property.id, input: patch });
      props.onSaved();
    } catch (reason) {
      setProblem(describeHousingError(reason));
    }
  }

  const text = (key: "title" | "state" | "city" | "neighbourhood" | "address" | "landmark", label: string, placeholder: string, max: number, hint?: string) => (
    <Field label={label} error={errors[key]} hint={hint}>
      <input value={form[key]} maxLength={max} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} className={fieldClass} />
    </Field>
  );

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5 rounded-2xl border border-kampmax-border bg-white p-5">
      <h2 className="text-base font-bold text-kampmax-text">{editing ? "Edit property" : "New property"}</h2>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-kampmax-text">The property</legend>
        <p className="text-xs text-kampmax-text-secondary">A hostel, house or compound. You list its rooms separately.</p>
        {text("title", "Property name", "Sunrise Lodge", 160)}
        {catalog.isError ? (
          <p className="text-sm text-red-700">
            The property types could not be loaded.{" "}
            <button type="button" className="underline" onClick={() => void catalog.refetch()}>Try again</button>
          </p>
        ) : (
          <Field label="What kind of property?" error={errors.categoryId}>
            <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={fieldClass}>
              <option value="">Choose one</option>
              {(catalog.data?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Description (optional)" error={errors.description}>
          <textarea rows={4} maxLength={5000} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Water, light, security, how far from campus." className={fieldClass} />
          <span className="mt-0.5 block text-right">{form.description.length}/5000</span>
        </Field>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-kampmax-text">Where it is</legend>
        <p className="text-xs text-kampmax-text-secondary">Students see the area and city. The street address stays private to you and the Kampmax team.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {text("state", "State", "Lagos", 80)}
          {text("city", "City or town", "Yaba", 80)}
          {text("neighbourhood", "Area (optional)", "Akoka", 120, "Shown to students, so use the name they know.")}
          {text("landmark", "Landmark (optional)", "Opposite the main gate", 160)}
        </div>
        {text("address", "Street address (private)", "12 Church Street", 300)}
        <div>
          <Field label="Campus it serves (optional)">
            <input value={campusQuery} onChange={(e) => setCampusQuery(e.target.value)} placeholder="Search campuses" className={fieldClass} aria-label="Search campuses" />
            <select value={form.campusId} onChange={(e) => set("campusId", e.target.value)} className={fieldClass} aria-label="Campus it serves">
              {!campusLocked && <option value="">Not tied to a campus</option>}
              {shownCampuses.map((c) => <option key={c.id} value={c.id}>{c.name}{c.abbreviation ? ` (${c.abbreviation})` : ""}</option>)}
              {form.campusId && !shownCampuses.some((c) => c.id === form.campusId) && <option value={form.campusId}>{campuses.find((c) => c.id === form.campusId)?.name ?? "Campus chosen"}</option>}
            </select>
          </Field>
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            {campusesLoading && campuses.length === 0
              ? "Loading campuses…"
              : campusLocked
                ? "Students looking near this campus will find your rooms. You can switch campus, but not remove it."
                : "Students looking near this campus will find your rooms. Leave it empty if it serves no one campus."}
          </p>
        </div>
        <PropertyPin value={form.pin} onChange={(pin) => set("pin", pin)} />
      </fieldset>

      {!editing && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-kampmax-text">Its first room</legend>
          <p className="text-xs text-kampmax-text-secondary">You can add more rooms after this.</p>
          <RoomFields form={room} errors={roomErrors} onChange={(patch) => { setRoomErrors({}); setRoom((u) => ({ ...u, ...patch })); }} />
        </fieldset>
      )}

      {problem && <p role="alert" className="text-sm text-red-700">{problem}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-md bg-kampmax-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : editing ? "Save changes" : "Add property"}
        </button>
        <button type="button" onClick={props.onCancel} className="rounded-md border border-kampmax-border px-4 py-2 text-sm">Cancel</button>
      </div>
    </form>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useAddAccommodationUnit, useUpdateAccommodationUnit } from "@/hooks/use-accommodation";
import { describeHousingError } from "@/lib/accommodation-text";
import { AVAILABILITY_OPTIONS } from "@/lib/agent-listings";
import {
  emptyUnit,
  formFromUnit,
  FURNISHING_OPTIONS,
  UNIT_NAME_TAKEN,
  unitBody,
  unitNameTaken,
  unitProblems,
  type RoomAvailability,
  type UnitErrors,
  type UnitForm,
} from "@/lib/agent-properties";
import type { AccommodationProperty, AccommodationUnit } from "@/types/accommodation";
import { Field, fieldClass } from "./form-parts";

/** A room's fields, shared by "Its first room" on a new property and the room editor. Like the mobile UnitFields. */
export function RoomFields({ form, errors, onChange, showAvailability = false }: { form: UnitForm; errors: UnitErrors; onChange: (patch: Partial<UnitForm>) => void; showAvailability?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Room or flat name" error={errors.unitName} hint="Each room needs its own name within the property.">
        <input value={form.unitName} maxLength={80} onChange={(e) => onChange({ unitName: e.target.value })} placeholder="Room 4" className={fieldClass} />
      </Field>
      <Field label="What is it?" error={errors.unitType}>
        <input value={form.unitType} maxLength={60} onChange={(e) => onChange({ unitType: e.target.value })} placeholder="Single room, self-contain, 2-bedroom flat" className={fieldClass} />
      </Field>
      <div className="grid grid-cols-3 gap-3 sm:col-span-2">
        <Field label="Bedrooms" error={errors.bedrooms}>
          <input inputMode="numeric" maxLength={2} value={form.bedrooms} onChange={(e) => onChange({ bedrooms: e.target.value })} className={fieldClass} />
        </Field>
        <Field label="Bathrooms" error={errors.bathrooms}>
          <input inputMode="numeric" maxLength={2} value={form.bathrooms} onChange={(e) => onChange({ bathrooms: e.target.value })} className={fieldClass} />
        </Field>
        <Field label="Sleeps" error={errors.occupancyCapacity}>
          <input inputMode="numeric" maxLength={3} value={form.occupancyCapacity} onChange={(e) => onChange({ occupancyCapacity: e.target.value })} className={fieldClass} />
        </Field>
      </div>
      <Field label="Furnishing">
        <select value={form.furnishingStatus} onChange={(e) => onChange({ furnishingStatus: e.target.value as UnitForm["furnishingStatus"] })} className={fieldClass}>
          {FURNISHING_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </Field>
      {showAvailability && (
        <Field label="Availability" hint="Students only see rooms that are available.">
          <select value={form.availabilityStatus} onChange={(e) => onChange({ availabilityStatus: e.target.value as RoomAvailability })} className={fieldClass}>
            {AVAILABILITY_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </Field>
      )}
    </div>
  );
}

/** Adding a room to a property, or editing one. Names must be unique inside the property. */
export function RoomEditor({
  property,
  unit,
  archiving,
  onArchive,
  onDone,
}: {
  property: AccommodationProperty;
  unit?: AccommodationUnit;
  archiving: boolean;
  onArchive?: () => void;
  onDone: () => void;
}) {
  const add = useAddAccommodationUnit();
  const update = useUpdateAccommodationUnit();
  const [form, setForm] = useState<UnitForm>(() => (unit ? formFromUnit(unit) : emptyUnit()));
  const [errors, setErrors] = useState<UnitErrors>({});
  const [problem, setProblem] = useState<string | null>(null);
  const pending = add.isPending || update.isPending;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = unitProblems(form);
    if (!found.unitName && unitNameTaken(form.unitName, property.units, unit?.id)) found.unitName = UNIT_NAME_TAKEN;
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setProblem(null);
    try {
      if (unit) await update.mutateAsync({ propertyId: property.id, unitId: unit.id, input: unitBody(form) });
      else await add.mutateAsync({ propertyId: property.id, input: unitBody(form) });
      onDone();
    } catch (reason) {
      setProblem(describeHousingError(reason));
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3 rounded-lg bg-kampmax-bg p-4">
      <h4 className="text-sm font-semibold text-kampmax-text">{unit ? "Edit room" : "Add a room"}</h4>
      <RoomFields form={form} errors={errors} showAvailability={!!unit} onChange={(patch) => { setErrors({}); setForm((f) => ({ ...f, ...patch })); }} />
      {problem && <p role="alert" className="text-sm text-red-700">{problem}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="rounded-md bg-kampmax-blue px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : unit ? "Save room" : "Add room"}
        </button>
        <button type="button" onClick={onDone} className="rounded-md border border-kampmax-border px-3 py-2 text-xs">Cancel</button>
        {onArchive && (
          <button type="button" disabled={pending || archiving} onClick={onArchive} className="ml-auto text-xs text-red-700 underline disabled:opacity-50">
            {archiving ? "Checking your listings…" : "Archive this room"}
          </button>
        )}
      </div>
    </form>
  );
}

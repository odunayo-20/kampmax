"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCancelEvent, useUpdateEvent } from "@/hooks/use-events";
import { useCategories } from "@/hooks/use-taxonomy";
import {
  actionError,
  DESCRIPTION_MAX,
  LOCATION_MAX,
  TITLE_MAX,
  toLocalInput,
  validateEventEdit,
  type EventEditDraft,
  type EventEditErrors,
} from "@/lib/event-publish";
import { CoverUpload, Field, inputClass } from "./fields";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EntityLocationSettings } from "@/components/maps/EntityLocationSettings";
import type { EventItem } from "@/types/event-ticketing";

/** The saved event as the form shows it, so "what changed" compares like with like. */
function draftOf(event: EventItem): EventEditDraft {
  return {
    title: event.title,
    description: event.description,
    location: event.location,
    categoryId: event.category?.id ?? "",
    startsAt: toLocalInput(event.startsAt),
    endsAt: toLocalInput(event.endsAt),
    capacity: event.capacity === null ? "" : String(event.capacity),
    coverImageUrl: event.coverImageUrl ?? "",
  };
}

export function SettingsTab({ event, canEdit }: { event: EventItem; canEdit: boolean }) {
  const router = useRouter();
  const update = useUpdateEvent(event.id);
  const cancel = useCancelEvent(event.id);
  const { categories } = useCategories("EVENT");
  const [draft, setDraft] = useState<EventEditDraft>(() => draftOf(event));
  const [errors, setErrors] = useState<EventEditErrors>({});
  const [uploading, setUploading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const set = (key: keyof EventEditDraft) => (e: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (update.isPending || uploading) return;
    setNotice(null);
    const result = validateEventEdit({ ...draftOf(event), ticketsSold: event.ticketsSold }, draft, new Date());
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (Object.keys(result.patch).length === 0) {
      setNotice("Nothing has changed.");
      return;
    }
    update.mutate(result.patch, { onSuccess: () => setNotice("Saved.") });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save} noValidate className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <CoverUpload
          value={draft.coverImageUrl}
          onChange={(url) => setDraft((d) => ({ ...d, coverImageUrl: url }))}
          onBusy={setUploading}
          disabled={!canEdit}
        />
        <Field label="Event name" error={errors.title}>
          <input value={draft.title} onChange={set("title")} disabled={!canEdit} maxLength={TITLE_MAX} className={inputClass} />
        </Field>
        <Field label="Venue" error={errors.location}>
          <input value={draft.location} onChange={set("location")} disabled={!canEdit} maxLength={LOCATION_MAX} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Starts" error={errors.startsAt}>
            <input type="datetime-local" value={draft.startsAt} onChange={set("startsAt")} disabled={!canEdit} className={inputClass} />
          </Field>
          <Field label="Ends" error={errors.endsAt}>
            <input type="datetime-local" value={draft.endsAt} onChange={set("endsAt")} disabled={!canEdit} className={inputClass} />
          </Field>
        </div>
        <Field label="Category" error={errors.categoryId}>
          <select value={draft.categoryId} onChange={set("categoryId")} disabled={!canEdit} className={inputClass}>
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {`${"  ".repeat(c.depth)}${c.name}`}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Capacity" error={errors.capacity}>
          <input inputMode="numeric" value={draft.capacity} onChange={set("capacity")} disabled={!canEdit} placeholder="No overall limit" className={inputClass} />
        </Field>
        <Field label="Description" error={errors.description}>
          <textarea value={draft.description} onChange={set("description")} disabled={!canEdit} rows={4} maxLength={DESCRIPTION_MAX} className={inputClass} />
        </Field>
        {canEdit && (
          <>
            <p className="text-[11px] text-neutral-500">
              Changing the time or venue notifies everyone who holds a ticket.
            </p>
            {update.isError && <p role="alert" className="text-xs text-error-700">{actionError(update.error, "Couldn't save your changes. Try again.")}</p>}
            {notice && <p role="status" className="text-xs font-semibold text-emerald-700">{notice}</p>}
            <button type="submit" disabled={update.isPending || uploading} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-bold text-white disabled:opacity-50">
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
            </button>
          </>
        )}
      </form>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-bold text-neutral-900">Nearby</p>
        <p className="mb-4 text-xs text-neutral-500">
          Put this event on the map so people nearby can discover it. This is separate from the venue text above.
        </p>
        <EntityLocationSettings entityType="EVENT" entityId={event.id} noun="this event" />
      </div>

      {canEdit && (
        <div className="rounded-2xl border border-error-100 bg-white p-4">
          <p className="text-sm font-bold text-error-700">Cancel this event</p>
          <p className="mt-1 text-xs text-neutral-600">
            Every ticket is refunded to the buyer&apos;s wallet and attendees are notified. This can&apos;t be undone.
          </p>
          {cancel.isError && <p role="alert" className="mt-2 text-xs text-error-700">{actionError(cancel.error, "Couldn't cancel the event. Try again.")}</p>}
          <button onClick={() => setConfirmCancel(true)} className="mt-3 h-10 w-full rounded-xl border border-error-600 text-sm font-bold text-error-700">
            Cancel event
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        tone="danger"
        title="Cancel this event?"
        message={`All ${event.ticketsSold} tickets will be refunded and attendees notified.`}
        confirmLabel="Cancel event"
        cancelLabel="Keep event"
        loading={cancel.isPending}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() =>
          cancel.mutate(undefined, {
            onSuccess: () => router.replace("/organizer"),
            onSettled: () => setConfirmCancel(false),
          })
        }
      />
    </div>
  );
}

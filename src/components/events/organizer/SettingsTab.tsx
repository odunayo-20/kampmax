"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCancelEvent, useUpdateEvent } from "@/hooks/use-events";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EntityLocationSettings } from "@/components/maps/EntityLocationSettings";
import type { EventItem } from "@/types/event-ticketing";

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:bg-neutral-50";

/** ISO -> value for <input type="datetime-local"> in the viewer's timezone. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SettingsTab({ event, canEdit }: { event: EventItem; canEdit: boolean }) {
  const router = useRouter();
  const update = useUpdateEvent(event.id);
  const cancel = useCancelEvent(event.id);
  const [title, setTitle] = useState(event.title);
  const [location, setLocation] = useState(event.location);
  const [description, setDescription] = useState(event.description);
  const [startsAt, setStartsAt] = useState(toLocalInput(event.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(event.endsAt));
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [saved, setSaved] = useState(false);

  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  const valid =
    title.trim().length >= 3 &&
    location.trim().length >= 2 &&
    !Number.isNaN(startMs) &&
    endMs > startMs;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || update.isPending) return;
    setSaved(false);
    // Only send the times that changed: an event that already started can't
    // be "moved" to a past start, but its title or venue can still be fixed.
    const startChanged = startsAt !== toLocalInput(event.startsAt);
    const endChanged = endsAt !== toLocalInput(event.endsAt);
    update.mutate(
      {
        title: title.trim(),
        location: location.trim(),
        description: description.trim(),
        ...(startChanged ? { startsAt: new Date(startsAt).toISOString() } : {}),
        ...(endChanged || startChanged
          ? { endsAt: new Date(endsAt).toISOString() }
          : {}),
      },
      { onSuccess: () => setSaved(true) }
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <label className="block text-xs font-semibold text-neutral-700">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} maxLength={150} className={`mt-1 ${inputClass}`} />
        </label>
        <label className="block text-xs font-semibold text-neutral-700">
          Venue
          <input value={location} onChange={(e) => setLocation(e.target.value)} disabled={!canEdit} maxLength={200} className={`mt-1 ${inputClass}`} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-semibold text-neutral-700">
            Starts
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} disabled={!canEdit} className={`mt-1 ${inputClass}`} />
          </label>
          <label className="block text-xs font-semibold text-neutral-700">
            Ends
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} disabled={!canEdit} className={`mt-1 ${inputClass}`} />
          </label>
        </div>
        <label className="block text-xs font-semibold text-neutral-700">
          About
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={4} maxLength={3000} className={`mt-1 ${inputClass}`} />
        </label>
        {canEdit && (
          <>
            <p className="text-[11px] text-neutral-500">
              Changing the time or venue notifies everyone who holds a ticket.
            </p>
            {update.isError && <p role="alert" className="text-xs text-error-700">{update.error.message}</p>}
            {saved && <p role="status" className="text-xs font-semibold text-emerald-700">Saved.</p>}
            <button type="submit" disabled={!valid || update.isPending} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-bold text-white disabled:opacity-50">
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
          {cancel.isError && <p role="alert" className="mt-2 text-xs text-error-700">{cancel.error.message}</p>}
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

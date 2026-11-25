"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { CampusSelector } from "@/components/layout/footer/CampusSelector";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useApp } from "@/lib/app-context";
import { useCategories } from "@/hooks/use-taxonomy";
import { useCreateEvent, useOrganizerStatus } from "@/hooks/use-events";
import { CoverUpload, Field, FieldError, inputClass } from "@/components/events/organizer/fields";
import { listMyEventsApi } from "@/services/event-tickets";
import { eventDate, eventTime } from "@/components/events/event-format";
import {
  classifyEventError,
  DESCRIPTION_MAX,
  findLikelyDuplicate,
  LOCATION_MAX,
  MAX_TIERS,
  TIER_DESCRIPTION_MAX,
  TIER_NAME_MAX,
  TITLE_MAX,
  validateEventDraft,
  type EventDraft,
  type EventErrors,
  type TierDraft,
} from "@/lib/event-publish";
import type { CreateEventInput, EventItem } from "@/types/event-ticketing";

const EMPTY_TIER: TierDraft = { name: "", description: "", price: "", quantity: "" };
const EMPTY_DRAFT: EventDraft = {
  title: "",
  description: "",
  location: "",
  categoryId: "",
  startsAt: "",
  endsAt: "",
  capacity: "",
  tiers: [{ name: "General admission", description: "", price: "0", quantity: "100" }],
};

type Valid = CreateEventInput;

export default function CreateEventPage() {
  const router = useRouter();
  const { selectedCampus } = useApp();
  const status = useOrganizerStatus();
  const create = useCreateEvent();
  const { categories } = useCategories("EVENT");

  const [draft, setDraft] = useState<EventDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<EventErrors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [review, setReview] = useState<Valid | null>(null);
  const [duplicate, setDuplicate] = useState<{ value: Valid; event: EventItem } | null>(null);
  const [checking, setChecking] = useState(false);
  // Set after a failure where the event may already exist: nothing is sent again until that is checked.
  const [needsCheck, setNeedsCheck] = useState(false);

  const campusId = selectedCampus?.id;
  const busy = create.isPending || checking || uploading;
  const set = (key: keyof EventDraft) => (e: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));
  const setTier = (index: number, patch: Partial<TierDraft>) =>
    setDraft((d) => ({ ...d, tiers: d.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)) }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setGeneral(null);
    const result = validateEventDraft(draft, campusId, new Date());
    if (!result.ok) {
      setErrors(result.errors);
      setGeneral("Some details need fixing. They are marked below.");
      return;
    }
    setErrors({});
    setReview({ ...result.value, ...(coverUrl ? { coverImageUrl: coverUrl } : {}) });
  }

  function send(value: Valid) {
    setDuplicate(null);
    create.mutate(value, {
      onSuccess: (event) => router.replace(`/organizer/events/${event.id}`),
      onError: (err) => {
        const failure = classifyEventError(err as { status?: number; code?: string; message?: string });
        setGeneral(failure.message);
        setNeedsCheck(failure.kind === "unclear");
      },
    });
  }

  /** Never sent blind: the organizer's own events are checked first for the one about to be created. */
  async function publishChecked(value: Valid) {
    setReview(null);
    setChecking(true);
    setGeneral(null);
    try {
      let mine: EventItem[] | null;
      try {
        mine = (await listMyEventsApi()).items;
      } catch {
        mine = null;
      }
      if (mine === null && needsCheck) {
        setGeneral("We can't check your events right now, and the last attempt may have worked. Check your connection and try again.");
        return;
      }
      const found = mine ? findLikelyDuplicate(mine, value) : null;
      if (found && needsCheck) {
        // The earlier attempt did go through.
        router.replace(`/organizer/events/${found.id}`);
        return;
      }
      if (found) {
        setDuplicate({ value, event: found });
        return;
      }
      setNeedsCheck(false);
      send(value);
    } finally {
      setChecking(false);
    }
  }

  if (status.data && !status.data.isOrganizer) {
    return (
      <PageContainer narrow className="space-y-3">
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Only approved organizers can publish events.{" "}
          <Link href="/organizer" className="font-semibold underline">Apply to host events</Link>
        </p>
      </PageContainer>
    );
  }

  const tickets = review?.tiers?.length ?? 0;
  const paid = review?.tiers?.some((t) => t.price > 0) ?? false;

  return (
    <PageContainer narrow className="space-y-4 pb-14">
      <Link href="/organizer" className="flex items-center gap-2 text-sm text-kampmax-text-secondary hover:text-kampmax-text">
        <ArrowLeft className="h-4 w-4" /> Cancel
      </Link>
      <h1 className="text-xl font-bold text-kampmax-text">Create an event</h1>

      {general && (
        <p role="alert" className="rounded-lg bg-error-50 p-3 text-xs text-error-700">
          {general}
        </p>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        <section className="space-y-3 rounded-2xl border border-kampmax-border bg-white p-4">
          <h2 className="text-sm font-bold text-kampmax-text">The basics</h2>
          <Field label="Event name" error={errors.title}>
            <input value={draft.title} onChange={set("title")} maxLength={TITLE_MAX} className={inputClass} />
          </Field>
          <Field label="Description (optional)" error={errors.description}>
            <textarea
              value={draft.description}
              onChange={set("description")}
              rows={4}
              maxLength={DESCRIPTION_MAX}
              placeholder="What should people expect?"
              className={inputClass}
            />
          </Field>
          <CoverUpload value={coverUrl} onChange={setCoverUrl} onBusy={setUploading} />
          <Field label="Category (optional)">
            <select value={draft.categoryId} onChange={set("categoryId")} className={inputClass}>
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {`${"  ".repeat(c.depth)}${c.name}`}
                </option>
              ))}
            </select>
          </Field>
        </section>

        <section className="space-y-3 rounded-2xl border border-kampmax-border bg-white p-4">
          <h2 className="text-sm font-bold text-kampmax-text">Where and when</h2>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-label="Change campus"
            className={`text-left ${inputClass}`}
          >
            <span className="block text-[11px] text-kampmax-text-muted">Campus</span>
            <span className="font-semibold text-kampmax-text">{campusId ? selectedCampus.name : "Choose your campus"}</span>
          </button>
          {errors.campus && <FieldError message={errors.campus} />}
          <Field label="Venue" error={errors.location}>
            <input value={draft.location} onChange={set("location")} maxLength={LOCATION_MAX} placeholder="e.g. Main Auditorium" className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts" error={errors.startsAt}>
              <input type="datetime-local" value={draft.startsAt} onChange={set("startsAt")} className={inputClass} />
            </Field>
            <Field label="Ends (optional)" error={errors.endsAt}>
              <input type="datetime-local" value={draft.endsAt} onChange={set("endsAt")} className={inputClass} />
            </Field>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-kampmax-border bg-white p-4">
          <h2 className="text-sm font-bold text-kampmax-text">Tickets</h2>
          <Field label="Capacity (optional)" error={errors.capacity}>
            <input inputMode="numeric" value={draft.capacity} onChange={set("capacity")} placeholder="No overall limit" className={inputClass} />
          </Field>
          {errors.tiers && <FieldError message={errors.tiers} />}
          {draft.tiers.map((t, i) => {
            const te = errors.tier?.[i];
            return (
              <div key={i} className="space-y-2 rounded-xl border border-kampmax-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-kampmax-text">Ticket type {i + 1}</p>
                  {draft.tiers.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove ticket type ${i + 1}`}
                      onClick={() => setDraft((d) => ({ ...d, tiers: d.tiers.filter((_, k) => k !== i) }))}
                      className="rounded-lg p-1.5 text-kampmax-error hover:bg-error-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Field label="Name" error={te?.name}>
                  <input value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} maxLength={TIER_NAME_MAX} className={inputClass} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Price (₦)" error={te?.price}>
                    <input inputMode="decimal" value={t.price} onChange={(e) => setTier(i, { price: e.target.value })} placeholder="0 = free" className={inputClass} />
                  </Field>
                  <Field label="How many" error={te?.quantity}>
                    <input inputMode="numeric" value={t.quantity} onChange={(e) => setTier(i, { quantity: e.target.value })} className={inputClass} />
                  </Field>
                </div>
                <Field label="Note (optional)" error={te?.description}>
                  <input value={t.description} onChange={(e) => setTier(i, { description: e.target.value })} maxLength={TIER_DESCRIPTION_MAX} className={inputClass} />
                </Field>
              </div>
            );
          })}
          {draft.tiers.length < MAX_TIERS && (
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, tiers: [...d.tiers, { ...EMPTY_TIER }] }))}
              className="inline-flex items-center gap-1 text-xs font-bold text-kampmax-blue"
            >
              <Plus className="h-3.5 w-3.5" /> Add a ticket type
            </button>
          )}
          <p className="text-[11px] text-kampmax-text-muted">
            Paid tickets are paid from the buyer&apos;s wallet. Kampmax adds a small service fee for the buyer on top of
            your price. Ticket revenue reaches your wallet after the event ends.
          </p>
        </section>

        <button
          type="submit"
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-bold text-white disabled:opacity-50"
        >
          {(create.isPending || checking) && <Loader2 className="h-4 w-4 animate-spin" />}
          {needsCheck ? "Check and publish" : "Review and publish"}
        </button>
        <CampusSelector hideTrigger open={pickerOpen} onOpenChange={setPickerOpen} />
      </form>

      <ConfirmDialog
        open={review !== null}
        title={`Publish "${review?.title ?? ""}"?`}
        body={`It goes live straight away for everyone at ${selectedCampus?.name || "your campus"}.`}
        confirmLabel="Publish"
        cancelLabel="Keep editing"
        onConfirm={() => review && void publishChecked(review)}
        onCancel={() => setReview(null)}
      >
        {review && (
          <ul className="mt-3 space-y-1 text-sm text-kampmax-text">
            <li>
              {eventDate(review.startsAt)}, {eventTime(review.startsAt)}
            </li>
            <li>{review.location}</li>
            <li>
              {tickets === 1 ? "1 ticket type" : `${tickets} ticket types`}, {paid ? "paid" : "free"}
            </li>
          </ul>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={duplicate !== null}
        title="You already have this event"
        body={`"${duplicate?.event.title ?? ""}" is already published at this time. Publishing again would create a second copy.`}
        confirmLabel="Publish anyway"
        destructive
        pending={create.isPending}
        onConfirm={() => duplicate && send(duplicate.value)}
        onCancel={() => setDuplicate(null)}
      >
        {duplicate && (
          <Link href={`/organizer/events/${duplicate.event.id}`} className="mt-3 inline-block text-sm font-semibold text-primary-700">
            Open it
          </Link>
        )}
      </ConfirmDialog>
    </PageContainer>
  );
}

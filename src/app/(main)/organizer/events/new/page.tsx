"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { useApp } from "@/lib/app-context";
import { useCategories } from "@/hooks/use-taxonomy";
import { useCreateEvent, useOrganizerStatus } from "@/hooks/use-events";
import { uploadFileDirect } from "@/services/media";
import type { TierInput } from "@/types/event-ticketing";

const inputClass =
  "w-full rounded-xl border border-kampmax-border bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-kampmax-blue";
const MAX_TIERS = 6;

interface TierDraft {
  key: number;
  name: string;
  description: string;
  price: string;
  quantity: string;
}

let tierKey = 1;
const newTier = (name = ""): TierDraft => ({
  key: tierKey++,
  name,
  description: "",
  price: "0",
  quantity: "100",
});

export default function CreateEventPage() {
  const router = useRouter();
  const { selectedCampus } = useApp();
  const status = useOrganizerStatus();
  const create = useCreateEvent();
  const { categories } = useCategories("EVENT");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [capacity, setCapacity] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [tiers, setTiers] = useState<TierDraft[]>([newTier("General Admission")]);

  const campusId = selectedCampus?.id;
  const startMs = startsAt ? new Date(startsAt).getTime() : NaN;
  const endMs = endsAt ? new Date(endsAt).getTime() : NaN;
  const tiersValid = tiers.every(
    (t) =>
      t.name.trim().length >= 2 &&
      Number(t.price) >= 0 &&
      Number.isInteger(Number(t.quantity)) &&
      Number(t.quantity) >= 1
  );
  const totalQty = tiers.reduce((s, t) => s + (Number(t.quantity) || 0), 0);
  const capNum = capacity ? Number(capacity) : null;
  const capacityOk = capNum === null || (Number.isInteger(capNum) && capNum >= totalQty);
  const timesOk = startMs > Date.now() && (!endsAt || endMs > startMs);
  const canSubmit =
    Boolean(campusId) &&
    title.trim().length >= 3 &&
    location.trim().length >= 2 &&
    timesOk &&
    tiersValid &&
    capacityOk &&
    !create.isPending &&
    !uploading;

  async function onCover(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const { data, error } = await uploadFileDirect(file, "banner");
    setUploading(false);
    if (data?.url) setCoverUrl(data.url);
    else setUploadError(error?.message ?? "Couldn't upload that image.");
  }

  function updateTier(key: number, patch: Partial<TierDraft>) {
    setTiers((list) => list.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !campusId) return;
    const tierInputs: TierInput[] = tiers.map((t) => ({
      name: t.name.trim(),
      description: t.description.trim() || undefined,
      price: Number(t.price),
      quantity: Number(t.quantity),
    }));
    create.mutate(
      {
        campusId,
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim(),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        categoryId: categoryId || undefined,
        coverImageUrl: coverUrl ?? undefined,
        capacity: capNum ?? undefined,
        tiers: tierInputs,
      },
      { onSuccess: (event) => router.replace(`/organizer/events/${event.id}`) }
    );
  }

  if (status.data && !status.data.isOrganizer) {
    return (
      <PageContainer narrow className="space-y-3">
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Only approved organizers can create events.{" "}
          <Link href="/organizer" className="font-semibold underline">Ask for access</Link>
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer narrow className="space-y-4 pb-14">
      <Link href="/organizer" className="flex items-center gap-2 text-sm text-kampmax-text-secondary hover:text-kampmax-text">
        <ArrowLeft className="h-4 w-4" /> Cancel
      </Link>
      <h1 className="text-xl font-bold text-kampmax-text">Create an event</h1>

      <form onSubmit={submit} className="space-y-4">
        <section className="space-y-3 rounded-2xl border border-kampmax-border bg-white p-4">
          <div>
            <p className="mb-1 text-xs font-semibold text-kampmax-text">Cover image</p>
            <label className="relative flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-kampmax-border-strong bg-kampmax-muted text-kampmax-text-muted">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="Cover preview" className="h-full w-full object-cover" />
              ) : uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-xs">
                  <ImagePlus className="h-6 w-6" /> Upload a cover
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => void onCover(e.target.files?.[0])}
              />
            </label>
            {uploadError && <p role="alert" className="mt-1 text-xs text-error-700">{uploadError}</p>}
          </div>

          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="RUGIPO Tech Summit 2026" className={inputClass} />
          </Field>
          <Field label="Venue">
            <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} placeholder="RUGIPO ICT Centre" className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts">
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Ends (optional)">
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass} />
            </Field>
          </div>
          {startsAt && !timesOk && (
            <p role="alert" className="text-xs text-error-700">
              The event must start in the future and end after it starts.
            </p>
          )}
          <Field label="Category (optional)">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {`${"  ".repeat(c.depth)}${c.name}`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="About this event (optional)">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={3000} className={inputClass} />
          </Field>
        </section>

        <section className="space-y-3 rounded-2xl border border-kampmax-border bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-kampmax-text">Ticket types</h2>
            {tiers.length < MAX_TIERS && (
              <button type="button" onClick={() => setTiers((l) => [...l, newTier()])} className="inline-flex items-center gap-1 text-xs font-bold text-kampmax-blue">
                <Plus className="h-3.5 w-3.5" /> Add type
              </button>
            )}
          </div>
          {tiers.map((t) => (
            <div key={t.key} className="space-y-2 rounded-xl border border-kampmax-border p-3">
              <div className="flex items-center gap-2">
                <input
                  aria-label="Ticket type name"
                  value={t.name}
                  onChange={(e) => updateTier(t.key, { name: e.target.value })}
                  maxLength={80}
                  placeholder="Regular"
                  className={inputClass}
                />
                {tiers.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove ${t.name || "ticket type"}`}
                    onClick={() => setTiers((l) => l.filter((x) => x.key !== t.key))}
                    className="rounded-lg p-2 text-kampmax-error hover:bg-error-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] font-semibold text-kampmax-text-secondary">
                  Price (₦, 0 = free)
                  <input inputMode="decimal" value={t.price} onChange={(e) => updateTier(t.key, { price: e.target.value.replace(/[^\d.]/g, "") })} className={`mt-0.5 ${inputClass}`} />
                </label>
                <label className="text-[11px] font-semibold text-kampmax-text-secondary">
                  Quantity
                  <input inputMode="numeric" value={t.quantity} onChange={(e) => updateTier(t.key, { quantity: e.target.value.replace(/\D/g, "") })} className={`mt-0.5 ${inputClass}`} />
                </label>
              </div>
              <input
                aria-label="Ticket type description"
                value={t.description}
                onChange={(e) => updateTier(t.key, { description: e.target.value })}
                maxLength={300}
                placeholder="What's included (optional)"
                className={inputClass}
              />
            </div>
          ))}
          <Field label="Overall capacity (optional)">
            <input inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))} placeholder={`At least ${totalQty}`} className={inputClass} />
          </Field>
          {!capacityOk && (
            <p role="alert" className="text-xs text-error-700">
              Capacity can&apos;t be lower than the {totalQty} tickets you&apos;re offering.
            </p>
          )}
          <p className="text-[11px] text-kampmax-text-muted">
            Students pay a small service fee on top of paid tickets. Ticket revenue reaches your wallet
            after the event ends.
          </p>
        </section>

        {!campusId && (
          <p className="text-xs text-error-700">Select your campus first (from the home screen).</p>
        )}
        {create.isError && (
          <p role="alert" className="rounded-lg bg-error-50 p-3 text-xs text-error-700">
            {create.error.message}
          </p>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-bold text-white disabled:opacity-50"
        >
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Publish event
        </button>
      </form>
    </PageContainer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-kampmax-text">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

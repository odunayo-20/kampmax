"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { useApp } from "@/lib/app-context";
import { useCreateEvent } from "@/hooks/use-community";

const inputClass =
  "w-full rounded-xl border border-kampmax-border bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-kampmax-blue";

export default function CreateEventPage() {
  const router = useRouter();
  const { selectedCampus } = useApp();
  const create = useCreateEvent();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [description, setDescription] = useState("");

  const campusId = selectedCampus?.id;
  const canSubmit =
    !!campusId && title.trim().length >= 3 && location.trim().length >= 2 && !!startsAt && !create.isPending;

  function handleSubmit() {
    if (!canSubmit || !campusId) return;
    create.mutate(
      {
        campusId,
        title: title.trim(),
        location: location.trim(),
        description: description.trim() || undefined,
        startsAt: new Date(startsAt).toISOString(),
      },
      { onSuccess: () => router.replace("/community") }
    );
  }

  return (
    <PageContainer className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-kampmax-text-secondary hover:text-kampmax-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-4 py-2 rounded-xl bg-kampmax-blue text-white text-sm font-semibold disabled:opacity-40"
        >
          {create.isPending ? "Creating…" : "Create event"}
        </button>
      </div>

      <div className="space-y-3">
        <input className={inputClass} placeholder="Event title" maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={inputClass} placeholder="Location" maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className={inputClass} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        <textarea
          className={`${inputClass} resize-none`}
          rows={5}
          maxLength={3000}
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {!campusId && <p className="text-xs text-kampmax-error">Select a campus first.</p>}
      {create.isError && <p className="text-xs text-kampmax-error">Couldn&apos;t create the event. Check the details and try again.</p>}
    </PageContainer>
  );
}

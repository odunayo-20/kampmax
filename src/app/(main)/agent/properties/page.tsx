"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAccommodationProperties, useArchiveAccommodationProperty, useArchiveAccommodationUnit } from "@/hooks/use-accommodation";
import { LoadError, Pill, useAsk } from "@/components/accommodation/enquiry-parts";
import { PropertyForm } from "@/components/agent/PropertyForm";
import { RoomEditor } from "@/components/agent/RoomFields";
import { Skeleton } from "@/components/ui/Skeleton";
import { describeHousingError } from "@/lib/accommodation-text";
import { AVAILABILITY_LABEL } from "@/lib/agent-listings";
import { ARCHIVE_CHECK_FAILED, archiveBlocker, archivePropertyWarning, PROPERTIES_EMPTY, publicPlace, roomsLine, unitSummary } from "@/lib/agent-properties";
import { accommodationApi } from "@/services/accommodation";
import type { AccommodationProperty, AccommodationUnit } from "@/types/accommodation";

/**
 * The agent's properties: a list, and the one picked open beside it with its rooms. The same screens as the mobile
 * app's agent-properties and agent-property-form.
 */
export default function AgentPropertiesPage() {
  const q = useAccommodationProperties(1, true);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<string | undefined>();
  const items = q.data?.items ?? [];
  const open = items.find((p) => p.id === (picked ?? items[0]?.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-kampmax-text">Properties and rooms</h1>
          <p className="mt-1 text-sm text-kampmax-text-secondary">Each property holds rooms. You list each room on its own, with its own rent and photos.</p>
        </div>
        <button type="button" onClick={() => setAdding((c) => !c)} className="inline-flex items-center gap-1.5 rounded-xl bg-kampmax-blue px-4 py-2 text-xs font-semibold text-white hover:bg-kampmax-blue/90">
          {adding ? "Close" : <><Plus className="h-4 w-4" aria-hidden /> Add a property</>}
        </button>
      </div>

      {adding && (
        <PropertyForm
          mode="create"
          onCancel={() => setAdding(false)}
          onCreated={(id) => {
            setAdding(false);
            setPicked(id);
          }}
        />
      )}

      {q.isPending ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : q.isError ? (
        <LoadError what="load your properties" error={q.error} onRetry={() => void q.refetch()} />
      ) : items.length === 0 ? (
        !adding && (
          <div className="rounded-2xl border border-dashed border-kampmax-border bg-white p-10 text-center">
            <h2 className="text-base font-bold text-kampmax-text">{PROPERTIES_EMPTY.title}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-kampmax-text-secondary">{PROPERTIES_EMPTY.text}</p>
            <button type="button" onClick={() => setAdding(true)} className="mt-4 rounded-xl bg-kampmax-blue px-4 py-2 text-xs font-semibold text-white">Add your first property</button>
          </div>
        )
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          <ul className="space-y-2" aria-label="Properties">
            {items.map((p) => {
              const on = p.id === open?.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-current={on ? "true" : undefined}
                    onClick={() => setPicked(p.id)}
                    className={`w-full rounded-xl border p-3 text-left ${on ? "border-kampmax-blue bg-blue-50/40" : "border-kampmax-border bg-white hover:bg-kampmax-bg"}`}
                  >
                    <p className="line-clamp-2 text-sm font-semibold text-kampmax-text">{p.title}</p>
                    <p className="truncate text-xs text-kampmax-text-secondary">{[p.categoryName, publicPlace(p)].filter(Boolean).join(" · ")}</p>
                    <p className="mt-1 text-xs text-kampmax-text-secondary">{roomsLine(p.units.length)}</p>
                  </button>
                </li>
              );
            })}
          </ul>
          {open && <PropertyPanel key={open.id} property={open} onArchived={() => setPicked(undefined)} />}
        </div>
      )}
    </div>
  );
}

function PropertyPanel({ property: p, onArchived }: { property: AccommodationProperty; onArchived: () => void }) {
  const archiveProperty = useArchiveAccommodationProperty();
  const archiveUnit = useArchiveAccommodationUnit();
  const [editing, setEditing] = useState(false);
  const [room, setRoom] = useState<{ unit?: AccommodationUnit } | null>(null);
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const { confirm, dialog } = useAsk(archiveProperty.isPending || archiveUnit.isPending);

  /** Looks at the agent's listings first: archiving under a paid listing would leave it running for nothing. */
  async function startArchive(unit?: AccommodationUnit) {
    setProblem(null);
    setChecking(true);
    let blocker: string | null;
    try {
      const listings = await accommodationApi.listings(1, 100);
      blocker = archiveBlocker(listings.items, p.id, unit?.id);
    } catch {
      setProblem(ARCHIVE_CHECK_FAILED);
      return;
    } finally {
      setChecking(false);
    }
    if (blocker) return setProblem(blocker);
    confirm({
      title: `Archive ${unit ? unit.unitName : p.title}?`,
      body: unit ? "It will no longer be listed or editable. This cannot be undone." : archivePropertyWarning(p.units.length),
      confirmLabel: "Archive",
      run: async () => {
        try {
          if (unit) {
            await archiveUnit.mutateAsync({ propertyId: p.id, unitId: unit.id });
            setRoom(null);
          } else {
            await archiveProperty.mutateAsync(p.id);
            onArchived();
          }
        } catch (reason) {
          setProblem(describeHousingError(reason));
        }
      },
    });
  }

  if (editing) return <PropertyForm mode="edit" property={p} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />;

  return (
    <article className="space-y-4 rounded-2xl border border-kampmax-border bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-kampmax-text">{p.title}</h2>
          <p className="text-sm text-kampmax-text-secondary">{[p.categoryName, publicPlace(p)].filter(Boolean).join(" · ")}</p>
          <p className="mt-1 text-xs text-kampmax-text-secondary">Street address (only you and Kampmax see it): {p.address}</p>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="rounded-md border border-kampmax-border px-3 py-2 text-xs">Edit property</button>
      </header>

      {problem && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{problem}</p>}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-kampmax-text">Rooms</h3>
        <p className="text-xs text-kampmax-text-secondary">Each room is listed on its own, with its own rent and photos.</p>
        {p.units.length === 0 && <p className="text-sm text-kampmax-text-secondary">No rooms yet. Add one so you can list it.</p>}
        <ul className="divide-y divide-kampmax-border">
          {p.units.map((u) => (
            <li key={u.id}>
              {room?.unit?.id === u.id ? (
                <RoomEditor property={p} unit={u} archiving={checking} onArchive={() => void startArchive(u)} onDone={() => setRoom(null)} />
              ) : (
                <button type="button" onClick={() => setRoom({ unit: u })} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-kampmax-bg">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-kampmax-text">{u.unitName}</span>
                    <span className="block truncate text-xs text-kampmax-text-secondary">{u.unitType} · {unitSummary(u)}</span>
                  </span>
                  <Pill label={AVAILABILITY_LABEL[u.availabilityStatus] ?? u.availabilityStatus} tone={u.availabilityStatus === "AVAILABLE" ? "positive" : "neutral"} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {room && !room.unit ? (
          <RoomEditor property={p} archiving={false} onDone={() => setRoom(null)} />
        ) : (
          <button type="button" onClick={() => setRoom({})} className="rounded-md border border-kampmax-border px-3 py-2 text-xs">Add a room</button>
        )}
      </section>

      <div className="border-t border-kampmax-border pt-4">
        <button type="button" disabled={checking || archiveProperty.isPending} onClick={() => void startArchive()} className="text-xs text-red-700 underline disabled:opacity-50">
          {checking && !room ? "Checking your listings…" : "Archive this property"}
        </button>
      </div>
      {dialog}
    </article>
  );
}

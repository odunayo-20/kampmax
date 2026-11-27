"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { addSpHours, fetchSpHours, removeSpHours, updateSpHours } from "@/services/service-provider-dashboard";
import {
  checkNewSlot,
  DAYS,
  describeHoursError,
  groupByDay,
  HOURS_NOTE,
  HOURS_PRESETS,
  presetWindows,
  slotLabel12,
  suggestWindow,
  timeLabel,
  timeOptions,
  weekSummary,
  type HoursPreset,
  type Slot,
} from "@/lib/provider-hours";

const HOURS_KEY = ["service-provider", "hours"];

type Editing = { day: number; slot: Slot | null; start: string; end: string; problem: string } | null;
type Write = { ok: boolean; error?: string; status?: number };

/** A write that failed becomes an error the screen can show. */
async function must(call: Promise<Write>): Promise<void> {
  const res = await call;
  if (!res.ok) throw Object.assign(new Error(res.error), { status: res.status });
}

const errorText = (e: unknown) => describeHoursError((e as Error)?.message, (e as { status?: number })?.status);

/**
 * The weekly hours customers can book. A day with no windows is closed; a day can have several windows (a lunch
 * break is two). Every change is saved as it is made, the same as in the app.
 */
export function WeeklyHours() {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: HOURS_KEY, queryFn: fetchSpHours, retry: false });
  const [editing, setEditing] = useState<Editing>(null);
  const [closing, setClosing] = useState<{ day: number; windows: Slot[] } | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: HOURS_KEY });
  const save = useMutation({
    mutationFn: ({ slot, ...body }: { dayOfWeek: number; startTime: string; endTime: string; slot: Slot | null }) =>
      must(slot ? updateSpHours(slot.id, body) : addSpHours(body)),
    onSuccess: () => {
      setEditing(null);
      return refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => must(removeSpHours(id)),
    onSuccess: () => {
      setEditing(null);
      return refresh();
    },
  });
  const openDay = useMutation({ mutationFn: (day: number) => must(addSpHours({ dayOfWeek: day, startTime: suggestWindow([]).start, endTime: suggestWindow([]).end })), onSettled: refresh });
  const closeDay = useMutation({
    mutationFn: (windows: Slot[]) => Promise.all(windows.map((w) => must(removeSpHours(w.id)))),
    onSuccess: () => setClosing(null),
    onSettled: refresh,
  });
  const preset = useMutation({
    mutationFn: (p: HoursPreset) => Promise.all(presetWindows(p, q.data ?? []).map((w) => must(addSpHours(w)))),
    onSettled: refresh,
  });

  if (q.isPending) return <p className="py-6 text-center text-sm text-kampmax-text-secondary">Loading your hours…</p>;
  if (q.isError) {
    return (
      <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-8 text-center text-sm text-kampmax-text-secondary">
        We couldn&apos;t load your hours.{" "}
        <button type="button" onClick={() => void q.refetch()} className="font-semibold text-primary-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const slots = q.data;
  const week = groupByDay(slots);
  const summary = weekSummary(slots);
  const busy = openDay.isPending || closeDay.isPending || preset.isPending;
  const pageError = openDay.error ?? closeDay.error ?? preset.error;

  function begin(day: number, slot: Slot | null) {
    const start = slot ? { start: slot.startTime, end: slot.endTime } : suggestWindow(slots.filter((s) => s.dayOfWeek === day));
    save.reset();
    remove.reset();
    setEditing({ day, slot, ...start, problem: "" });
  }

  function submit() {
    if (!editing) return;
    const check = checkNewSlot(slots, editing.day, editing.start, editing.end, editing.slot?.id);
    if (!check.ok) {
      setEditing({ ...editing, problem: check.error });
      return;
    }
    save.mutate({ slot: editing.slot, dayOfWeek: editing.day, startTime: check.startTime, endTime: check.endTime });
  }

  return (
    <section aria-labelledby="hours-title" className="space-y-4 rounded-xl border border-kampmax-border bg-white p-6">
      <div>
        <h2 id="hours-title" className="text-lg font-bold text-kampmax-text">
          Weekly hours
        </h2>
        {summary && <p className="mt-0.5 text-sm text-kampmax-text-secondary">{summary}</p>}
      </div>

      {slots.length === 0 && (
        <div className="rounded-lg border border-dashed border-kampmax-border p-4">
          <p className="text-sm font-semibold text-kampmax-text">When can customers book you?</p>
          <p className="mt-0.5 text-xs text-kampmax-text-secondary">Pick a starting point. You can change any day afterwards. Until then nobody can book you.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {HOURS_PRESETS.map((p) => (
              <Button key={p.id} variant="outline" size="sm" disabled={busy} onClick={() => preset.mutate(p)}>
                {preset.isPending && preset.variables?.id === p.id ? "Saving…" : p.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="divide-y divide-kampmax-border">
        {week.map(({ day, slots: windows }) => {
          const open = windows.length > 0;
          const editingHere = editing?.day === day.id ? editing : null;
          return (
            <div key={day.id} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-kampmax-text">{day.long}</p>
                  {!open && <p className="text-xs text-kampmax-text-muted">Closed</p>}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={open}
                  aria-label={`${day.long}: ${open ? "open" : "closed"}. Switch to ${open ? "closed" : "open"}`}
                  disabled={busy}
                  onClick={() => (open ? setClosing({ day: day.id, windows }) : openDay.mutate(day.id))}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
                    open ? "bg-primary-600" : "bg-neutral-300"
                  )}
                >
                  <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", open ? "left-[22px]" : "left-0.5")} />
                </button>
              </div>

              {windows.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  aria-label={`${day.long} ${slotLabel12(w)}. Change`}
                  onClick={() => begin(day.id, w)}
                  className="mt-2 flex w-full items-center justify-between rounded-lg bg-neutral-100 px-3 py-2.5 text-left text-sm font-semibold text-kampmax-text hover:bg-neutral-200"
                >
                  {slotLabel12(w)}
                  <Pencil className="h-3.5 w-3.5 text-neutral-500" aria-hidden />
                </button>
              ))}
              {open && !editingHere && (
                <button
                  type="button"
                  onClick={() => begin(day.id, null)}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden /> Add another window
                </button>
              )}

              {editingHere && (
                <div className="mt-3 space-y-3 rounded-lg border border-primary-200 bg-primary-50/50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-kampmax-text-secondary">
                      Opens
                      <Select
                        value={editingHere.start}
                        onChange={(e) => setEditing({ ...editingHere, start: e.target.value, problem: "" })}
                      >
                        {timeOptions([editingHere.start]).map((t) => (
                          <option key={t} value={t}>
                            {timeLabel(t)}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="block text-xs font-semibold text-kampmax-text-secondary">
                      Closes
                      <Select
                        value={editingHere.end}
                        onChange={(e) => setEditing({ ...editingHere, end: e.target.value, problem: "" })}
                      >
                        {timeOptions([editingHere.end]).map((t) => (
                          <option key={t} value={t}>
                            {timeLabel(t)}
                          </option>
                        ))}
                      </Select>
                    </label>
                  </div>
                  <p className="text-sm font-bold text-primary-700" aria-live="polite">
                    {timeLabel(editingHere.start)} to {timeLabel(editingHere.end)}
                  </p>
                  {editingHere.problem && (
                    <p role="alert" className="text-xs text-error-600">
                      {editingHere.problem}
                    </p>
                  )}
                  {(save.isError || remove.isError) && (
                    <p role="alert" className="text-xs text-error-600">
                      {errorText(save.error ?? remove.error)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={submit} disabled={save.isPending}>
                      {save.isPending ? "Saving…" : editingHere.slot ? "Save changes" : "Add hours"}
                    </Button>
                    {editingHere.slot && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={remove.isPending}
                        onClick={() => editingHere.slot && remove.mutate(editingHere.slot.id)}
                      >
                        {remove.isPending ? "Removing…" : "Remove these hours"}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!!pageError && (
        <p role="alert" className="text-sm text-error-600">
          {errorText(pageError)}
        </p>
      )}
      <p className="text-xs text-kampmax-text-muted">{HOURS_NOTE}</p>

      <ConfirmDialog
        open={!!closing}
        title={`Close on ${DAYS.find((d) => d.id === closing?.day)?.long ?? "this day"}?`}
        body="Its working hours are removed and customers cannot book that day."
        confirmLabel="Close day"
        cancelLabel="Keep open"
        destructive
        pending={closeDay.isPending}
        onConfirm={() => closing && closeDay.mutate(closing.windows)}
        onCancel={() => setClosing(null)}
      />
    </section>
  );
}

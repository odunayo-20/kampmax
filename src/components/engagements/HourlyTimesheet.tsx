"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { cn, formatNaira } from "@/lib/utils";
import { getFriendlyErrorMessage, getRefusalMessage } from "@/lib/error-messages";
import { todayISO } from "@/lib/milestone-plan";
import {
  MAX_DAY_MINUTES,
  MAX_NOTE_LENGTH,
  MIN_ENTRY_MINUTES,
  formatMinutes,
  formatWorkDay,
  loggableDays,
  minutesFromInputs,
} from "@/lib/hourly";
import {
  deleteTimeEntryApi,
  fetchTimesheet,
  logTimeApi,
  type TimeEntry,
  type Timesheet,
} from "@/services/timesheet-api";
import type { EngagementStatus } from "@/services/jobs";

const timesheetKey = (engagementId: string) => ["timesheet", engagementId] as const;

/** The states in which a week has a timesheet worth showing. */
const SHOWS_TIME: EngagementStatus[] = ["IN_PROGRESS", "REVISION_REQUESTED", "SUBMITTED", "DISPUTED"];

/**
 * The time logged in an hourly contract's current week. The freelancer logs
 * and removes entries while the week is open; the employer reads them. Every
 * rule (the funded days, the daily and weekly limits) is the backend's, and its
 * refusals are shown as they come; the form only stops obvious mistakes early.
 */
export function HourlyTimesheet({
  engagementId,
  role,
  status,
  onChanged,
}: {
  engagementId: string;
  role: "employer" | "freelancer";
  status: EngagementStatus;
  /** Called after time is added or removed, so lists that show the total can refresh. */
  onChanged?: () => void;
}) {
  if (status === "FUNDED") {
    return (
      <p className="mt-3 rounded-lg bg-kampmax-bg px-3 py-2 text-xs text-kampmax-text-secondary">
        {role === "freelancer"
          ? "This week is funded. You can log time once the client starts the work."
          : "This week is funded. Start the work so the freelancer can log time."}
      </p>
    );
  }
  if (!SHOWS_TIME.includes(status)) return null;
  return <Sheet engagementId={engagementId} role={role} onChanged={onChanged} />;
}

function Sheet({
  engagementId,
  role,
  onChanged,
}: {
  engagementId: string;
  role: "employer" | "freelancer";
  onChanged?: () => void;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: timesheetKey(engagementId),
    queryFn: () => fetchTimesheet(engagementId),
    retry: false,
  });

  const remember = (sheet: Timesheet) => {
    queryClient.setQueryData(timesheetKey(engagementId), sheet);
    onChanged?.();
  };
  const remove = useMutation({
    mutationFn: (entryId: string) => deleteTimeEntryApi(engagementId, entryId),
    onSuccess: remember,
  });

  if (query.isPending) {
    return <div role="status" aria-label="Loading timesheet" className="mt-3 h-24 animate-pulse rounded-lg bg-kampmax-muted" />;
  }
  if (query.isError || !query.data) {
    return (
      <p role="alert" className="mt-3 text-xs text-error-600">
        {getFriendlyErrorMessage(query.error)}
      </p>
    );
  }

  const sheet = query.data;
  const { week } = sheet;
  const percent = week.limitMinutes > 0 ? Math.min(100, Math.round((week.loggedMinutes / week.limitMinutes) * 100)) : 0;

  return (
    <section aria-label="Timesheet" className="mt-3 rounded-lg border border-kampmax-border">
      <div className="border-b border-kampmax-border px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-kampmax-text">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {week.title}
            {week.periodStart && week.periodEnd && (
              <span className="font-normal text-kampmax-text-secondary">
                · {formatWorkDay(week.periodStart)} – {formatWorkDay(week.periodEnd)}
              </span>
            )}
          </h3>
          <p className="text-xs font-medium text-kampmax-text">
            {formatMinutes(week.loggedMinutes)} of {formatMinutes(week.limitMinutes)}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Hours logged this week"
          aria-valuemin={0}
          aria-valuemax={week.limitMinutes}
          aria-valuenow={week.loggedMinutes}
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-kampmax-muted"
        >
          <div className={cn("h-full rounded-full", percent >= 100 ? "bg-accent-500" : "bg-primary-600")} style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] text-kampmax-text-secondary">
          Worth {formatNaira(week.worth)} so far, of up to {formatNaira(week.capAmount)} held for the week.
        </p>
      </div>

      {sheet.entries.length === 0 ? (
        <p className="px-3 py-3 text-xs text-kampmax-text-secondary">
          {role === "freelancer"
            ? "No time logged yet. Add the time you work, day by day."
            : "The freelancer hasn't logged any time this week."}
        </p>
      ) : (
        <ul className="divide-y divide-kampmax-border">
          {sheet.entries.map((entry) => (
            <Entry
              key={entry.id}
              entry={entry}
              onRemove={sheet.canEdit ? () => remove.mutate(entry.id) : undefined}
              removing={remove.isPending && remove.variables === entry.id}
            />
          ))}
        </ul>
      )}
      {remove.isError && (
        <p role="alert" className="px-3 pb-2 text-xs text-error-600">
          {getRefusalMessage(remove.error)}
        </p>
      )}

      {sheet.canEdit && <LogTimeForm engagementId={engagementId} sheet={sheet} onSaved={remember} />}
    </section>
  );
}

function Entry({ entry, onRemove, removing }: { entry: TimeEntry; onRemove?: () => void; removing: boolean }) {
  return (
    <li className="flex items-start gap-2 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-kampmax-text">
          {formatWorkDay(entry.workDate)} · {formatMinutes(entry.minutes)}
        </p>
        {entry.note && <p className="mt-0.5 whitespace-pre-line break-words text-[11px] text-kampmax-text-secondary">{entry.note}</p>}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Remove ${formatMinutes(entry.minutes)} on ${formatWorkDay(entry.workDate)}`}
          className="rounded p-1 text-kampmax-text-secondary hover:bg-kampmax-muted hover:text-error-600 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </li>
  );
}

function LogTimeForm({
  engagementId,
  sheet,
  onSaved,
}: {
  engagementId: string;
  sheet: Timesheet;
  onSaved: (sheet: Timesheet) => void;
}) {
  const { week } = sheet;
  const days = week.periodStart && week.periodEnd ? loggableDays(week.periodStart, week.periodEnd, todayISO()) : [];
  const left = Math.max(0, week.limitMinutes - week.loggedMinutes);

  const [workDate, setWorkDate] = useState(days[days.length - 1] ?? "");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const log = useMutation({
    mutationFn: (input: { workDate: string; minutes: number; note: string }) => logTimeApi(engagementId, input),
    onSuccess: (updated) => {
      setHours("");
      setMinutes("");
      setNote("");
      onSaved(updated);
    },
  });

  if (days.length === 0) return null;
  const field =
    "w-full rounded-lg border border-kampmax-border bg-white px-2.5 py-1.5 text-xs text-kampmax-text focus:border-kampmax-blue focus:outline-none focus:ring-1 focus:ring-kampmax-blue/20";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const total = minutesFromInputs(hours, minutes);
    if (total === null) return setProblem("Enter whole numbers for the hours and minutes.");
    if (total < MIN_ENTRY_MINUTES) return setProblem(`Log at least ${MIN_ENTRY_MINUTES} minutes at a time.`);
    if (total > MAX_DAY_MINUTES) return setProblem(`That is more than ${MAX_DAY_MINUTES / 60} hours in a day.`);
    if (total > left) return setProblem(`That would go over this week's limit. You have ${formatMinutes(left)} left.`);
    setProblem(null);
    log.mutate({ workDate, minutes: total, note: note.trim() });
  }

  return (
    <form onSubmit={submit} noValidate className="border-t border-kampmax-border px-3 py-3">
      <p className="mb-2 text-xs font-semibold text-kampmax-text">
        Log time <span className="font-normal text-kampmax-text-secondary">· {formatMinutes(left)} left this week</span>
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_5rem_5rem]">
        <label className="col-span-2 text-[11px] font-medium text-kampmax-text-secondary sm:col-span-1">
          Day
          <select value={workDate} onChange={(e) => setWorkDate(e.target.value)} className={cn(field, "mt-1")}>
            {days.map((day) => (
              <option key={day} value={day}>
                {formatWorkDay(day)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-medium text-kampmax-text-secondary">
          Hours
          <input type="number" min={0} inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} className={cn(field, "mt-1")} />
        </label>
        <label className="text-[11px] font-medium text-kampmax-text-secondary">
          Minutes
          <input type="number" min={0} max={59} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} className={cn(field, "mt-1")} />
        </label>
      </div>
      <label className="mt-2 block text-[11px] font-medium text-kampmax-text-secondary">
        What did you work on? (optional)
        <input value={note} maxLength={MAX_NOTE_LENGTH} onChange={(e) => setNote(e.target.value)} className={cn(field, "mt-1")} />
      </label>

      {(problem || log.isError) && (
        <p role="alert" className="mt-2 text-xs text-error-600">
          {problem ?? getRefusalMessage(log.error)}
        </p>
      )}
      <Button type="submit" size="sm" className="mt-2" disabled={log.isPending}>
        {log.isPending ? "Logging…" : "Log time"}
      </Button>
    </form>
  );
}

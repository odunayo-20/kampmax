/**
 * Pure rules for a provider's weekly hours and how bookings are taken. The mobile app's lib/provider-hours.ts and
 * lib/service-provider.ts say the same things. Days follow the backend: 0 is Sunday, 6 is Saturday.
 */

export const DAYS: { id: number; short: string; long: string }[] = [
  { id: 1, short: "Mon", long: "Monday" },
  { id: 2, short: "Tue", long: "Tuesday" },
  { id: 3, short: "Wed", long: "Wednesday" },
  { id: 4, short: "Thu", long: "Thursday" },
  { id: 5, short: "Fri", long: "Friday" },
  { id: 6, short: "Sat", long: "Saturday" },
  { id: 0, short: "Sun", long: "Sunday" },
];

export interface Slot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/** "9:00" or "09:00" (24-hour) becomes "09:00"; anything else is null. */
export function normalizeTime(raw: string): string | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(raw.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** "17:30" shown as "5:30 PM". Anything that is not HH:MM comes back unchanged. */
export function timeLabel(t: string): string {
  const n = normalizeTime(t.slice(0, 5));
  if (!n) return t;
  const h = Number(n.slice(0, 2));
  return `${h % 12 === 0 ? 12 : h % 12}:${n.slice(3)} ${h >= 12 ? "PM" : "AM"}`;
}

/** "9:00 AM to 5:00 PM". */
export const slotLabel12 = (s: Pick<Slot, "startTime" | "endTime">) => `${timeLabel(s.startTime)} to ${timeLabel(s.endTime)}`;

export type SlotCheck = { ok: true; startTime: string; endTime: string } | { ok: false; error: string };

/** Whether a window can be added on a day, given the windows already there. When editing, `ignoreId` is the window being changed. */
export function checkNewSlot(existing: Slot[], dayOfWeek: number, startRaw: string, endRaw: string, ignoreId?: string): SlotCheck {
  const startTime = normalizeTime(startRaw);
  const endTime = normalizeTime(endRaw);
  if (!startTime || !endTime) return { ok: false, error: "Choose an opening and a closing time." };
  if (minutes(endTime) <= minutes(startTime)) return { ok: false, error: "The closing time must be after the opening time." };
  const clash = existing.find(
    (s) => s.id !== ignoreId && s.dayOfWeek === dayOfWeek && minutes(startTime) < minutes(s.endTime) && minutes(s.startTime) < minutes(endTime)
  );
  if (clash) return { ok: false, error: `That overlaps your ${slotLabel12(clash)} hours.` };
  return { ok: true, startTime, endTime };
}

/** The week laid out Monday first, each day's windows in time order. */
export function groupByDay(slots: Slot[]): { day: (typeof DAYS)[number]; slots: Slot[] }[] {
  return DAYS.map((day) => ({
    day,
    slots: slots.filter((s) => s.dayOfWeek === day.id).sort((a, b) => minutes(a.startTime) - minutes(b.startTime)),
  }));
}

/** Times a person can pick from, every half hour from 05:00 to 23:30; a value already saved off that grid is kept in the list. */
export function timeOptions(current: string[] = []): string[] {
  const out = new Set<string>();
  for (let m = 5 * 60; m <= 23 * 60 + 30; m += 30) out.add(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  for (const c of current) {
    const n = normalizeTime(c.slice(0, 5));
    if (n) out.add(n);
  }
  return [...out].sort();
}

export interface HoursPreset {
  id: string;
  label: string;
  days: number[];
  start: string;
  end: string;
}

export const HOURS_PRESETS: HoursPreset[] = [
  { id: "weekdays", label: "Mon to Fri, 9 AM to 5 PM", days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" },
  { id: "sixdays", label: "Mon to Sat, 8 AM to 6 PM", days: [1, 2, 3, 4, 5, 6], start: "08:00", end: "18:00" },
  { id: "daily", label: "Every day, 8 AM to 8 PM", days: [1, 2, 3, 4, 5, 6, 0], start: "08:00", end: "20:00" },
];

/** The windows a preset adds, skipping days that already have hours so nothing is doubled up. */
export function presetWindows(preset: HoursPreset, existing: Slot[]): { dayOfWeek: number; startTime: string; endTime: string }[] {
  return preset.days.filter((d) => !existing.some((s) => s.dayOfWeek === d)).map((d) => ({ dayOfWeek: d, startTime: preset.start, endTime: preset.end }));
}

const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/**
 * Where a new window on a day should start out: 9 to 5 on an empty day, otherwise two hours after the last one ends
 * (capped at 23:30). When the day is already full to the evening the plain 9 to 5 is returned and the overlap check explains.
 */
export function suggestWindow(dayWindows: Pick<Slot, "startTime" | "endTime">[]): { start: string; end: string } {
  const fallback = { start: "09:00", end: "17:00" };
  if (dayWindows.length === 0) return fallback;
  const lastEnd = Math.max(...dayWindows.map((s) => minutes(s.endTime)));
  if (lastEnd > 21 * 60 + 30) return fallback;
  return { start: clock(lastEnd), end: clock(Math.min(lastEnd + 120, 23 * 60 + 30)) };
}

/** "Open 5 days, about 40 hours a week", or null with no hours. */
export function weekSummary(slots: Slot[]): string | null {
  if (slots.length === 0) return null;
  const days = new Set(slots.map((s) => s.dayOfWeek)).size;
  const mins = slots.reduce((sum, s) => sum + (minutes(s.endTime) - minutes(s.startTime)), 0);
  const hrs = Math.round(mins / 60);
  return `Open ${days} ${days === 1 ? "day" : "days"}, about ${hrs} ${hrs === 1 ? "hour" : "hours"} a week`;
}

/** The note under the weekly hours. */
export const HOURS_NOTE =
  "Times are local to Nigeria. Add two windows on a day if you take a break, for example 9 AM to 12 PM and 2 PM to 6 PM.";

/**
 * What to show when saving hours or booking rules fails. The server's reason is shown when it is a short refusal it
 * wrote for people (400, 409 or 422, like "That overlaps your 09:00 to 12:00 hours."); anything else gets a plain sentence.
 */
export function describeHoursError(message: string | undefined, status?: number): string {
  const text = message?.trim() ?? "";
  if ((status === 400 || status === 409 || status === 422) && text && text.length <= 200) return text;
  return "Couldn't save. Check your connection and try again.";
}

// ── How bookings are taken ───────────────────────────────────

export type BookingPreference = "INSTANT" | "REQUEST_APPROVAL";

export const BOOKING_PREFERENCES: { id: BookingPreference; label: string; text: string }[] = [
  { id: "INSTANT", label: "Book instantly", text: "Customers book any free time slot straight away." },
  { id: "REQUEST_APPROVAL", label: "I approve each request", text: "You accept or decline each request before it is confirmed." },
];

/** The backend's limits for how bookings are taken. */
export const NOTICE_HOURS = { min: 0, max: 168 };
export const ADVANCE_DAYS = { min: 1, max: 90 };
export const BUFFER_MINUTES = { min: 0, max: 120 };

export interface NumberOption {
  value: string;
  label: string;
}

export const NOTICE_OPTIONS: NumberOption[] = [
  { value: "0", label: "None" },
  { value: "1", label: "1 hour" },
  { value: "2", label: "2 hours" },
  { value: "6", label: "6 hours" },
  { value: "12", label: "12 hours" },
  { value: "24", label: "1 day" },
  { value: "48", label: "2 days" },
];

export const ADVANCE_OPTIONS: NumberOption[] = [
  { value: "7", label: "1 week" },
  { value: "14", label: "2 weeks" },
  { value: "30", label: "1 month" },
  { value: "60", label: "2 months" },
  { value: "90", label: "3 months" },
];

export const BUFFER_OPTIONS: NumberOption[] = [
  { value: "0", label: "None" },
  { value: "10", label: "10 min" },
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hour" },
];

/** The quick picks, plus the person's current value when it is not one of them (so it never silently disappears). */
export function withCurrentOption(options: NumberOption[], current: string, unit: string): NumberOption[] {
  const c = current.trim();
  if (!c || options.some((o) => o.value === c)) return options;
  return [...options, { value: c, label: `${c} ${unit}` }].sort((a, b) => Number(a.value) - Number(b.value));
}

/** The backend's limit on extra campuses a provider can serve. */
export const MAX_EXTRA_CAMPUSES = 10;

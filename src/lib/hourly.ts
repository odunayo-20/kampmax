// ============================================================
// HOURLY CONTRACTS — LIMITS AND WORDING
// ============================================================
// The backend owns every rule and every payment. These helpers keep the forms
// honest and word the money the same way it will be paid: whole minutes, and
// amounts rounded to the nearest kobo, exactly as the backend rounds them.

import { formatNaira } from "@/lib/utils";

export const MIN_HOURLY_RATE = 100;
export const MAX_HOURLY_RATE = 1_000_000;
export const MAX_WEEKLY_HOURS = 60;
export const MIN_ENTRY_MINUTES = 15;
/** More than this in one day is not a plausible day's work. */
export const MAX_DAY_MINUTES = 16 * 60;
export const MAX_NOTE_LENGTH = 500;

const toKobo = (value: number | string): number => Math.round(Number(value) * 100);

/** What `minutes` of work earns at `rate` an hour, to the nearest kobo (as the backend pays it). */
export function hoursWorth(rate: number, minutes: number): number {
  return Math.round((toKobo(rate) * minutes) / 60) / 100;
}

/** The most one week can cost: the rate times the weekly hour limit. */
export function weeklyCap(rate: number, weeklyHours: number): number {
  return (toKobo(rate) * weeklyHours) / 100;
}

/** "18h 30m", "2h", "45m": minutes as people read them. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "₦3,000/hr · up to 20 h/week". */
export function hourlyTerms(rate: number, weeklyHours: number): string {
  return `${formatNaira(rate)}/hr · up to ${weeklyHours} h/week`;
}

/** Whole minutes from the hours and minutes boxes of a form, or null if they do not make a number. */
export function minutesFromInputs(hours: string, minutes: string): number | null {
  const h = hours.trim() === "" ? 0 : Number(hours);
  const m = minutes.trim() === "" ? 0 : Number(minutes);
  if (![h, m].every((n) => Number.isInteger(n) && n >= 0)) return null;
  return h * 60 + m;
}

export interface HourlyTermsErrors {
  rate?: string;
  hours?: string;
}

/** What is wrong with the rate and weekly limit typed into an offer form, or null if they are fine. */
export function validateHourlyTerms(rate: string, weeklyHours: string): HourlyTermsErrors | null {
  const errors: HourlyTermsErrors = {};
  const r = Number(rate);
  if (rate.trim() === "" || !Number.isFinite(r) || r < MIN_HOURLY_RATE || r > MAX_HOURLY_RATE) {
    errors.rate = `Enter a rate from ${formatNaira(MIN_HOURLY_RATE)} to ${formatNaira(MAX_HOURLY_RATE)} an hour.`;
  }
  const h = Number(weeklyHours);
  if (weeklyHours.trim() === "" || !Number.isInteger(h) || h < 1 || h > MAX_WEEKLY_HOURS) {
    errors.hours = `Enter a whole number of hours from 1 to ${MAX_WEEKLY_HOURS}.`;
  }
  return errors.rate || errors.hours ? errors : null;
}

/** "Wed 5 Nov" for a YYYY-MM-DD day, built from its parts so the day never shifts with the viewer's timezone. */
export function formatWorkDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * The days of a week that time can be logged for: from the day it was funded
 * up to today or the last day, whichever comes first. Newest last. Days that
 * have not happened yet are never offered.
 */
export function loggableDays(periodStart: string, periodEnd: string, today: string): string[] {
  const days: string[] = [];
  const [y, m, d] = periodStart.split("-").map(Number);
  for (let i = 0; i < 7; i++) {
    const date = new Date(Date.UTC(y, m - 1, d + i));
    const iso = date.toISOString().slice(0, 10);
    if (iso > periodEnd || iso > today) break;
    days.push(iso);
  }
  return days;
}

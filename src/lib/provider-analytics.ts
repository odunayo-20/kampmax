/**
 * How a service provider's business is doing, from their own bookings: what they earned, how many people booked,
 * which days are busy, which services bring the money. The mobile app's lib/provider-analytics.ts says the same
 * things. Pure rules; no screens, no network. Days are plain YYYY-MM-DD strings in Lagos time, as the backend counts them.
 */

import { formatNaira } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const utc = (day: string) => new Date(`${day}T00:00:00Z`);

export function addDays(day: string, days: number): string {
  const d = utc(day);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today in Nigeria, as the backend counts it. */
export function todayInLagos(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** "Mon 17 Nov". */
export function dayLabel(day: string): string {
  const d = utc(day);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export type ProviderPeriod = "7d" | "30d" | "month" | "last_month";

/** `range` is the name the backend gives the same window. */
export const PROVIDER_PERIODS: { value: ProviderPeriod; label: string; range: string }[] = [
  { value: "7d", label: "7 days", range: "last7d" },
  { value: "30d", label: "30 days", range: "last30d" },
  { value: "month", label: "This month", range: "thisMonth" },
  { value: "last_month", label: "Last month", range: "lastMonth" },
];

export const rangeOf = (period: ProviderPeriod): string => PROVIDER_PERIODS.find((p) => p.value === period)?.range ?? "last30d";

export const periodName = (period: ProviderPeriod): string => PROVIDER_PERIODS.find((p) => p.value === period)?.label ?? "";

export interface Window {
  start: string;
  end: string;
}

/** The first and last calendar day of a period, in Lagos time. */
export function periodWindow(period: ProviderPeriod, today = todayInLagos()): Window {
  const monthStart = `${today.slice(0, 8)}01`;
  if (period === "7d") return { start: addDays(today, -6), end: today };
  if (period === "30d") return { start: addDays(today, -29), end: today };
  if (period === "month") return { start: monthStart, end: today };
  const end = addDays(monthStart, -1);
  return { start: `${end.slice(0, 8)}01`, end };
}

/** A moment as the Lagos calendar day it falls on. */
export function lagosDay(iso: string): string {
  return todayInLagos(new Date(iso));
}

/** The last `max` days of a window, oldest first: the days the chart shows. */
export function chartDays(window: Window, max = 10): string[] {
  const days: string[] = [];
  for (let day = window.end; day >= window.start && days.length < max; day = addDays(day, -1)) days.unshift(day);
  return days;
}

/** One booking, as the analytics endpoint sends it. */
export interface AnalyticsBooking {
  id: string;
  serviceId: string;
  status: string;
  agreedPrice: number;
  createdAt: string;
}

export interface DayCount {
  day: string;
  count: number;
}

/** How many people booked on each of the given days. */
export function bookingsPerDay(bookings: readonly AnalyticsBooking[], days: readonly string[]): DayCount[] {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    const day = lagosDay(b.createdAt);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return days.map((day) => ({ day, count: counts.get(day) ?? 0 }));
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "Busiest day: Mon 17 Nov, 3 bookings." Null when nobody booked. */
export function busiestDay(points: readonly DayCount[]): string | null {
  let best: DayCount | null = null;
  for (const p of points) if (p.count > 0 && (!best || p.count > best.count)) best = p;
  return best ? `Busiest day: ${dayLabel(best.day)}, ${plural(best.count, "booking")}.` : null;
}

export interface ServiceEarning {
  id: string;
  title: string;
  jobs: number;
  revenue: number;
}

/** The services that brought in money (completed jobs only), best first. */
export function topServices(bookings: readonly AnalyticsBooking[], titles: ReadonlyMap<string, string>, limit = 5): ServiceEarning[] {
  const byService = new Map<string, ServiceEarning>();
  for (const b of bookings) {
    if (b.status !== "COMPLETED") continue;
    const row = byService.get(b.serviceId) ?? { id: b.serviceId, title: titles.get(b.serviceId) ?? "A service you removed", jobs: 0, revenue: 0 };
    row.jobs += 1;
    row.revenue += b.agreedPrice;
    byService.set(b.serviceId, row);
  }
  return [...byService.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export const BOOKING_STATUS_NAME: Record<string, string> = {
  PENDING: "Waiting for you",
  ACCEPTED: "Accepted",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  REJECTED: "Declined",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  DISPUTED: "In dispute",
};

export interface StatusCount {
  status: string;
  count: number;
}

/** The statuses that have bookings, most first, with their plain names. */
export function statusRows(counts: readonly StatusCount[]): { status: string; label: string; count: number }[] {
  return counts
    .filter((c) => Number(c.count) > 0)
    .map((c) => ({ status: c.status, label: BOOKING_STATUS_NAME[c.status] ?? c.status, count: Number(c.count) }))
    .sort((a, b) => b.count - a.count);
}

/** A share as a whole-number percentage of the total. */
export function statusPercentage(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((count / total) * 100)));
}

/** Of the bookings that ended one way or the other, how many were completed. 100 when none have ended yet. */
export function completionRate(bookings: readonly AnalyticsBooking[]): number {
  const ended = bookings.filter((b) => ["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"].includes(b.status));
  if (ended.length === 0) return 100;
  return Math.round((ended.filter((b) => b.status === "COMPLETED").length / ended.length) * 100);
}

export interface Earnings {
  gross: number;
  fees: number;
  net: number;
}

/** What the backend's earnings answer means: net is what reaches the wallet. */
export function toEarnings(raw: { earnings?: number; platformFees?: number; netEarnings?: number } | null | undefined): Earnings {
  const gross = Number(raw?.earnings) || 0;
  const fees = Number(raw?.platformFees) || 0;
  const net = raw?.netEarnings === undefined ? Math.max(0, gross - fees) : Number(raw.netEarnings) || 0;
  return { gross, fees, net };
}

/** The line under the headline figure: what customers paid and what Kampmax kept. */
export function earningsNote(e: Earnings): string {
  return e.fees > 0
    ? `${formatNaira(e.gross)} paid by customers, minus ${formatNaira(e.fees)} Kampmax fee. Completed jobs only.`
    : "From completed jobs, after the Kampmax fee.";
}

/** ₦1.5k, ₦2m: for tight spaces. */
export function compactNaira(amount: number): string {
  const n = Math.max(0, Number(amount) || 0);
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return `₦${Math.round(n)}`;
}

/** The note under the whole page. */
export const EARNINGS_FOOTNOTE =
  "Earnings count jobs the customer confirmed. Money for a job still waiting on the customer shows in your wallet as on the way.";

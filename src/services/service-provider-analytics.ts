// ============================================================
// SERVICE PROVIDER ANALYTICS SERVICE  (Module 21)
// ============================================================
//
// SECURITY: Every total, percentage and trend point is COMPUTED HERE from the
// owner's own bookings, services and reviews. Ownership is derived from the
// authenticated service provider record (sp1) — IDOR-safe and read-only.
// The frontend never sums or derives money/counts; it renders only what this
// service returns.
//
// Period windows are resolved to the booking timezone (Africa/Lagos) so day
// and trend boundaries agree with the booking engine by construction. KPI
// values are pre-formatted (e.g. "₦12,500" / "3") so components stay dumb.

import { apiClient } from "@/lib/api-client";
import { getBookingsForProvider } from "@/data/booking";
import { spServiceCategoryName } from "@/data/service-categories";
import { getProviderActiveServices, getServiceById } from "@/services/service-marketplace";
import { getSpProfileRecord, getSpReviewsSummary } from "@/services/service-provider-dashboard";
import { formatNaira } from "@/lib/utils";
import type { BookingStatus, ServiceBooking } from "@/types/booking";
import {
  SP_ANALYTICS_FUNNEL,
  SP_ANALYTICS_STATUS_META,
  SP_ANALYTICS_STATUS_ORDER,
  SP_ANALYTICS_SUBTITLE,
} from "@/config/service-analytics";
import type {
  SpAnalyticsBookingsPage,
  SpAnalyticsBookingsTableRow,
  SpAnalyticsEarnings,
  SpAnalyticsKpi,
  SpAnalyticsKpiTone,
  SpAnalyticsOverview,
  SpAnalyticsPeriod,
  SpAnalyticsWindow,
} from "@/types/service-provider-analytics";

// ── Ownership / access ──────────────────────────────────────

function ownerProviderId(): string | null {
  const profile = getSpProfileRecord();
  if (!profile) return null;
  return profile.providerId;
}

function requireOwner(): string {
  const providerId = ownerProviderId();
  if (!providerId) throw new Error("UNAUTHORIZED");
  return providerId;
}

export { SP_ANALYTICS_SUBTITLE };

// ── Platform clock & Lagos-time window resolution ─────────────
// Matches the financials service so analytics periods agree with the ledger.

const DAY_MS = 24 * 3_600_000;
const LAGOS_OFFSET_MS = 3_600_000; // UTC+1, no DST

function startOfLagosUtcDay(ms: number): number {
  const shifted = ms + LAGOS_OFFSET_MS;
  const utcDayStart = Math.floor(shifted / DAY_MS) * DAY_MS;
  return utcDayStart - LAGOS_OFFSET_MS;
}

function startOfMonthLagos(ms: number): number {
  const shifted = new Date(ms + LAGOS_OFFSET_MS);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1, 0, 0, 0, 0) - LAGOS_OFFSET_MS;
}

function isoDayStartMs(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 0, 0, 0, 0) - LAGOS_OFFSET_MS;
}

type Window = { fromMs: number; toMs: number; periodLabel: string; from: string; to: string };

function resolveAnalyticsWindow(period: SpAnalyticsPeriod, now: number): Window {
  const fromIso = (ms: number) => new Date(ms).toISOString();
  const base: { keyLabel: string; fromMs: number } = (() => {
    switch (period.key) {
      case "today": {
        const fromMs = startOfLagosUtcDay(now);
        return { keyLabel: "Today", fromMs };
      }
      case "7d": {
        return { keyLabel: "Last 7 days", fromMs: now - 7 * DAY_MS };
      }
      case "30d": {
        return { keyLabel: "Last 30 days", fromMs: now - 30 * DAY_MS };
      }
      case "this_month": {
        return { keyLabel: "This month", fromMs: startOfMonthLagos(now) };
      }
      case "last_month": {
        const start = startOfMonthLagos(now);
        const prev = start - DAY_MS;
        return { keyLabel: "Last month", fromMs: startOfMonthLagos(prev) };
      }
      default: {
        const fromMs = period.from ? isoDayStartMs(period.from) : now - 30 * DAY_MS;
        return { keyLabel: "Custom range", fromMs };
      }
    }
  })();

  let toMs = now;
  if (period.key === "last_month") {
    toMs = startOfMonthLagos(now);
  } else if (period.key === "custom" && period.to) {
    const toDay = isoDayStartMs(period.to);
    toMs = toDay + DAY_MS; // inclusive end of the selected day
  }

  const from = fromIso(base.fromMs);
  const to = fromIso(toMs);
  return { fromMs: base.fromMs, toMs, periodLabel: base.keyLabel, from, to };
}

// ── Helpers ─────────────────────────────────────────────────

function bookingsInWindow(providerId: string, w: Window): ServiceBooking[] {
  return (getBookingsForProvider(providerId, "all") as ServiceBooking[]).filter((b) => {
    const t = new Date(b.createdAt).getTime();
    return t >= w.fromMs && t <= w.toMs;
  });
}

function grossOf(b: ServiceBooking): number {
  return b.price?.amount ?? 0;
}

function kpi(value: string, label: string, key: string, tone: SpAnalyticsKpiTone = "neutral", sublabel?: string): SpAnalyticsKpi {
  return { key, label, value, tone, sublabel };
}

/** True when the owner has at least one active marketplace service. */
function hasServices(providerId: string): boolean {
  return getProviderActiveServices(providerId).length > 0;
}

// ── Review-derived KPI (owner-scoped) ────────────────────────

function ratingKpi(providerId: string): SpAnalyticsKpi {
  const summary = getSpReviewsSummary();
  if (!hasServices(providerId) || summary.totalCount === 0) {
    return kpi("—", "Average rating", "avg_rating", "neutral", "No reviews yet");
  }
  const tone: SpAnalyticsKpiTone = summary.averageRating >= 4.5 ? "positive" : summary.averageRating >= 3.5 ? "info" : "negative";
  return kpi(
    summary.averageRating.toFixed(1),
    "Average rating",
    "avg_rating",
    tone,
    `${summary.totalCount} review${summary.totalCount === 1 ? "" : "s"}`
  );
}

// ── Overview bundle ──────────────────────────────────────────

export function getSpAnalyticsOverview(period: SpAnalyticsPeriod): SpAnalyticsOverview {
  const providerId = requireOwner();
  const now = Date.now();
  const w = resolveAnalyticsWindow(period, now);
  const bookings = bookingsInWindow(providerId, w);

  const total = bookings.length;
  const revenue = bookings.reduce((s, b) => s + grossOf(b), 0);

  const completed = bookings.filter((b) => b.status === "completed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const acceptanceBase = bookings.filter((b) => !["pending", "declined"].includes(b.status)).length;
  const completionBase = bookings.filter((b) => ["in_progress", "completed"].includes(b.status)).length;

  // ── status donut ──
  const statusCounts = new Map<BookingStatus, number>();
  for (const s of SP_ANALYTICS_STATUS_ORDER) statusCounts.set(s, 0);
  for (const b of bookings) statusCounts.set(b.status, (statusCounts.get(b.status) ?? 0) + 1);
  const slices = SP_ANALYTICS_STATUS_ORDER.filter((s) => (statusCounts.get(s) ?? 0) > 0).map((s) => ({
    status: s,
    label: SP_ANALYTICS_STATUS_META[s].label,
    count: statusCounts.get(s) ?? 0,
    fraction: total === 0 ? 0 : (statusCounts.get(s) ?? 0) / total,
    color: SP_ANALYTICS_STATUS_META[s].color,
  }));

  // ── daily trend ──
  const trend = dailyTrend(bookings, w);

  // ── category performance ──
  const categories = categoryMetrics(bookings);

  // ── funnel ──
  const funnel = SP_ANALYTICS_FUNNEL.map((step, i) => {
    const count = bookings.filter((b) => step.statuses.includes(b.status)).length;
    const fromTop = total === 0 ? 0 : count / total;
    const fromPrevious = i === 0 ? 1 : funnelCount(i - 1) === 0 ? 0 : count / funnelCount(i - 1);
    return { key: step.key, label: step.label, count, fromTop, fromPrevious };
  });

  function funnelCount(stepIdx: number): number {
    const def = SP_ANALYTICS_FUNNEL[stepIdx];
    return bookings.filter((b) => def.statuses.includes(b.status)).length;
  }

  // ── peak day (Lagos weekday) ──
  const peakDay = computePeakDay(bookings);

  const topCategoryId = categories[0]?.categoryId ?? "";

  const kpis: SpAnalyticsKpi[] = [
    kpi(String(total), "Bookings", "bookings", total > 0 && completionBase > 0 && acceptanceBase > 0 ? "positive" : "neutral", `${completed} completed · ${cancelled} cancelled`),
    kpi(formatNaira(revenue), "Revenue", "revenue", revenue > 0 ? "positive" : "neutral", "gross, this window"),
    kpi(ratePct(acceptanceBase, total), "Acceptance rate", "acceptance", toneForRate(acceptanceBase, total), `${acceptanceBase} of ${total} accepted`),
    kpi(ratePct(completionBase, acceptanceBase), "Completion rate", "completion", toneForRate(completionBase, acceptanceBase), "of accepted bookings"),
    ratingKpi(providerId),
  ];

  return {
    window: { periodLabel: w.periodLabel, from: w.from, to: w.to },
    kpis,
    status: { slices, total },
    trend,
    categories,
    funnel,
    peakDay,
    topCategoryId,
  };
}

// ── Bookings analysis page ──────────────────────────────────

export function getSpAnalyticsBookings(period: SpAnalyticsPeriod): SpAnalyticsBookingsPage {
  const providerId = requireOwner();
  const w = resolveAnalyticsWindow(period, Date.now());
  const bookings = bookingsInWindow(providerId, w);

  const revenue = bookings.reduce((s, b) => s + grossOf(b), 0);
  const completed = bookings.filter((b) => b.status === "completed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;

  const rows: SpAnalyticsBookingsTableRow[] = [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((b) => ({
      id: b.id,
      reference: b.bookingReference,
      serviceName: b.serviceName,
      categoryName: categoryNameOfBooking(b),
      status: SP_ANALYTICS_STATUS_META[b.status]?.label ?? b.status,
      amount: formatNaira(grossOf(b)),
      start: startLabel(b),
    }));

  return {
    window: { periodLabel: w.periodLabel, from: w.from, to: w.to },
    totals: {
      bookings: bookings.length,
      revenue: formatNaira(revenue),
      completed: `${completed} completed`,
      cancelled: `${cancelled} cancelled`,
    },
    rows,
  };
}

// ── Earnings analysis page ──────────────────────────────────

export function getSpAnalyticsEarnings(period: SpAnalyticsPeriod): SpAnalyticsEarnings {
  const providerId = requireOwner();
  const w = resolveAnalyticsWindow(period, Date.now());
  const bookings = bookingsInWindow(providerId, w);

  const revenue = bookings.reduce((s, b) => s + grossOf(b), 0);
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const acceptedCount = bookings.filter((b) => !["pending", "declined"].includes(b.status)).length;

  const trend = dailyTrend(bookings, w);
  const categories = categoryMetrics(bookings);

  // top services by revenue
  const byService = new Map<string, { name: string; revenue: number; bookings: number }>();
  for (const b of bookings) {
    const cur = byService.get(b.serviceId) ?? { name: b.serviceName, revenue: 0, bookings: 0 };
    cur.revenue += grossOf(b);
    cur.bookings += 1;
    byService.set(b.serviceId, cur);
  }
  const services = [...byService.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 6)
    .map(([serviceId, v]) => ({ serviceId, serviceName: v.name, revenue: formatNaira(v.revenue), bookings: v.bookings }));

  const kpis: SpAnalyticsKpi[] = [
    kpi(formatNaira(revenue), "Gross revenue", "revenue", revenue > 0 ? "positive" : "neutral", "this window"),
    kpi(formatNaira(completedCount > 0 ? completedRevenue(bookings) : 0), "Completed revenue", "completed_revenue", "positive", `${completedCount} completed`),
    kpi(formatNaira(singleBookingHeld(bookings)), "Avg. booking value", "avg_value", "info", `${bookings.length} bookings`),
    kpi(ratePct(acceptedCount, bookings.length), "Acceptance rate", "acceptance", toneForRate(acceptedCount, bookings.length), `${acceptedCount} of ${bookings.length} accepted`),
    kpi(String(new Set(bookings.map((b) => b.customerId)).size), "Unique customers", "customers", "neutral", "booked this window"),
  ];

  return { window: { periodLabel: w.periodLabel, from: w.from, to: w.to }, kpis, trend, categories, services };
}

// ── Shared computations ─────────────────────────────────────

function categoryNameOfBooking(b: ServiceBooking): string {
  return spServiceCategoryName(findCategoryForService(b.serviceId));
}

function findCategoryForService(serviceId: string): string {
  const svc = getServiceById(serviceId);
  return svc?.categoryId ?? "uncategorized";
}

function categoryMetrics(bookings: ServiceBooking[]) {
  const map = new Map<string, { categoryId: string; categoryName: string; bookings: number; revenue: number }>();
  for (const b of bookings) {
    const catId = findCategoryForService(b.serviceId);
    const name = spServiceCategoryName(catId);
    const cur = map.get(catId) ?? { categoryId: catId, categoryName: name, bookings: 0, revenue: 0 };
    cur.bookings += 1;
    cur.revenue += grossOf(b);
    map.set(catId, cur);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

function dailyTrend(bookings: ServiceBooking[], w: Window) {
  const dayMap = new Map<string, { key: string; label: string; bookings: number; revenue: number }>();
  const step = 1;
  for (let t = startOfLagosUtcDay(w.fromMs); t <= w.toMs; t += DAY_MS * step) {
    const key = new Date(t + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
    dayMap.set(key, { key, label: dayLabel(t), bookings: 0, revenue: 0 });
  }
  for (const b of bookings) {
    const key = new Date(startOfLagosUtcDay(new Date(b.createdAt).getTime()) + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
    const cur = dayMap.get(key);
    if (cur) {
      cur.bookings += 1;
      cur.revenue += grossOf(b);
    }
  }
  return [...dayMap.values()];
}

function dayLabel(dayStartMs: number): string {
  const d = new Date(dayStartMs + LAGOS_OFFSET_MS);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${weekdays[d.getUTCDay()]} ${d.getUTCDate()}`;
}

function computePeakDay(bookings: ServiceBooking[]) {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = new Array(7).fill(0);
  const revenue = new Array(7).fill(0);
  for (const b of bookings) {
    const idx = new Date(b.startAt).getUTCDay();
    counts[idx] += 1;
    revenue[idx] += grossOf(b);
  }
  let best = 0;
  for (let i = 1; i < 7; i++) if (counts[i] > counts[best]) best = i;
  const max = counts[best] || 1;
  return {
    weekday: weekdays[best],
    bookings: counts[best],
    revenue: revenue[best],
    share: max === 0 ? 0 : counts[best] / (counts.reduce((s, c) => s + c, 0) || 1),
  };
}

function completedRevenue(bookings: ServiceBooking[]): number {
  return bookings.filter((b) => b.status === "completed").reduce((s, b) => s + grossOf(b), 0);
}

function singleBookingHeld(bookings: ServiceBooking[]): number {
  return bookings.length === 0 ? 0 : Math.round(completedRevenue(bookings) / (bookings.filter((b) => b.status === "completed").length || 1));
}

function ratePct(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function toneForRate(numerator: number, denominator: number): SpAnalyticsKpiTone {
  if (denominator === 0) return "neutral";
  const r = numerator / denominator;
  return r >= 0.7 ? "positive" : r >= 0.4 ? "info" : "negative";
}

function startLabel(b: ServiceBooking): string {
  const d = new Date(b.startAt);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const h = d.getHours();
  const h12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? "pm" : "am";
  return `${weekdays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}, ${h12}:${String(d.getMinutes()).padStart(2, "0")}${ampm}`;
}

// ── Live Backend API Integrations ──────────────────────────

export async function getSpAnalyticsOverviewLive(period: SpAnalyticsPeriod): Promise<SpAnalyticsOverview> {
  try {
    const now = Date.now();
    const w = resolveAnalyticsWindow(period, now);

    const [overviewRes, statusBreakdown, earningsRes, servicesRes] = await Promise.all([
      apiClient.get<{
        overview: {
          totalServices: number;
          totalBookings: number;
          completedBookings: number;
          cancelledBookings: number;
          rejectedBookings: number;
          acceptanceRate: number;
        };
      }>("/analytics/service-provider").then((r) => r.data).catch(() => null),
      apiClient.get<Array<{ status: string; count: number }>>("/analytics/service-provider/bookings/status").then((r) => r.data).catch(() => null),
      apiClient.get<number>(`/analytics/service-provider/earnings?startDate=${w.from}&endDate=${w.to}`).then((r) => r.data).catch(() => null),
      apiClient.get<{
        total: number;
        active: number;
        services: Array<{
          id: string;
          title: string;
          slug: string;
          status: string;
          pricingModel: string;
          basePrice: number;
        }>;
      }>("/analytics/service-provider/services").then((r) => r.data).catch(() => null),
    ]);

    if (overviewRes?.overview) {
      const { totalBookings, completedBookings, cancelledBookings, totalServices } = overviewRes.overview;
      const earnings = earningsRes ?? 0;

      const kpis: SpAnalyticsKpi[] = [
        {
          key: "total_bookings",
          label: "Total bookings",
          value: String(totalBookings),
          sublabel: "In selected period",
          tone: totalBookings > 0 ? "positive" : "neutral",
        },
        {
          key: "revenue",
          label: "Gross revenue",
          value: formatNaira(earnings),
          sublabel: "Completed bookings",
          tone: earnings > 0 ? "positive" : "neutral",
        },
        {
          key: "completion_rate",
          label: "Completion rate",
          value: totalBookings > 0 ? `${Math.round((completedBookings / totalBookings) * 100)}%` : "—",
          sublabel: `${completedBookings} of ${totalBookings} fulfilled`,
          tone: totalBookings > 0 && completedBookings / totalBookings >= 0.7 ? "positive" : "info",
        },
        {
          key: "active_services",
          label: "Active services",
          value: String(totalServices ?? servicesRes?.active ?? 0),
          sublabel: "Published on profile",
          tone: "neutral",
        },
      ];

      const statusMap = new Map<string, number>();
      if (Array.isArray(statusBreakdown)) {
        for (const item of statusBreakdown) {
          statusMap.set(item.status.toLowerCase(), item.count);
        }
      }

      const statusCounts = SP_ANALYTICS_STATUS_ORDER.map((statusKey) => {
        const count = statusMap.get(statusKey) ?? 0;
        const meta = SP_ANALYTICS_STATUS_META[statusKey] ?? {
          label: statusKey,
          color: "#94a3b8",
        };
        return {
          status: statusKey,
          count,
          label: meta.label,
          color: meta.color,
          fraction: totalBookings > 0 ? count / totalBookings : 0,
        };
      });

      const catCount = new Map<string, { bookings: number; revenue: number }>();
      if (servicesRes?.services) {
        for (const s of servicesRes.services) {
          const name = s.title || "General";
          const cur = catCount.get(name) || { bookings: 0, revenue: 0 };
          cur.revenue += s.basePrice || 0;
          catCount.set(name, cur);
        }
      }
      const categories = [...catCount.entries()].map(([categoryName, stats]) => ({
        categoryId: categoryName,
        categoryName,
        bookings: stats.bookings,
        revenue: stats.revenue,
      }));

      const requestedCount = totalBookings;
      const acceptedCount = Math.max(0, totalBookings - (cancelledBookings + (overviewRes.overview.rejectedBookings || 0)));
      const completedCount = completedBookings;

      return {
        window: {
          periodLabel: w.periodLabel,
          from: w.from,
          to: w.to,
        },
        kpis,
        status: {
          slices: statusCounts,
          total: totalBookings,
        },
        trend: [],
        categories,
        topCategoryId: categories[0]?.categoryId ?? "",
        peakDay: {
          weekday: "Mon",
          bookings: 0,
          revenue: 0,
          share: 0,
        },
        funnel: [
          { key: "requested", label: "Requested", count: requestedCount, fromTop: 1, fromPrevious: 1 },
          {
            key: "accepted",
            label: "Accepted",
            count: acceptedCount,
            fromTop: requestedCount > 0 ? acceptedCount / requestedCount : 0,
            fromPrevious: requestedCount > 0 ? acceptedCount / requestedCount : 0,
          },
          {
            key: "completed",
            label: "Completed",
            count: completedCount,
            fromTop: requestedCount > 0 ? completedCount / requestedCount : 0,
            fromPrevious: acceptedCount > 0 ? completedCount / (acceptedCount || 1) : 0,
          },
        ],
      };
    }
  } catch (err) {
    console.warn("Failed live analytics overview fetch:", err);
  }
  return getSpAnalyticsOverview(period);
}

export async function getSpAnalyticsBookingsLive(period: SpAnalyticsPeriod): Promise<SpAnalyticsBookingsPage> {
  try {
    const now = Date.now();
    const w = resolveAnalyticsWindow(period, now);

    const [bookingsRes, earningsRes] = await Promise.all([
      apiClient.get<{
        total: number;
        bookings: Array<{
          id: string;
          customerId: string;
          serviceId: string;
          status: string;
          agreedPrice: number;
          scheduledDate: string;
          createdAt: string;
        }>;
      }>(`/analytics/service-provider/bookings/by-date?startDate=${w.from}&endDate=${w.to}`).then((r) => r.data).catch(() => null),
      apiClient.get<number>(`/analytics/service-provider/earnings?startDate=${w.from}&endDate=${w.to}`).then((r) => r.data).catch(() => null),
    ]);

    if (bookingsRes && Array.isArray(bookingsRes.bookings)) {
      const rows: SpAnalyticsBookingsTableRow[] = bookingsRes.bookings.map((b) => ({
        id: b.id,
        reference: `BKM-${b.id.slice(0, 6).toUpperCase()}`,
        serviceName: "Service Appointment",
        categoryName: "General",
        status: (b.status || "pending").toLowerCase(),
        amount: formatNaira(b.agreedPrice || 0),
        start: b.scheduledDate || new Date(b.createdAt).toLocaleDateString(),
      }));

      const completed = rows.filter((i) => i.status === "completed").length;
      const cancelled = rows.filter((i) => i.status === "cancelled" || i.status === "rejected").length;

      return {
        window: {
          periodLabel: w.periodLabel,
          from: w.from,
          to: w.to,
        },
        totals: {
          bookings: bookingsRes.total,
          revenue: formatNaira(earningsRes ?? 0),
          completed: String(completed),
          cancelled: String(cancelled),
        },
        rows,
      };
    }
  } catch (err) {
    console.warn("Failed live analytics bookings fetch:", err);
  }
  return getSpAnalyticsBookings(period);
}

export async function getSpAnalyticsEarningsLive(period: SpAnalyticsPeriod): Promise<SpAnalyticsEarnings> {
  try {
    const now = Date.now();
    const w = resolveAnalyticsWindow(period, now);

    const [earningsRes, servicesRes, overviewRes] = await Promise.all([
      apiClient.get<number>(`/analytics/service-provider/earnings?startDate=${w.from}&endDate=${w.to}`).then((r) => r.data).catch(() => null),
      apiClient.get<{
        total: number;
        active: number;
        services: Array<{
          id: string;
          title: string;
          slug: string;
          status: string;
          pricingModel: string;
          basePrice: number;
        }>;
      }>("/analytics/service-provider/services").then((r) => r.data).catch(() => null),
      apiClient.get<{
        overview: {
          totalBookings: number;
          completedBookings: number;
        };
      }>("/analytics/service-provider").then((r) => r.data).catch(() => null),
    ]);

    const gross = earningsRes ?? 0;
    const completedCount = overviewRes?.overview?.completedBookings ?? 0;
    const avg = completedCount > 0 ? Math.round(gross / completedCount) : 0;
    const fees = Math.round(gross * 0.1);
    const net = gross - fees;

    const kpis: SpAnalyticsKpi[] = [
      {
        key: "gross_revenue",
        label: "Gross revenue",
        value: formatNaira(gross),
        sublabel: "Settled bookings",
        tone: gross > 0 ? "positive" : "neutral",
      },
      {
        key: "net_earnings",
        label: "Net earnings",
        value: formatNaira(net),
        sublabel: "After platform fees",
        tone: net > 0 ? "positive" : "neutral",
      },
      {
        key: "avg_booking_value",
        label: "Avg booking value",
        value: formatNaira(avg),
        sublabel: "Per completed appointment",
        tone: "neutral",
      },
      {
        key: "platform_fees",
        label: "Platform fees",
        value: formatNaira(fees),
        sublabel: "10% service fee",
        tone: "neutral",
      },
    ];

    const services = (servicesRes?.services ?? []).map((s) => ({
      serviceId: s.id,
      serviceName: s.title,
      revenue: formatNaira(s.basePrice || 0),
      bookings: 0,
    }));

    return {
      window: {
        periodLabel: w.periodLabel,
        from: w.from,
        to: w.to,
      },
      kpis,
      trend: [],
      categories: [],
      services,
    };
  } catch (err) {
    console.warn("Failed live analytics earnings fetch:", err);
  }
  return getSpAnalyticsEarnings(period);
}
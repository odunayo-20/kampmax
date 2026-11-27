import { apiClient } from "@/lib/api-client";
import { rangeOf, toEarnings, type AnalyticsBooking, type Earnings, type ProviderPeriod, type StatusCount } from "@/lib/provider-analytics";

export interface ProviderAnalytics {
  earnings: Earnings;
  bookings: AnalyticsBooking[];
  /** Every booking ever, by status: not limited to the period. */
  statuses: StatusCount[];
  /** Service id to title, so earnings can be named. */
  titles: Map<string, string>;
}

/** A failed answer is an error, not zero: the page asks the provider to try again instead of showing ₦0. */
function must<T>(res: { data: T | null; error: { message?: string } | null }): T {
  if (res.error || res.data === null) throw new Error(res.error?.message || "Could not load your analytics.");
  return res.data;
}

/** A service provider's own numbers. Backend: GET /analytics/service-provider/* (the server knows who is asking). */
export async function fetchProviderAnalytics(period: ProviderPeriod): Promise<ProviderAnalytics> {
  const range = `?range=${rangeOf(period)}`;
  const [earnings, byDate, statuses, services] = await Promise.all([
    apiClient.get<{ earnings?: number; platformFees?: number; netEarnings?: number }>(`/analytics/service-provider/earnings${range}`),
    apiClient.get<{ bookings?: AnalyticsBooking[] }>(`/analytics/service-provider/bookings/by-date${range}`),
    apiClient.get<StatusCount[]>("/analytics/service-provider/bookings/status"),
    apiClient.get<{ services?: { id: string; title: string }[] }>("/analytics/service-provider/services"),
  ]);
  return {
    earnings: toEarnings(must(earnings)),
    bookings: must(byDate).bookings ?? [],
    statuses: Array.isArray(must(statuses)) ? must(statuses) : [],
    titles: new Map((must(services).services ?? []).map((s) => [s.id, s.title])),
  };
}

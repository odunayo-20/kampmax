
import { mockCampuses } from "./campuses";

export interface DailyMetric {
  date: string; // ISO
  label: string; // "Aug 22"
  weekday: string;
  revenue: number;
  orders: number;
  signups: number;
  vendorSignups: number;
}

export interface GrowthSeriesPoint {
  label: string;
  usersTotal: number;
  vendorsTotal: number;
}

// ------------------------------------------------------------
// DASHBOARD LIST SOURCES
// ------------------------------------------------------------

export function buildCampusSales() {
  const active = mockCampuses.filter((c) => c.status === "active");
  const totalRevenue = active.reduce((acc, c) => acc + c.gmvThisMonth, 0);
  return active
    .map((c) => ({
      campusId: c.id,
      shortName: c.shortName,
      orders: c.ordersThisMonth,
      revenue: c.gmvThisMonth,
      sharePct: Math.round((c.gmvThisMonth / totalRevenue) * 100),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

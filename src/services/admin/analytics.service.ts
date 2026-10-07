import { AnalyticsFilterOptions, AnalyticsQuery, AnalyticsReport } from "@/types/admin";

// ------------------------------------------------------------
// CONTRACT (future NestJS resource: /admin/reports)
//
// One aggregate endpoint powers the whole console. The mock
// implementation derives every series from a deterministic 365-day
// metrics seed so KPIs, charts and tables reconcile with each
// other exactly like the real warehouse would.
// ------------------------------------------------------------

export interface AdminAnalyticsService {
  getFilterOptions(): Promise<AnalyticsFilterOptions>;
  getReport(query?: AnalyticsQuery): Promise<AnalyticsReport>;
}

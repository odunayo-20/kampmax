// ============================================================
// JOB MODERATION SERVICE CONTRACT
// ============================================================
//
// What an admin can do about vacancies and internships after they are live:
// work through reports, take a posting down, remove an application, and read
// what an applicant sent. Nothing is held for approval before a posting goes
// live. The live implementation is job-moderation.api.ts.
//
// Reading an application, and opening its CV, is written to the audit log on
// the server before anything is shown.
// ============================================================

import type { Paginated } from "@/types/admin";
import type {
  AdminApplicationDetail,
  AdminJobReport,
  JobReportStatus,
  JobReportTarget,
  ResolveReportInput,
  ResolveReportResult,
} from "@/types/job-moderation";
import type { CvLink } from "@/services/job-applications";

export interface JobReportsQuery {
  /** Defaults to open reports. */
  status?: JobReportStatus;
  targetType?: JobReportTarget;
  /** Only reports about this posting. */
  jobId?: string;
  page?: number;
  pageSize?: number;
}

export interface JobReportsPage extends Paginated<AdminJobReport> {
  counts: { open: number; resolved: number };
}

export interface AdminJobModerationService {
  /** GET /admin/job-reports: open reports oldest first, resolved newest first. */
  listReports(query?: JobReportsQuery): Promise<JobReportsPage>;
  /** GET /admin/job-reports/:id (null when unknown). */
  getReport(id: string): Promise<AdminJobReport | null>;
  /** POST /admin/job-reports/:id/resolve: dismiss, take the posting down, or remove the application. */
  resolveReport(id: string, input: ResolveReportInput): Promise<ResolveReportResult>;
  /** GET /admin/applications/:id: the note and answers (logged). */
  getApplication(id: string): Promise<AdminApplicationDetail>;
  /** POST /admin/applications/:id/cv-link: a few-minutes download address (logged). */
  getApplicationCvLink(id: string): Promise<CvLink>;
}

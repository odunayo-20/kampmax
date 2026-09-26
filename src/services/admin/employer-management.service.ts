import type {
  AdminActingContext,
  ManagedEmployer,
  ManagedEmployerDetail,
  Paginated,
  EmployerActivityEvent,
  EmployerStatusCounts,
  ManagedEmployerListQuery,
} from "@/types/admin";

// ------------------------------------------------------------
// CONTRACT (NestJS resource: /admin/employers, see ./employer-management.api.ts)
// ------------------------------------------------------------

export type ManagedEmployerSortField =
  | "name"
  | "joinedAt"
  | "activeJobs"
  | "applicationsReceived"
  | "rating";

export interface AdminEmployerManagementService {
  list(query?: ManagedEmployerListQuery): Promise<Paginated<ManagedEmployer>>;
  getById(id: string): Promise<ManagedEmployerDetail | null>;
  getCounts(): Promise<EmployerStatusCounts>;
  getIndustries(): Promise<string[]>;
  /** The live API requires a written reason (emailed to the employer); the fixture ignores it. */
  suspend(
    id: string,
    ctx?: AdminActingContext,
    reason?: string
  ): Promise<ManagedEmployer>;
  restore(id: string, ctx?: AdminActingContext): Promise<ManagedEmployer>;
  approve(id: string, ctx?: AdminActingContext): Promise<ManagedEmployer>;
  /** The live API requires a reason (emailed to the employer). */
  reject(id: string, reason?: string, ctx?: AdminActingContext): Promise<ManagedEmployer>;
  getActivity(id: string): Promise<EmployerActivityEvent[]>;
}

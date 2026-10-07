import type { AdminActingContext, ManagedFreelancer, ManagedFreelancerDetail, Paginated, FreelancerActivityEvent, FreelancerStatusCounts, ManagedFreelancersListQuery } from "@/types/admin";

// ------------------------------------------------------------
// CONTRACT (NestJS resource: /admin/freelancers, see ./freelancer-management.api.ts)
// ------------------------------------------------------------

export type ManagedFreelancerSortField =
  | "displayName"
  | "joinedAt"
  | "servicesCount"
  | "totalBookings"
  | "rating";

export interface AdminFreelancerManagementService {
  list(query?: ManagedFreelancersListQuery): Promise<Paginated<ManagedFreelancer>>;
  getById(id: string): Promise<ManagedFreelancerDetail | null>;
  getCounts(): Promise<FreelancerStatusCounts>;
  getCategories(): Promise<string[]>;
  /** The live API requires a written reason; the in-memory fixture ignores it. */
  suspend(
    id: string,
    ctx?: AdminActingContext,
    reason?: string
  ): Promise<ManagedFreelancer>;
  activate(id: string, ctx?: AdminActingContext): Promise<ManagedFreelancer>;
  /** The live API requires a written reason (emailed to the freelancer); the fixture ignores it. */
  deactivate(
    id: string,
    ctx?: AdminActingContext,
    reason?: string
  ): Promise<ManagedFreelancer>;
  feature(id: string, ctx?: AdminActingContext): Promise<ManagedFreelancer>;
  unfeature(id: string, ctx?: AdminActingContext): Promise<ManagedFreelancer>;
  getActivity(id: string): Promise<FreelancerActivityEvent[]>;
}

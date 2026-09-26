import type {
  Campus,
  CampusActivityEvent,
  CampusCreateInput,
  CampusStatusCounts,
  ListQuery,
  ManagedCampus,
  ManagedCampusDetail,
  Paginated,
} from "@/types/admin";

// ------------------------------------------------------------
// CONTRACT (NestJS resource: /admin/campuses, see ./campus-management.api.ts)
// ------------------------------------------------------------

export type ManagedCampusSortField =
  | "name"
  | "createdAt"
  | "usersCount"
  | "ordersCount"
  | "revenue";

export interface ManagedCampusListFilters {
  state?: string | "all";
  status?: Campus["status"] | "all";
}

export interface ManagedCampusListQuery extends ListQuery, ManagedCampusListFilters {}

export interface AdminCampusManagementService {
  list(query?: ManagedCampusListQuery): Promise<Paginated<ManagedCampus>>;
  getById(id: string): Promise<ManagedCampusDetail | null>;
  getCounts(): Promise<CampusStatusCounts>;
  getStates(): Promise<string[]>;
  create(input: CampusCreateInput): Promise<ManagedCampus>;
  update(id: string, patch: Partial<CampusCreateInput>): Promise<ManagedCampus>;
  setStatus(id: string, status: Campus["status"]): Promise<ManagedCampus>;
  getActivity(id: string): Promise<CampusActivityEvent[]>;
}

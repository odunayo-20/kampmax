import type {
  AdminActingContext,
  AdminProfile,
  AdminRole,
  ListQuery,
  ManagedUser,
  ManagedUserDetail,
  ManagedUserListItem,
  ManagedUserRole,
  ManagedUserStatus,
  ManagedUserUpdateInput,
  Paginated,
  UserActivityEvent,
  UserStatusCounts,
} from "@/types/admin";

// ------------------------------------------------------------
// CONTRACT (NestJS resource: /admin/users, see ./user-management.api.ts)
//
// Module 35 hardens this surrogate into the authorization boundary for the
// user directory. Every method requires an acting `AdminProfile` context:
//   - CAMPUS_ADMIN operators are read-only AND campus-scoped (their rows,
//     counts, details and activity never cross campus boundaries).
//   - Status/reset/identity mutations are restricted to SUPER_ADMIN/ADMIN.
//   - Self and higher-privilege accounts are protected from mutating actions.
//   - `update()` is identity-only; role/campus are never accepted.
// The UI reflects these rules via `getUserActionPolicy()`, but the service
// remains authoritative — the checks below run for every call.
// ------------------------------------------------------------

export type ManagedUserSortField =
  | "name"
  | "joinedAt"
  | "lastActiveAt"
  | "ordersCount"
  | "totalSpent";

export interface ManagedUserListFilters {
  role?: ManagedUser["role"] | "all";
  campusId?: string | "all";
  status?: ManagedUserStatus | "all";
}

export interface ManagedUserListQuery extends ListQuery, ManagedUserListFilters {}

/** Acting operator context. Future backend derives this from the session. */
export type { AdminActingContext } from "@/types/admin";

/** Hierarchy used to decide who may manage whom. */
export const ACTOR_RANK: Record<AdminRole, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  CAMPUS_ADMIN: 3,
};

export const USER_PRIVILEGE_RANK: Record<ManagedUserRole, number> = {
  super_admin: 5,
  admin: 4,
  campus_admin: 3,
  moderator: 3,
  support: 3,
  vendor: 2,
  customer: 1,
};

/** Roles allowed to perform account management (mutations). */
export const ACCOUNT_MANAGER_ROLES: ReadonlySet<AdminRole> = new Set([
  "SUPER_ADMIN",
  "ADMIN",
]);

// ------------------------------------------------------------
// POLICY (shared with the UI for consistent gating)
// ------------------------------------------------------------

export type UserManageLevel = "platform" | "campus_read_only" | "none";

export interface UserActionPolicy {
  /** True when the actor may run mutating actions on this account. */
  canManage: boolean;
  /** Operator convenience flags – same authorization as `canManage`. */
  canEdit: boolean;
  canSuspend: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  canResetState: boolean;
  /** Target is the operator's own account. */
  isSelf: boolean;
  /** Target holds equal or higher privilege than the operator. */
  isHigherPrivilege: boolean;
  level: UserManageLevel;
  /** Human-safe reasons describing why actions are restricted. */
  reasons: string[];
}

export type UserActionPolicyTarget = Pick<ManagedUser, "email" | "role" | "status">;

export function getUserActionPolicy(
  actor: AdminProfile,
  target: UserActionPolicyTarget
): UserActionPolicy {
  const isSelf = actor.email.toLowerCase() === target.email.toLowerCase();
  const isHigherPrivilege =
    USER_PRIVILEGE_RANK[target.role] >= ACTOR_RANK[actor.role];
  const canManage =
    ACCOUNT_MANAGER_ROLES.has(actor.role) && !isSelf && !isHigherPrivilege;

  const reasons: string[] = [];
  if (!ACCOUNT_MANAGER_ROLES.has(actor.role)) {
    reasons.push("This role has read-only access to the directory.");
  }
  if (isSelf) {
    reasons.push("An operator cannot manage their own account.");
  }
  if (isHigherPrivilege) {
    reasons.push("This account is at or above your privilege level.");
  }

  return {
    canManage,
    canEdit: canManage,
    canSuspend: canManage,
    canActivate: canManage,
    canDeactivate: canManage,
    canResetState: canManage,
    isSelf,
    isHigherPrivilege,
    level: ACCOUNT_MANAGER_ROLES.has(actor.role)
      ? "platform"
      : actor.role === "CAMPUS_ADMIN"
        ? "campus_read_only"
        : "none",
    reasons,
  };
}

// ------------------------------------------------------------
// RESULTS
// ------------------------------------------------------------

export type UserReadFailure = {
  ok: false;
  code: "NOT_FOUND" | "FORBIDDEN";
  message: string;
};

export type ManagedUserDetailResult =
  | { ok: true; detail: ManagedUserDetail; policy: UserActionPolicy }
  | UserReadFailure;

export type UserActivityResult =
  | { ok: true; items: UserActivityEvent[] }
  | UserReadFailure;

export type UserCommandFailureCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "SELF_ACTION"
  | "HIGHER_PRIVILEGE"
  | "LAST_STAFF"
  | "EMAIL_TAKEN"
  | "INVALID_STATUS"
  | "REQUEST_FAILED";

export type UserCommandFailure = {
  ok: false;
  code: UserCommandFailureCode;
  message: string;
};

export type UserCommandResult =
  | { ok: true; user: ManagedUser; message: string }
  | UserCommandFailure;

export interface AdminUserManagementService {
  list(
    query: ManagedUserListQuery | undefined,
    ctx: AdminActingContext
  ): Promise<Paginated<ManagedUserListItem>>;
  getById(id: string, ctx: AdminActingContext): Promise<ManagedUserDetailResult>;
  getCounts(ctx: AdminActingContext): Promise<UserStatusCounts>;
  update(
    id: string,
    patch: ManagedUserUpdateInput,
    ctx: AdminActingContext
  ): Promise<UserCommandResult>;
  setStatus(
    id: string,
    status: ManagedUserStatus,
    ctx: AdminActingContext
  ): Promise<UserCommandResult>;
  resetAccountState(id: string, ctx: AdminActingContext): Promise<UserCommandResult>;
  getActivity(id: string, ctx: AdminActingContext): Promise<UserActivityResult>;
}


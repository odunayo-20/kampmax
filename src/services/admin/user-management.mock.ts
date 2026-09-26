import {
  AdminAuditAction,
  AdminProfile,
  ManagedUser,
  ManagedUserListItem,
  ManagedUserDetail,
  ManagedUserRole,
  ManagedUserStatus,
  ManagedUserUpdateInput,
  UserStatusCounts,
} from "@/types/admin";
import { apiDelay, applySearch, applySort, paginate } from "@/lib/admin/api";
import {
  buildManagedUserDataset,
  type ManagedUserDataset,
} from "@/data/admin/user-management";
import { recordAdminAuditEvent } from "@/data/admin/audit-trail";
import {
  ACCOUNT_MANAGER_ROLES,
  ACTOR_RANK,
  USER_PRIVILEGE_RANK,
  getUserActionPolicy,
  type AdminUserManagementService,
  type UserCommandFailure,
  type UserReadFailure,
} from "./user-management.service";

// ------------------------------------------------------------
// In-memory implementation of AdminUserManagementService.
//
// NOT used by the console anymore (it talks to the API through
// ./user-management.api.ts). Kept as a deterministic fixture for the unit
// tests that exercise authorization rules and audit wiring.
// ------------------------------------------------------------

/** Audit event name per target status transition (canonical vocabulary). */
const USER_ACTION_BY_STATUS: Record<ManagedUserStatus, AdminAuditAction> = {
  active: "USER_ACTIVATED",
  suspended: "USER_SUSPENDED",
  pending_verification: "USER_MARKED_PENDING",
  deactivated: "USER_DEACTIVATED",
};

function auditActorFor(actor: AdminProfile) {
  return { type: "admin" as const, id: actor.id, name: actor.name, role: actor.role };
}

/** Directory staff accounts – protected by the LAST_STAFF guard. */
const STAFF_ROLES: ReadonlySet<ManagedUserRole> = new Set(["admin", "super_admin"]);

const VALID_STATUSES: ReadonlySet<ManagedUserStatus> = new Set([
  "active",
  "suspended",
  "pending_verification",
  "deactivated",
]);

const STATUS_VERB: Record<ManagedUserStatus, string> = {
  active: "activated",
  suspended: "suspended",
  pending_verification: "moved to pending verification",
  deactivated: "deactivated",
};

// ------------------------------------------------------------
// MOCK IMPLEMENTATION
// ------------------------------------------------------------

function createDataset(): ManagedUserDataset {
  return buildManagedUserDataset();
}

export function createUserManagementService(
  seed?: ManagedUserDataset
): AdminUserManagementService {
  const dataset = seed ?? createDataset();
  const users = dataset.users.map((u) => ({ ...u }));
  const details = new Map<string, ManagedUserDetail>();
  // Deep-copy details so module-level mock data stays pristine.
  dataset.details.forEach((detail, id) => details.set(id, structuredCopy(detail)));

  // ── internal helpers ────────────────────────────────────────

  function inCampusScope(actor: AdminProfile, user: ManagedUser): boolean {
    if (actor.role !== "CAMPUS_ADMIN") return true;
    return user.campusId === actor.campusId;
  }

  /** Read authorization. Campus admins may only inspect their own campus. */
  function authorizeRead(
    actor: AdminProfile,
    user: ManagedUser
  ): UserReadFailure | null {
    if (!inCampusScope(actor, user)) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "This account is outside your campus scope.",
      };
    }
    return null;
  }

  /**
   * Mutating authorization. Mutations are platform-only, never self, and
   * never against a target holding equal or higher privilege.
   */
  function authorizeManage(
    actor: AdminProfile,
    user: ManagedUser
  ): UserCommandFailure | null {
    if (!ACCOUNT_MANAGER_ROLES.has(actor.role)) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "Your role does not have permission to manage accounts.",
      };
    }
    if (actor.email.toLowerCase() === user.email.toLowerCase()) {
      return {
        ok: false,
        code: "SELF_ACTION",
        message: "An operator cannot suspend, change, or reset their own account.",
      };
    }
    if (USER_PRIVILEGE_RANK[user.role] >= ACTOR_RANK[actor.role]) {
      return {
        ok: false,
        code: "HIGHER_PRIVILEGE",
        message: "This account is at or above your privilege level.",
      };
    }
    return null;
  }

  function findUserOrNull(id: string): ManagedUser | undefined {
    return users.find((u) => u.id === id);
  }

  function syncDetail(id: string): void {
    const detail = details.get(id);
    const user = users.find((u) => u.id === id);
    if (detail && user) detail.user = { ...user };
  }

  function logActivity(id: string, message: string): void {
    const detail = details.get(id);
    if (!detail) return;
    detail.activity.unshift({
      id: `act-${id}-admin-${detail.activity.length + 1}`,
      kind: "admin",
      message,
      meta: "Admin console",
      at: new Date().toISOString(),
    });
  }

  /** Last active staff guard: never remove the final staff account. */
  function lastActiveStaffUsernames(): Set<string> {
    return new Set(
      users
        .filter((u) => STAFF_ROLES.has(u.role) && u.status === "active")
        .map((u) => u.id)
    );
  }

  function applyStatusGuards(
    actor: AdminProfile,
    user: ManagedUser,
    status: ManagedUserStatus
  ): UserCommandFailure | null {
    if (status === "suspended" || status === "deactivated") {
      const lastActive = lastActiveStaffUsernames();
      if (lastActive.size <= 1 && lastActive.has(user.id)) {
        return {
          ok: false,
          code: "LAST_STAFF",
          message:
            "This is the last active staff account. Reassign permissions before removing it.",
        };
      }
    }
    return null;
  }

  function stripSensitive(row: ManagedUser): ManagedUserListItem {
    const { walletBalance: _omit, ...rest } = row;
    return rest;
  }

  // ── service surface ─────────────────────────────────────────

  return {
    async list(query = {}, ctx) {
      await apiDelay();
      const { actor } = ctx;
      const {
        search,
        sortBy,
        sortDir = "desc",
        page = 1,
        pageSize = 10,
        role = "all",
        campusId = "all",
        status = "all",
      } = query;

      let rows = users.filter(
        (u) =>
          inCampusScope(actor, u) &&
          (role === "all" || u.role === role) &&
          (campusId === "all" || u.campusId === campusId) &&
          (status === "all" || u.status === status)
      );

      rows = applySearch(rows, search, (u) => [
        u.name,
        u.email,
        u.phone,
        u.id,
        u.vendorProfile?.storeName,
      ]);

      rows = applySort(
        rows,
        sortBy,
        sortDir,
        {
          name: (u) => u.name.toLowerCase(),
          joinedAt: (u) => new Date(u.joinedAt).getTime(),
          lastActiveAt: (u) => new Date(u.lastActiveAt).getTime(),
          ordersCount: (u) => u.ordersCount,
          totalSpent: (u) => u.totalSpent,
        },
        "joinedAt"
      );

      const paged = paginate(rows, { page, pageSize });
      return { ...paged, items: paged.items.map(stripSensitive) };
    },

    async getById(id, ctx) {
      await apiDelay(160);
      const { actor } = ctx;
      const detail = details.get(id);
      if (!detail) {
        return { ok: false, code: "NOT_FOUND", message: "User not found." };
      }
      const denied = authorizeRead(actor, detail.user);
      if (denied) return denied;
      return {
        ok: true,
        detail,
        policy: getUserActionPolicy(actor, detail.user),
      };
    },

    async getCounts(ctx) {
      await apiDelay(80);
      const scoped = users.filter((u) => inCampusScope(ctx.actor, u));
      return {
        all: scoped.length,
        active: scoped.filter((u) => u.status === "active").length,
        suspended: scoped.filter((u) => u.status === "suspended").length,
        pending_verification: scoped.filter(
          (u) => u.status === "pending_verification"
        ).length,
        deactivated: scoped.filter((u) => u.status === "deactivated").length,
      };
    },

    async update(id, patch, ctx) {
      await apiDelay();
      const { actor } = ctx;
      const user = findUserOrNull(id);
      if (!user) {
        return { ok: false, code: "NOT_FOUND", message: "User not found." };
      }
      const denied = authorizeManage(actor, user);
      if (denied) return denied;

      // Identity-only surface: role/campus are never accepted here, even if a
      // malicious client smuggles them in (no mass assignment, spec §43/§44).
      const sanitized: ManagedUserUpdateInput = {};
      if (typeof patch.name === "string") sanitized.name = patch.name.trim();
      if (typeof patch.email === "string") sanitized.email = patch.email.trim();
      if (typeof patch.phone === "string") sanitized.phone = patch.phone.trim();

      const email = sanitized.email;
      if (
        email &&
        email.toLowerCase() !== user.email.toLowerCase() &&
        users.some(
          (u) =>
            u.id !== user.id && u.email.toLowerCase() === email.toLowerCase()
        )
      ) {
        return {
          ok: false,
          code: "EMAIL_TAKEN",
          message: "That email is already in use by another account.",
        };
      }

      if (Object.keys(sanitized).length === 0) {
        return { ok: true, user, message: "No changes were made." };
      }

      const idx = users.indexOf(user);
      users[idx] = { ...users[idx], ...sanitized };
      syncDetail(id);
      logActivity(id, "Profile updated by platform admin");
      recordAdminAuditEvent({
        action: "USER_PROFILE_UPDATED",
        actor: auditActorFor(actor),
        resource: { type: "user", id: user.id, label: user.name },
      });
      return { ok: true, user: users[idx], message: "Profile updated." };
    },

    async setStatus(id, status, ctx) {
      await apiDelay();
      const { actor } = ctx;
      if (!VALID_STATUSES.has(status)) {
        return {
          ok: false,
          code: "INVALID_STATUS",
          message: "That is not a valid account status.",
        };
      }
      const user = findUserOrNull(id);
      if (!user) {
        return { ok: false, code: "NOT_FOUND", message: "User not found." };
      }
      const denied = authorizeManage(actor, user);
      if (denied) return denied;
      const guardFail = applyStatusGuards(actor, user, status);
      if (guardFail) return guardFail;

      if (user.status === status) {
        return {
          ok: true,
          user,
          message: `Account is already ${STATUS_VERB[status]}.`,
        };
      }

      const idx = users.indexOf(user);
      users[idx] = { ...user, status };
      syncDetail(id);
      logActivity(id, `Account ${STATUS_VERB[status]} by platform admin`);
      recordAdminAuditEvent({
        action: USER_ACTION_BY_STATUS[status],
        actor: auditActorFor(actor),
        resource: { type: "user", id: user.id, label: user.name },
        metadata: { previousStatus: user.status, newStatus: status },
      });
      return { ok: true, user: users[idx], message: `Account ${STATUS_VERB[status]}.` };
    },

    async resetAccountState(id, ctx) {
      await apiDelay();
      const { actor } = ctx;
      const user = findUserOrNull(id);
      if (!user) {
        return { ok: false, code: "NOT_FOUND", message: "User not found." };
      }
      const denied = authorizeManage(actor, user);
      if (denied) return denied;

      const idx = users.indexOf(user);
      const restored: ManagedUser = {
        ...user,
        status: "active",
        disputeCount: 0,
        reportsCount: 0,
        walletBalance: Math.max(user.walletBalance, 0),
      };
      users[idx] = restored;

      const detail = details.get(id);
      if (detail) {
        detail.reports = [];
        syncDetail(id);
        logActivity(
          id,
          "Account state reset · open reports dismissed and moderation flags cleared"
        );
      }
      recordAdminAuditEvent({
        action: "USER_STATE_RESET",
        actor: auditActorFor(actor),
        resource: { type: "user", id: user.id, label: user.name },
        metadata: { previousStatus: user.status, newStatus: "active" },
      });
      return {
        ok: true,
        user: restored,
        message: "Account state reset.",
      };
    },

    async getActivity(id, ctx) {
      await apiDelay(120);
      const { actor } = ctx;
      const detail = details.get(id);
      if (!detail) {
        return { ok: false, code: "NOT_FOUND", message: "User not found." };
      }
      const denied = authorizeRead(actor, detail.user);
      if (denied) return denied;
      return { ok: true, items: detail.activity };
    },
  };
}

/** Structured clone with Date-free plain objects only. */
function structuredCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
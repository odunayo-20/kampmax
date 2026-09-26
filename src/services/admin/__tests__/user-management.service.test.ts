import { describe, expect, it } from "vitest";
import {
  AdminProfile,
  ManagedUser,
  ManagedUserDetail,
  ManagedUserUpdateInput,
} from "@/types/admin";
import type { ManagedUserDataset } from "@/data/admin/user-management";
import { createUserManagementService } from "@/services/admin/user-management.mock";
import {
  getUserActionPolicy,
  type AdminActingContext,
} from "@/services/admin/user-management.service";

// ------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------

function makeUser(partial: Partial<ManagedUser>): ManagedUser {
  return {
    id: "usr-x",
    name: "Test User",
    email: "test@example.com",
    phone: "+234 800 000 0000",
    role: "customer",
    campusId: "rugipo",
    status: "active",
    isVerified: true,
    joinedAt: "2025-01-01T00:00:00.000Z",
    lastActiveAt: "2025-06-01T00:00:00.000Z",
    ordersCount: 0,
    totalSpent: 0,
    walletBalance: 1500,
    disputeCount: 0,
    reportsCount: 0,
    vendorProfile: null,
    ...partial,
  };
}

function makeDetail(user: ManagedUser, overrides?: Partial<ManagedUserDetail>): ManagedUserDetail {
  return {
    user,
    campus: null,
    wallet: {
      accountId: `wlt-${user.id}`,
      balance: user.walletBalance,
      totalCredited: 5000,
      totalDebited: 3500,
      status: "active",
      lastActivityAt: user.lastActiveAt,
      recentTransactions: [],
    },
    orders: [],
    activity: [],
    reports: [],
    ...overrides,
  };
}

function dataset(users: ManagedUser[], overrides?: Map<string, ManagedUserDetail>): ManagedUserDataset {
  const details =
    overrides ??
    new Map(users.map((u) => [u.id, makeDetail(u)]));
  return { users, details };
}

const SUPER: AdminProfile = {
  id: "adm-super",
  name: "Super Boss",
  email: "super@kampmax.ng",
  role: "SUPER_ADMIN",
  campusId: null,
  avatar: "/brand/avatar-super.png",
  title: "Platform Director",
  lastLoginAt: "2025-09-01T08:00:00.000Z",
};

const MID: AdminProfile = {
  id: "adm-mid",
  name: "Middle Admin",
  email: "mid@kampmax.ng",
  role: "ADMIN",
  campusId: null,
  avatar: "/brand/avatar-mid.png",
  title: "Operations",
  lastLoginAt: "2025-09-01T08:00:00.000Z",
};

const CAMPUS_RUGIPO: AdminProfile = {
  id: "adm-campus",
  name: "Rugipo Admin",
  email: "rugi@kampmax.ng",
  role: "CAMPUS_ADMIN",
  campusId: "rugipo",
  avatar: "/brand/avatar-campus.png",
  title: "Campus Admin",
  lastLoginAt: "2025-09-01T08:00:00.000Z",
};

const ctx = (actor: AdminProfile): AdminActingContext => ({ actor });

const BASE_USERS: ManagedUser[] = [
  makeUser({ id: "usr-1", name: "Ada Obi", email: "ada@example.com", campusId: "rugipo", status: "active", joinedAt: "2025-01-15T00:00:00.000Z", lastActiveAt: "2025-06-10T00:00:00.000Z" }),
  makeUser({ id: "usr-2", name: "Bola Ade", email: "bola@example.com", campusId: "futa", status: "suspended", joinedAt: "2025-02-20T00:00:00.000Z" }),
  makeUser({ id: "usr-3", name: "Chidi Store", email: "chidi@example.com", role: "vendor", campusId: "rugipo", status: "active", joinedAt: "2025-03-01T00:00:00.000Z", vendorProfile: { storeName: "Chidi Electronics", category: "Electronics", status: "approved", rating: 4.6, reviewsCount: 12, productsCount: 20, totalSales: 580000, fulfillmentRate: 98 } }),
  makeUser({ id: "usr-4", name: "Dapo Owo", email: "dapo@example.com", role: "campus_admin", campusId: "rugipo", status: "active", joinedAt: "2025-03-15T00:00:00.000Z" }),
  makeUser({ id: "usr-5", name: "Emeka Lagos", email: "emeka@example.com", role: "admin", campusId: "unilag", status: "active", joinedAt: "2025-04-01T00:00:00.000Z" }),
  makeUser({ id: "usr-6", name: "Grace HQ", email: "grace@example.com", role: "super_admin", campusId: "unilag", status: "suspended", joinedAt: "2025-04-20T00:00:00.000Z" }),
  makeUser({ id: "usr-7", name: "Henry Igwe", email: "henry@example.com", campusId: "aaua", status: "deactivated", joinedAt: "2025-05-05T00:00:00.000Z" }),
];

function baseService() {
  return createUserManagementService(dataset(BASE_USERS));
}

// ------------------------------------------------------------
// List: search, filter, sort, pagination, DTO stripping
// ------------------------------------------------------------

describe("list", () => {
  it("returns a paginated directory with every user by default", async () => {
    const svc = baseService();
    const page = await svc.list({}, ctx(SUPER));
    expect(page.total).toBe(7);
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(10);
    expect(page.totalPages).toBe(1);
    expect(page.items.length).toBe(7);
  });

  it("strips walletBalance from list rows (spec §9 sensitive field)", async () => {
    const svc = baseService();
    const page = await svc.list({}, ctx(SUPER));
    for (const item of page.items) {
      expect("walletBalance" in item).toBe(false);
    }
  });

  it("searches name, email, phone, id and store name case-insensitively", async () => {
    const svc = baseService();
    const byName = await svc.list({ search: "ada" }, ctx(SUPER));
    expect(byName.items.map((u) => u.id)).toEqual(["usr-1"]);

    const byEmail = await svc.list({ search: "EXAMPLE.COM" }, ctx(SUPER));
    expect(byEmail.total).toBe(7);

    const byStore = await svc.list({ search: "electronics" }, ctx(SUPER));
    expect(byStore.items.map((u) => u.id)).toEqual(["usr-3"]);

    const byId = await svc.list({ search: "usr-4" }, ctx(SUPER));
    expect(byId.items.map((u) => u.id)).toEqual(["usr-4"]);
  });

  it("filters by role, status and campus", async () => {
    const svc = baseService();
    const vendors = await svc.list({ role: "vendor" }, ctx(SUPER));
    expect(vendors.items.map((u) => u.id)).toEqual(["usr-3"]);

    const suspended = await svc.list({ status: "suspended" }, ctx(SUPER));
    expect(suspended.items.map((u) => u.id).sort()).toEqual(["usr-2", "usr-6"]);

    const futa = await svc.list({ campusId: "futa" }, ctx(SUPER));
    expect(futa.items.map((u) => u.id)).toEqual(["usr-2"]);

    const staff = await svc.list({ role: "admin" }, ctx(SUPER));
    expect(staff.items.map((u) => u.id)).toEqual(["usr-5"]);

    const superAdmins = await svc.list({ role: "super_admin" }, ctx(SUPER));
    expect(superAdmins.items.map((u) => u.id)).toEqual(["usr-6"]);
  });

  it("sorts by joinedAt descending by default and flips with sortDir", async () => {
    const svc = baseService();
    const desc = await svc.list({}, ctx(SUPER));
    expect(desc.items[0].id).toBe("usr-7");
    const asc = await svc.list({ sortBy: "joinedAt", sortDir: "asc" }, ctx(SUPER));
    expect(asc.items[0].id).toBe("usr-1");
  });

  it("sorts by name using the natural accessor", async () => {
    const svc = baseService();
    const asc = await svc.list({ sortBy: "name", sortDir: "asc" }, ctx(SUPER));
    expect(asc.items[0].name).toBe("Ada Obi");
    expect(asc.items[asc.items.length - 1].name).toBe("Henry Igwe");
  });

  it("paginates and clamps out-of-range pages", async () => {
    const svc = baseService();
    const first = await svc.list({ page: 1, pageSize: 2 }, ctx(SUPER));
    expect(first.items.length).toBe(2);
    expect(first.totalPages).toBe(4);

    // Default sort is joinedAt desc → [usr-7, usr-6, usr-5, usr-4, ...]
    const second = await svc.list({ page: 2, pageSize: 2 }, ctx(SUPER));
    expect(second.items.map((u) => u.id)).toEqual(["usr-5", "usr-4"]);

    const last = await svc.list({ page: 99, pageSize: 2 }, ctx(SUPER));
    expect(last.page).toBe(4);
  });

  it("returns an empty result set for a search with no matches", async () => {
    const svc = baseService();
    const page = await svc.list({ search: "zzzz-no-match" }, ctx(SUPER));
    expect(page.total).toBe(0);
    expect(page.items).toEqual([]);
  });
});

// ------------------------------------------------------------
// Campus scoping (CAMPUS_ADMIN boundary)
// ------------------------------------------------------------

describe("campus scope", () => {
  const svc = baseService();

  it("scopes list rows to the operator's campus even when the filter is platform-wide", async () => {
    const page = await svc.list({ campusId: "all" }, ctx(CAMPUS_RUGIPO));
    expect(page.total).toBe(3);
    expect(page.items.every((u) => u.campusId === "rugipo")).toBe(true);
  });

  it("scopes status counts to the campus", async () => {
    const counts = await svc.getCounts(ctx(CAMPUS_RUGIPO));
    expect(counts.all).toBe(3);
    expect(counts.active).toBe(3);
    expect(counts.suspended).toBe(0);
  });

  it("allows detail reads inside the campus and forbids reads outside", async () => {
    const inside = await svc.getById("usr-1", ctx(CAMPUS_RUGIPO));
    expect(inside.ok).toBe(true);

    const outside = await svc.getById("usr-5", ctx(CAMPUS_RUGIPO));
    expect(outside.ok).toBe(false);
    if (!outside.ok) {
      expect(outside.code).toBe("FORBIDDEN");
    }
  });

  it("scopes activity reads to the campus", async () => {
    const ok = await svc.getActivity("usr-1", ctx(CAMPUS_RUGIPO));
    expect(ok.ok).toBe(true);
    const denied = await svc.getActivity("usr-2", ctx(CAMPUS_RUGIPO));
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("FORBIDDEN");
  });

  it("forbids mutations for campus-scoped operators (read-only boundary)", async () => {
    const result = await svc.setStatus("usr-1", "suspended", ctx(CAMPUS_RUGIPO));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });
});

// ------------------------------------------------------------
// Detail + activity reads
// ------------------------------------------------------------

describe("getById / getActivity", () => {
  it("returns NOT_FOUND for an unknown id", async () => {
    const svc = baseService();
    const result = await svc.getById("usr-missing", ctx(SUPER));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("returns the full detail payload including wallet/orders/activity", async () => {
    const user = makeUser({ id: "usr-full", name: "Full User", status: "active" });
    const rich = makeDetail(user, {
      activity: [{ id: "act-1", kind: "order", message: "Placed an order", meta: "#KMP-1", at: "2025-09-01T09:00:00.000Z" }],
      orders: [{ id: "KMP-1", itemsSummary: "2 x MacBook", itemsCount: 2, total: 40000, status: "delivered", paymentMethod: "wallet", paymentStatus: "paid", createdAt: "2025-09-01T09:00:00.000Z" }],
      reports: [{ id: "rpt-1", reason: "spam", detail: "Repeated spam listings", reporterName: "Jide", status: "open", priority: "high", createdAt: "2025-09-02T09:00:00.000Z" }],
      wallet: {
        accountId: "wlt-full",
        balance: 2500,
        totalCredited: 5000,
        totalDebited: 2500,
        status: "active",
        lastActivityAt: "2025-09-03T09:00:00.000Z",
        recentTransactions: [{ id: "txn-1", direction: "credit", type: "deposit", amount: 1000, reference: "REF-1", status: "completed", createdAt: "2025-09-03T09:00:00.000Z" }],
      },
    });
    const svc = createUserManagementService(dataset([user], new Map([[user.id, rich]])));

    const result = await svc.getById("usr-full", ctx(SUPER));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.detail.orders).toHaveLength(1);
    expect(result.detail.activity).toHaveLength(1);
    expect(result.detail.wallet.recentTransactions).toHaveLength(1);

    const activity = await svc.getActivity("usr-full", ctx(SUPER));
    expect(activity.ok).toBe(true);
    if (activity.ok) expect(activity.items[0].kind).toBe("order");
  });
});

// ------------------------------------------------------------
// Mutations: authorization, self, higher-privilege, guards
// ------------------------------------------------------------

describe("setStatus authorization", () => {
  it("lets a SUPER_ADMIN suspend, activate and deactivate a customer", async () => {
    const svc = baseService();
    const suspended = await svc.setStatus("usr-1", "suspended", ctx(SUPER));
    expect(suspended.ok).toBe(true);
    if (suspended.ok) expect(suspended.user.status).toBe("suspended");

    const active = await svc.setStatus("usr-1", "active", ctx(SUPER));
    expect(active.ok).toBe(true);
    if (active.ok) expect(active.user.status).toBe("active");
  });

  it("lets an ADMIN manage a customer but not an admin (higher privilege)", async () => {
    const svc = baseService();
    const customer = await svc.setStatus("usr-1", "suspended", ctx(MID));
    expect(customer.ok).toBe(true);

    const staff = await svc.setStatus("usr-5", "suspended", ctx(MID));
    expect(staff.ok).toBe(false);
    if (!staff.ok) expect(staff.code).toBe("HIGHER_PRIVILEGE");
  });

  it("forbids a SUPER_ADMIN from touching a super_admin account (same privilege)", async () => {
    const svc = baseService();
    const result = await svc.setStatus("usr-6", "active", ctx(SUPER));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("HIGHER_PRIVILEGE");
  });

  it("rejects self-management (email match) even for a SUPER_ADMIN", async () => {
    const user = makeUser({ id: "usr-self", email: "super@kampmax.ng", status: "active" });
    const svc = createUserManagementService(dataset([user]));
    const result = await svc.setStatus("usr-self", "suspended", ctx(SUPER));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SELF_ACTION");
  });

  it("blocks removing the last active staff account", async () => {
    const users = [
      makeUser({ id: "usr-admin", role: "admin", status: "active", campusId: "unilag" }),
      makeUser({ id: "usr-super", role: "super_admin", status: "suspended", campusId: "unilag" }),
      makeUser({ id: "usr-cust", status: "active", campusId: "rugipo" }),
    ];
    const svc = createUserManagementService(dataset(users));
    const result = await svc.setStatus("usr-admin", "deactivated", ctx(SUPER));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("LAST_STAFF");
  });

  it("is idempotent for the current status", async () => {
    const svc = baseService();
    const result = await svc.setStatus("usr-2", "suspended", ctx(SUPER));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.message).toContain("already");
  });

  it("rejects an invalid status value", async () => {
    const svc = baseService();
    const result = await svc.setStatus("usr-1", "banned" as never, ctx(SUPER));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_STATUS");
  });

  it("returns NOT_FOUND for unknown users", async () => {
    const svc = baseService();
    const result = await svc.setStatus("usr-ghost", "suspended", ctx(SUPER));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

describe("update (identity-only)", () => {
  it("updates name/email/phone for an authorized actor", async () => {
    const svc = baseService();
    const result = await svc.update("usr-1", { name: "Ada Obi Updated", phone: "+234 800 111 2222" }, ctx(MID));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const after = await svc.getById("usr-1", ctx(SUPER));
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.detail.user.name).toBe("Ada Obi Updated");
    expect(after.detail.user.phone).toBe("+234 800 111 2222");
  });

  it("strips role/campus fields even when smuggled in the payload (no mass assignment)", async () => {
    const svc = baseService();
    const smuggled = {
      name: "Hacked Name",
      role: "super_admin",
      campusId: "unilag",
    } as unknown as ManagedUserUpdateInput;
    const result = await svc.update("usr-1", smuggled, ctx(MID));
    expect(result.ok).toBe(true);

    const after = await svc.getById("usr-1", ctx(SUPER));
    if (!after.ok) return;
    expect(after.detail.user.role).toBe("customer");
    expect(after.detail.user.campusId).toBe("rugipo");
    expect(after.detail.user.name).toBe("Hacked Name");
  });

  it("rejects empty patches gracefully", async () => {
    const svc = baseService();
    const result = await svc.update("usr-1", {}, ctx(MID));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.message).toContain("No changes");
  });

  it("rejects an email already used by another account", async () => {
    const svc = baseService();
    const result = await svc.update("usr-2", { email: "ada@example.com" }, ctx(MID));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("EMAIL_TAKEN");
  });

  it("forbids campus-scoped operators and higher-privilege targets", async () => {
    const svc = baseService();
    const campusDenied = await svc.update("usr-1", { name: "X" }, ctx(CAMPUS_RUGIPO));
    expect(campusDenied.ok).toBe(false);
    if (!campusDenied.ok) expect(campusDenied.code).toBe("FORBIDDEN");

    const higher = await svc.update("usr-5", { name: "X" }, ctx(MID));
    expect(higher.ok).toBe(false);
    if (!higher.ok) expect(higher.code).toBe("HIGHER_PRIVILEGE");
  });

  it("rejects self-update", async () => {
    const user = makeUser({ id: "usr-self", email: "super@kampmax.ng" });
    const svc = createUserManagementService(dataset([user]));
    const result = await svc.update("usr-self", { name: "Me" }, ctx(SUPER));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SELF_ACTION");
  });
});

describe("resetAccountState", () => {
  it("clears reports, resets moderation flags and reactivates", async () => {
    const user = makeUser({ id: "usr-dirty", status: "suspended", disputeCount: 3, reportsCount: 2, walletBalance: -400 });
    const dirtyDetail = makeDetail(user, {
      reports: [
        { id: "rpt-1", reason: "scam", detail: "No delivery", reporterName: "Ayo", status: "open", priority: "high", createdAt: "2025-09-01T00:00:00.000Z" },
      ],
    });
    const svc = createUserManagementService(dataset([user], new Map([[user.id, dirtyDetail]])));
    const result = await svc.resetAccountState("usr-dirty", ctx(SUPER));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const after = await svc.getById("usr-dirty", ctx(SUPER));
    if (!after.ok) return;
    expect(after.detail.user.status).toBe("active");
    expect(after.detail.user.reportsCount).toBe(0);
    expect(after.detail.user.disputeCount).toBe(0);
    expect(after.detail.user.walletBalance).toBe(0);
    expect(after.detail.reports).toEqual([]);
  });

  it("is gated by the same authorization as status changes", async () => {
    const svc = baseService();
    const campusDenied = await svc.resetAccountState("usr-1", ctx(CAMPUS_RUGIPO));
    expect(campusDenied.ok).toBe(false);
    if (!campusDenied.ok) expect(campusDenied.code).toBe("FORBIDDEN");

    const higher = await svc.resetAccountState("usr-5", ctx(MID));
    expect(higher.ok).toBe(false);
    if (!higher.ok) expect(higher.code).toBe("HIGHER_PRIVILEGE");
  });
});

// ------------------------------------------------------------
// getUserActionPolicy (shared UI + service policy helper)
// ------------------------------------------------------------

describe("getUserActionPolicy", () => {
  const customer = { email: "ada@example.com", role: "customer" as const, status: "active" as const };

  it("grants platform admins full management over subordinates", () => {
    const policy = getUserActionPolicy(SUPER, customer);
    expect(policy.level).toBe("platform");
    expect(policy.canManage).toBe(true);
    expect(policy.canEdit).toBe(true);
    expect(policy.isSelf).toBe(false);
    expect(policy.isHigherPrivilege).toBe(false);
    expect(policy.reasons).toEqual([]);
  });

  it("flags higher-privilege targets", () => {
    const asSuper = getUserActionPolicy(SUPER, { email: "grace@example.com", role: "super_admin", status: "suspended" });
    expect(asSuper.canManage).toBe(false);
    expect(asSuper.isHigherPrivilege).toBe(true);

    const asAdmin = getUserActionPolicy(MID, { email: "emeka@example.com", role: "admin", status: "active" });
    expect(asAdmin.canManage).toBe(false);
    expect(asAdmin.isHigherPrivilege).toBe(true);

    const asAdminOnCampusAdmin = getUserActionPolicy(MID, { email: "dapo@example.com", role: "campus_admin", status: "active" });
    expect(asAdminOnCampusAdmin.canManage).toBe(true);
  });

  it("marks read-only for campus-scoped operators", () => {
    const policy = getUserActionPolicy(CAMPUS_RUGIPO, customer);
    expect(policy.level).toBe("campus_read_only");
    expect(policy.canManage).toBe(false);
    expect(policy.reasons.length).toBeGreaterThan(0);
  });

  it("marks self-accounts as never manageable", () => {
    const policy = getUserActionPolicy(SUPER, { email: "super@kampmax.ng", role: "customer", status: "active" });
    expect(policy.isSelf).toBe(true);
    expect(policy.canManage).toBe(false);
  });
});
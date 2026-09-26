import { beforeEach, describe, expect, it } from "vitest";
import { createAdminAuditTrailService } from "@/services/admin/audit-trail.service";
import {
  ADMIN_AUDIT_SEVERITY,
  ADMIN_SECURITY_EVENT_ACTIONS,
  DEFAULT_ADMIN_ACTOR,
  getAuditEventById,
  recordAdminAuditEvent,
  resetAdminAuditTrail,
} from "@/data/admin/audit-trail";
import { createUserManagementService } from "@/services/admin/user-management.mock";
import { createVendorManagementService } from "@/services/admin/vendor-management.service";
import { createFreelancerManagementService } from "@/services/admin/freelancer-management.service";
import { createEmployerManagementService } from "@/services/admin/employer-management.service";
import { createVerificationManagementService } from "@/services/admin/verification-management.service";
import { createAdminCommunicationService } from "@/services/admin/communication-management.service";
import { resetVendorAdminState } from "@/data/admin/vendor-management";
import type { ManagedUserDataset } from "@/data/admin/user-management";
import type {
  AdminAuditEvent,
  AdminProfile,
  AdminAuditEventActor,
  AdminAuditResourceType,
  ManagedUser,
  ManagedUserDetail,
} from "@/types/admin";

const svc = createAdminAuditTrailService();

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

function toAuditActor(p: AdminProfile): AdminAuditEventActor {
  return { type: "admin" as const, id: p.id, name: p.name, role: p.role };
}

const ALLOWED_METADATA_KEYS = [
  "reason",
  "previousStatus",
  "newStatus",
  "audience",
  "recipientCount",
  "title",
];

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

function makeDetail(user: ManagedUser): ManagedUserDetail {
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
  };
}

function baseUsers() {
  return [
    makeUser({ id: "usr-a", name: "Ada Obi", email: "ada@example.com", status: "active" }),
    makeUser({
      id: "usr-b",
      name: "Emeka Staff",
      email: "emeka@example.com",
      role: "admin",
      status: "active",
    }),
  ];
}

function userService() {
  const users = baseUsers();
  const dataset: ManagedUserDataset = {
    users,
    details: new Map(users.map((u) => [u.id, makeDetail(u)])),
  };
  return createUserManagementService(dataset);
}

beforeEach(() => {
  resetAdminAuditTrail();
  resetVendorAdminState();
});

// ------------------------------------------------------------
// Empty / no-fabrication contract
// ------------------------------------------------------------

describe("audit trail: append-only, backend-authoritative store", () => {
  it("starts empty for a session and fills only on real mutations", async () => {
    const before = await svc.list();
    expect(before.total).toBe(0);
    expect(before.items).toHaveLength(0);

    await userService().setStatus("usr-a", "suspended", { actor: SUPER });

    const after = await svc.list();
    expect(after.total).toBe(1);
    expect(after.items[0].action).toBe("USER_SUSPENDED");
  });

  it("exposes no mutators on the read-only service", () => {
    expect(svc).not.toHaveProperty("record");
    expect(svc).not.toHaveProperty("delete");
    expect(svc).not.toHaveProperty("clear");
    expect(svc).not.toHaveProperty("update");
  });

  it("records only allowlisted metadata and never fabricates request context", () => {
    const event = recordAdminAuditEvent({
      action: "VENDOR_REJECTED",
      actor: toAuditActor(SUPER),
      resource: { type: "vendor", id: "v5", label: "Chidi Store" },
      metadata: { reason: "No BVN provided" },
    });

    const payload = event as AdminAuditEvent & Record<string, unknown>;
    expect(payload).not.toHaveProperty("ip");
    expect(payload).not.toHaveProperty("device");
    expect(payload).not.toHaveProperty("userAgent");
    expect(payload).not.toHaveProperty("requestId");
    expect(payload).not.toHaveProperty("sensitivePayload");

    for (const key of Object.keys(event.metadata)) {
      expect(ALLOWED_METADATA_KEYS).toContain(key);
    }
  });

  it("applies backend-assigned severity and the security-event set", () => {
    expect(ADMIN_AUDIT_SEVERITY.USER_SUSPENDED).toBe("high");
    expect(ADMIN_AUDIT_SEVERITY.NOTIFICATION_SENT).toBe("low");

    const security = recordAdminAuditEvent({
      action: "USER_DEACTIVATED",
      actor: toAuditActor(SUPER),
      resource: { type: "user", id: "usr-a", label: "Ada Obi" },
    });
    expect(ADMIN_SECURITY_EVENT_ACTIONS.has(security.action)).toBe(true);
    expect(security.severity).toBe("high");
  });

  it("serializes event ids and resolves details deterministically", () => {
    const first = recordAdminAuditEvent({
      action: "USER_PROFILE_UPDATED",
      actor: DEFAULT_ADMIN_ACTOR,
      resource: { type: "user", id: "usr-a", label: "Ada Obi" },
    });
    const second = recordAdminAuditEvent({
      action: "USER_PROFILE_UPDATED",
      actor: DEFAULT_ADMIN_ACTOR,
      resource: { type: "user", id: "usr-b", label: "Emeka Staff" },
    });

    expect(second.id).toBe(`aev-${Number(first.id.split("-")[1]) + 1}`);
    expect(getAuditEventById(first.id)?.action).toBe("USER_PROFILE_UPDATED");
    expect(getAuditEventById("aev-9999")).toBeNull();
  });
});

// ------------------------------------------------------------
// Wiring: every real mutation records a canonical event
// ------------------------------------------------------------

describe("audit trail wiring (real mutation services)", () => {
  it("user management: setStatus / update / resetAccountState", async () => {
    const users = userService();

    await users.setStatus("usr-a", "suspended", { actor: SUPER });
    await users.update(
      "usr-a",
      { name: "Ada Obi II" },
      { actor: SUPER }
    );
    await users.resetAccountState("usr-a", { actor: SUPER });

    const list = await svc.list({ page: 1, pageSize: 20 });
    const byAction = (a: string) => list.items.filter((e) => e.action === a);

    expect(byAction("USER_SUSPENDED")).toHaveLength(1);
    const suspended = byAction("USER_SUSPENDED")[0];
    expect(suspended.actor.id).toBe("adm-super");
    expect(suspended.actor.name).toBe("Super Boss");
    expect(suspended.resource).toMatchObject({ type: "user", id: "usr-a", label: "Ada Obi" });
    expect(suspended.metadata).toMatchObject({ previousStatus: "active", newStatus: "suspended" });
    expect(suspended.severity).toBe("high");

    const updated = byAction("USER_PROFILE_UPDATED")[0];
    expect(updated.resource.id).toBe("usr-a");

    const reset = byAction("USER_STATE_RESET")[0];
    expect(reset.metadata).toMatchObject({ newStatus: "active" });
    expect(ADMIN_SECURITY_EVENT_ACTIONS.has(reset.action)).toBe(true);
  });

  it("vendor management: approve/reject carry actor identity and default; suspend/activate/deactivate", async () => {
    const vendors = createVendorManagementService();

    const approved = await vendors.approve("v5", { actor: SUPER });
    expect(approved.verificationStatus).toBe("verified");
    await vendors.suspend("v5", { actor: SUPER });
    await vendors.activate("v5", { actor: SUPER });
    await vendors.deactivate("v5", { actor: SUPER });

    const list = await svc.list({ page: 1, pageSize: 20 });
    const actions = list.items.map((e) => e.action);

    expect(actions).toEqual([
      "VENDOR_DEACTIVATED",
      "VENDOR_ACTIVATED",
      "VENDOR_SUSPENDED",
      "VENDOR_APPROVED",
    ]);

    const approvedEvent = list.items.find((e) => e.action === "VENDOR_APPROVED");
    expect(approvedEvent?.actor.name).toBe("Super Boss");
    expect(approvedEvent?.resource).toMatchObject({ type: "vendor", id: "v5" });
    expect(approvedEvent?.metadata).toMatchObject({
      previousStatus: "pending_verification",
      newStatus: "verified",
    });
  });

  it("vendor management: no-ctx callers fall back to the documented Platform Admin surrogate", async () => {
    const vendors = createVendorManagementService();
    await vendors.reject("v5", "No BVN provided");

    const rejected = (await svc.list({ action: "VENDOR_REJECTED" })).items[0];
    expect(rejected.actor).toMatchObject({
      type: "admin",
      id: "platform-admin",
      name: "Platform Admin",
    });
    expect(rejected.metadata.reason).toBe("No BVN provided");
  });

  it("freelancer management: suspend / activate / deactivate / feature / unfeature", async () => {
    const freelancers = createFreelancerManagementService();

    await freelancers.suspend("sp1", { actor: SUPER });
    await freelancers.activate("sp1", { actor: SUPER });
    await freelancers.deactivate("sp1", { actor: SUPER });
    await freelancers.feature("sp1", { actor: SUPER });
    await freelancers.unfeature("sp1", { actor: SUPER });

    const list = await svc.list({ page: 1, pageSize: 20 });
    expect(list.items.map((e) => e.action)).toEqual([
      "FREELANCER_UNFEATURED",
      "FREELANCER_FEATURED",
      "FREELANCER_DEACTIVATED",
      "FREELANCER_ACTIVATED",
      "FREELANCER_SUSPENDED",
    ]);
    expect(list.items[0].resource).toMatchObject({ type: "freelancer", id: "sp1" });
  });

  it("employer management: suspend / restore", async () => {
    const employers = createEmployerManagementService();

    await employers.suspend("u1", { actor: SUPER });
    await employers.restore("u1", { actor: SUPER });

    const list = await svc.list({ page: 1, pageSize: 20 });
    expect(list.items.map((e) => e.action)).toEqual([
      "EMPLOYER_RESTORED",
      "EMPLOYER_SUSPENDED",
    ]);
    expect(list.items[0].actor.name).toBe("Super Boss");
  });

  it("verification decisions flow through to vendor audit events with the real operator", async () => {
    const verifications = createVerificationManagementService();

    await verifications.approve("vrf-vendor-v5", { actor: SUPER });

    const list = await svc.list({ page: 1, pageSize: 20 });
    expect(list.total).toBe(1);
    const event = list.items[0];
    expect(event.action).toBe("VENDOR_APPROVED");
    expect(event.actor.name).toBe("Super Boss");
    expect(event.resource).toMatchObject({ type: "vendor", id: "v5" });
    expect(list.items.some((e) => e.resource.type === "verification" as AdminAuditResourceType)).toBe(false);
  });

  it("communication: NOTIFICATION_SENT with allowlisted dispatch context", async () => {
    const communications = createAdminCommunicationService();

    await communications.create(
      {
        title: "Semester promo is live",
        message: "Use code CAMPUS10 at checkout.",
        type: "system",
        category: "account",
        audience: "all_users",
        actionUrl: "/marketplace",
      },
      { actor: SUPER }
    );

    const sent = (await svc.list({ action: "NOTIFICATION_SENT" })).items[0];
    expect(sent.resource).toMatchObject({ type: "notification" });
    expect(sent.actor.name).toBe("Super Boss");
    expect(sent.metadata).toMatchObject({
      audience: "all_users",
      title: "Semester promo is live",
      recipientCount: 5,
    });
    expect(sent.severity).toBe("low");
  });
});

// ------------------------------------------------------------
// Read contract: filter, search, sort, pagination, metrics
// ------------------------------------------------------------

describe("audit trail read contract", () => {
  function seed() {
    resetAdminAuditTrail();
    recordAdminAuditEvent({
      action: "USER_SUSPENDED",
      actor: toAuditActor(SUPER),
      resource: { type: "user", id: "usr-a", label: "Ada Obi" },
      at: "2026-01-02T10:00:00.000Z",
    });
    recordAdminAuditEvent({
      action: "VENDOR_REJECTED",
      actor: DEFAULT_ADMIN_ACTOR,
      resource: { type: "vendor", id: "v5", label: "Chidi Store" },
      metadata: { reason: "Docs incomplete" },
      at: "2026-01-03T11:00:00.000Z",
    });
    recordAdminAuditEvent({
      action: "NOTIFICATION_SENT",
      actor: toAuditActor(SUPER),
      resource: { type: "notification", id: "nk-1", label: "Semester promo" },
      result: "denied",
      at: "2026-01-04T12:00:00.000Z",
    });
  }

  it("filters by action, resource type, actor, result and date range", async () => {
    seed();

    expect((await svc.list({ action: "USER_SUSPENDED" })).total).toBe(1);
    expect((await svc.list({ resourceType: "vendor" })).total).toBe(1);
    expect((await svc.list({ actorId: "adm-super" })).total).toBe(2);
    expect((await svc.list({ result: "denied" })).total).toBe(1);
    expect((await svc.list({ dateFrom: "2026-01-03", dateTo: "2026-01-31" })).total).toBe(2);
    expect((await svc.list({ severity: "high" })).total).toBe(1);
  });

  it("searches across id, action, actor and resource", async () => {
    seed();
    expect((await svc.list({ search: "share" })).total).toBe(0); // 'share' not present
    expect((await svc.list({ search: "super" })).total).toBe(2);
    expect((await svc.list({ search: "chidi" })).total).toBe(1);
    expect((await svc.list({ search: "nk-1" })).total).toBe(1);
  });

  it("securityOnly restricts to the backend-classified security subset (suspensions / deactivations / state resets)", async () => {
    seed();
    const all = await svc.list({ pageSize: 50 });
    const security = await svc.list({ securityOnly: true, pageSize: 50 });
    // Only USER_SUSPENDED in this seed qualifies.
    expect(security.total).toBe(1);
    expect(security.items[0].action).toBe("USER_SUSPENDED");
    expect(security.items[0].result).not.toBe("denied");
    // Every returned event is a member of the security set...
    for (const event of security.items) {
      expect(ADMIN_SECURITY_EVENT_ACTIONS.has(event.action)).toBe(true);
    }
    // ...and securityOnly is a strict subset of the full trail.
    expect(security.total).toBeLessThan(all.total);
    // Date + severity filters still compose with securityOnly.
    expect((await svc.list({ securityOnly: true, dateFrom: "2026-01-04" })).total).toBe(0);
    expect((await svc.list({ securityOnly: true, severity: "high" })).total).toBe(1);
    // securityOnly never fabricates: excluded actions (rejection, notification) stay out.
    expect((await svc.list({ securityOnly: true, action: "VENDOR_REJECTED" })).total).toBe(0);
  });

  it("sorts by timestamp descending by default", async () => {
    seed();
    const list = await svc.list();
    const times = list.items.map((e) => new Date(e.at).getTime());
    expect(times[0]).toBeGreaterThanOrEqual(times[1]);
    expect(times[1]).toBeGreaterThanOrEqual(times[2]);
  });

  it("paginates deterministically with stable totals", async () => {
    seed();
    const p1 = await svc.list({ page: 1, pageSize: 2 });
    const p2 = await svc.list({ page: 2, pageSize: 2 });
    expect(p1.items).toHaveLength(2);
    expect(p2.items).toHaveLength(1);
    expect(p1.total).toBe(3);
    expect(p2.total).toBe(3);
    expect(p1.items[0].id).not.toBe(p2.items[0].id);
  });

  it("builds authoritative metrics including security and failure counts", async () => {
    seed();
    const metrics = await svc.getMetrics();
    expect(metrics.total).toBe(3);
    expect(metrics.securityEvents).toBe(1); // USER_SUSPENDED
    expect(metrics.highSeverity).toBe(1);
    expect(metrics.failed).toBe(0);
    expect(metrics.denied).toBe(1);
  });

  it("returns actor options derived from real recorded actors", async () => {
    seed();
    const actors = await svc.getActorOptions();
    expect(actors.map((a) => a.id).sort()).toEqual(["adm-super", "platform-admin"].sort());
  });
});
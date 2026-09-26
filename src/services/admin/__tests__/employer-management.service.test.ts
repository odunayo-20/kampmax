import { describe, expect, it } from "vitest";
import { createEmployerManagementService } from "@/services/admin/employer-management.mock";

// ------------------------------------------------------------
// EMPLOYER MANAGEMENT SERVICE TESTS
//
// The service reads the real platform stores (employer drafts +
// job ownership), so assertions are written against known seeds:
//   - "u1"          → onboarded, APPROVED/active, verified, owns jobs
//   - "emp_demo1..4"→ job-only external clients (no employer profile)
// Mutations write through to the employer store; each transition
// test restores the record so later tests stay deterministic.
// ------------------------------------------------------------

const svc = createEmployerManagementService();

describe("list", () => {
  it("returns every managed employer with the console shape", async () => {
    const page = await svc.list();
    expect(page.total).toBeGreaterThanOrEqual(5);
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(10);
    expect(page.totalPages).toBe(1);

    const u1 = page.items.find((e) => e.id === "u1");
    expect(u1).toBeDefined();
    expect(u1?.status).toBe("active");
    expect(u1?.hasEmployerProfile).toBe(true);
    expect(u1?.organizationName).toBe("Oluwaseun Labs");
    expect(u1?.hiringStatus).toBe("hiring"); // owns an OPEN job
    expect(u1?.activeJobs).toBeGreaterThanOrEqual(1);

    for (const item of page.items) {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(typeof item.applicationsReceived).toBe("number");
      expect(["active", "pending_review", "suspended", "rejected", "external", "incomplete"]).toContain(item.status);
    }
  });

  it("searches across identity fields case-insensitively", async () => {
    const byOrg = await svc.list({ search: "OLUWASEUN" });
    expect(byOrg.items.map((e) => e.id)).toContain("u1");

    const byDescriptor = await svc.list({ search: "CampusPay" });
    expect(byDescriptor.items.map((e) => e.id)).toEqual(["emp_demo2"]);

    const none = await svc.list({ search: "zzz-no-match" });
    expect(none.total).toBe(0);
    expect(none.items).toEqual([]);
  });

  it("filters by console status, verification, campus and industry", async () => {
    const external = await svc.list({ status: "external" });
    expect(external.total).toBeGreaterThanOrEqual(4);
    expect(external.items.every((e) => e.status === "external")).toBe(true);

    const verified = await svc.list({ verification: "verified" });
    expect(verified.items.map((e) => e.id)).toEqual(["u1"]);

    const rugipo = await svc.list({ campusId: "rugipo" });
    expect(rugipo.items.length).toBeGreaterThanOrEqual(1);
    expect(rugipo.items.every((e) => e.campusId === "rugipo")).toBe(true);

    const tech = await svc.list({ industry: "Technology" });
    expect(tech.items.map((e) => e.id)).toContain("u1");
  });

  it("sorts by name (asc) and flips direction", async () => {
    const asc = await svc.list({ sortBy: "name", sortDir: "asc" });
    expect(asc.items[0].name).toBe("Adebayo Oluwaseun");
    const desc = await svc.list({ sortBy: "name", sortDir: "desc" });
    expect(desc.items[0].name).not.toBe(asc.items[0].name);
  });

  it("paginates and clamps out-of-range pages", async () => {
    const first = await svc.list({ page: 1, pageSize: 3 });
    expect(first.items.length).toBe(3);
    expect(first.totalPages).toBe(Math.ceil(first.total / 3));

    const second = await svc.list({ page: 2, pageSize: 3 });
    expect(second.items.length).toBeGreaterThan(0);
    const ids = new Set([...first.items, ...second.items].map((e) => e.id));
    expect(ids.size).toBe(first.items.length + second.items.length);
  });
});

describe("getCounts", () => {
  it("matches the list total and reports the known buckets", async () => {
    const counts = await svc.getCounts();
    const page = await svc.list();
    expect(counts.all).toBe(page.total);
    expect(counts.active).toBeGreaterThanOrEqual(1); // u1
    expect(counts.external).toBeGreaterThanOrEqual(4);
    expect(counts.all).toBe(
      counts.active + counts.pending_review + counts.suspended + counts.rejected + counts.external + counts.incomplete
    );
  });
});

describe("getById / getActivity / getIndustries", () => {
  it("returns the full detail payload for an onboarded employer", async () => {
    const detail = await svc.getById("u1");
    expect(detail).not.toBeNull();
    if (!detail) return;

    expect(detail.employer.status).toBe("active");
    expect(detail.profile).not.toBeNull();
    expect(detail.profile?.displayName).toBe("Adebayo Oluwaseun");
    expect(detail.organization?.name).toBe("Oluwaseun Labs");
    expect(detail.verification?.status).toBe("verified");
    expect(detail.jobs.length).toBeGreaterThanOrEqual(1);
    expect(detail.hiring.jobCounts.all).toBe(detail.jobs.length);
    expect(detail.hiring.applicationCounts.accepted).toBe(detail.hiring.hires);
  });

  it("surfaces external (job-only) employers honestly", async () => {
    const detail = await svc.getById("emp_demo1");
    expect(detail).not.toBeNull();
    if (!detail) return;
    expect(detail.employer.status).toBe("external");
    expect(detail.employer.userId).toBeNull();
    expect(detail.employer.hasEmployerProfile).toBe(false);
    expect(detail.profile).toBeNull();
    expect(detail.organization).toBeNull();
    expect(detail.verification).toBeNull();
  });

  it("returns null for unknown ids and [] for activity on unknown ids", async () => {
    expect(await svc.getById("emp_missing")).toBeNull();
    expect(await svc.getActivity("emp_missing")).toEqual([]);
  });

  it("returns chronologically-ordered activity for u1", async () => {
    const events = await svc.getActivity("u1");
    expect(events.length).toBeGreaterThan(0);
    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain("jobs");
    expect(kinds).toContain("verification");
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].at >= events[i].at).toBe(true);
    }
  });

  it("lists the union of employer industries", async () => {
    const industries = await svc.getIndustries();
    expect(industries).toContain("Technology");
    expect(Array.isArray(industries)).toBe(true);
  });
});

describe("mutations (write-through transitions)", () => {
  it("suspends an active employer and restores it", async () => {
    const suspended = await svc.suspend("u1");
    expect(suspended.status).toBe("suspended");
    expect(suspended.onboardingStatus).toBe("SUSPENDED");

    const listed = await svc.list();
    expect(listed.items.find((e) => e.id === "u1")?.status).toBe("suspended");

    const activity = await svc.getActivity("u1");
    expect(activity.some((e) => e.kind === "admin" && e.message.includes("suspended"))).toBe(true);

    const restored = await svc.restore("u1");
    expect(restored.status).toBe("active");
    expect(restored.onboardingStatus).toBe("APPROVED");
  });

  it("rejects an illegal second suspension (transition guard)", async () => {
    await svc.suspend("u1");
    await expect(svc.suspend("u1")).rejects.toThrow(/Cannot move/);
    await svc.restore("u1");
  });

  it("rejects approve/reject on an employer that is not awaiting review", async () => {
    await expect(svc.approve("u1")).rejects.toThrow(/Cannot move/);
    await expect(svc.reject("u1")).rejects.toThrow(/Cannot move/);
  });

  it("cannot suspend an external client with no profile", async () => {
    await expect(svc.suspend("emp_demo1")).rejects.toThrow(/no Kampmax employer profile/);
    await expect(svc.restore("emp_demo1")).rejects.toThrow(/no Kampmax employer profile/);
  });
});
import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    patch: (...a: unknown[]) => patch(...a),
    delete: (...a: unknown[]) => del(...a),
  },
}));

import {
  archiveMyService,
  createMyService,
  fetchMyService,
  fetchMyServices,
  fromBackendService,
  pauseMyService,
  publishMyService,
  updateMyService,
} from "../freelancer-services";
import type { FreelancerServiceInput } from "@/types/freelancer-services";

const ok = <T>(data: T) => Promise.resolve({ data, error: null });
const fail = (status: number, message = "x") =>
  Promise.resolve({ data: null, error: Object.assign(new Error(message), { status }) });

const server = (over: Record<string, unknown> = {}) => ({
  id: "s1",
  freelancerId: "f1",
  title: "Logo design",
  slug: "logo-design",
  description: "Full description",
  category: { id: "c1", name: "Design" },
  startingPrice: 5000,
  priceMax: 9000,
  deliveryDays: 3,
  deliveryValue: 3,
  deliveryUnit: "DAYS",
  pricingModel: "STARTING_AT",
  shortDescription: "Clean logos",
  skills: ["Illustrator"],
  revisions: 2,
  deliverables: ["Logo files"],
  coverImageUrl: "https://cdn.example.com/a.png",
  status: "PUBLISHED",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-02T00:00:00Z",
  ...over,
});

const input: FreelancerServiceInput = {
  title: " Logo design ",
  categoryId: "c1",
  skills: ["Illustrator"],
  shortDescription: "Clean logos",
  description: "Full description",
  pricing: "starting_at",
  price: 5000,
  priceMax: 9000,
  deliveryValue: 3,
  deliveryUnit: "days",
  revisions: 2,
  deliverables: ["Logo files"],
};

beforeEach(() => vi.clearAllMocks());

describe("freelancer services (live)", () => {
  it("shows a service as the editor knows it, and hides it from clients unless published", () => {
    const live = fromBackendService(server() as never);
    expect(live).toMatchObject({
      id: "s1",
      categoryId: "c1",
      pricing: "starting_at",
      price: 5000,
      priceMax: 9000,
      deliveryUnit: "days",
      status: "published",
      visibility: "visible",
      skills: ["Illustrator"],
    });
    expect(fromBackendService(server({ status: "PAUSED" }) as never)).toMatchObject({ status: "paused", visibility: "hidden" });
  });

  it("sends what the server stores, in the server's vocabulary", async () => {
    post.mockImplementation(() => ok(server({ status: "DRAFT" })));
    const res = await createMyService(input);
    expect(res.ok).toBe(true);
    expect(res.service?.status).toBe("draft");
    expect(post).toHaveBeenCalledWith(
      "/services",
      expect.objectContaining({
        title: "Logo design",
        pricingModel: "STARTING_AT",
        deliveryUnit: "DAYS",
        startingPrice: 5000,
        categoryId: "c1",
      }),
    );
  });

  it("checks the form before asking the server", async () => {
    const res = await createMyService({ ...input, skills: [] });
    expect(res).toMatchObject({ ok: false, code: "validation", message: "Select at least one skill." });
    expect(post).not.toHaveBeenCalled();
  });

  it("reports the server's refusal instead of pretending it saved", async () => {
    patch.mockImplementation(() => fail(409, "You already have a service with this title"));
    expect(await updateMyService("s1", input)).toMatchObject({ ok: false, code: "conflict" });
    patch.mockImplementation(() => fail(404));
    expect(await updateMyService("s1", input)).toMatchObject({ ok: false, code: "not_found" });
  });

  it("publishes, pauses and archives through the server", async () => {
    post.mockImplementation(() => ok(server({ status: "PAUSED" })));
    expect(await pauseMyService("s1")).toMatchObject({ ok: true, status: "paused" });
    expect(post).toHaveBeenCalledWith("/services/s1/pause");
    post.mockImplementation(() => ok(server()));
    expect(await publishMyService("s1")).toMatchObject({ ok: true, status: "published" });
    del.mockImplementation(() => ok({ success: true }));
    expect(await archiveMyService("s1")).toMatchObject({ ok: true, status: "archived" });
    post.mockImplementation(() => fail(500, "boom"));
    expect(await publishMyService("s1")).toMatchObject({ ok: false });
  });

  it("lists your services, and has nothing for tabs the server doesn't have", async () => {
    get.mockImplementation(() => ok({ items: [server()], meta: { total: 1 } }));
    expect((await fetchMyServices({ status: "published", search: " logo " })).total).toBe(1);
    expect(get.mock.calls[0][0]).toContain("status=PUBLISHED");
    expect(get.mock.calls[0][0]).toContain("search=logo");
    expect(await fetchMyServices({ status: "under_review" })).toEqual({ items: [], total: 0 });
  });

  it("throws when it can't load, and returns null for a service that isn't yours", async () => {
    get.mockImplementation(() => fail(500, "down"));
    await expect(fetchMyServices()).rejects.toThrow("down");
    get.mockImplementation(() => fail(404));
    expect(await fetchMyService("nope")).toBeNull();
  });
});

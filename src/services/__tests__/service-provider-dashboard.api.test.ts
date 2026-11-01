import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
const patchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: getMock,
    post: postMock,
    patch: patchMock,
  },
}));

import {
  fetchSpDashboardLive,
  fetchSpProfileRecordLive,
  updateSpProfileLive,
  fetchSpServicesLive,
  addSpDashboardServiceLive,
  updateSpDashboardServiceLive,
  setSpDashboardServiceStatusLive,
  fetchSpAvailabilityLive,
  updateSpAvailabilityLive,
  fetchSpReviewsSummaryLive,
  computeProfileCompletionFromLive,
  mapBackendService,
  mapBackendAvailability,
  type BackendSpProfile,
  type BackendSpService,
  type BackendSpAvailabilitySlot,
} from "../service-provider-dashboard.api";

describe("service-provider-dashboard.api (live API implementation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProfile: BackendSpProfile = {
    id: "sp-101",
    userId: "u-101",
    displayName: "FixIt Electricals",
    slug: "fixit-electricals",
    bio: "Licensed electrician on campus for 5 years.",
    verificationStatus: "VERIFIED",
    providerType: "individual",
    yearsOfExperience: 5,
    locationCity: "UNILAG",
    locationState: "Lagos",
    locationCountry: "Nigeria",
    serviceRadius: "15",
    isActive: true,
    createdAt: "2026-01-15T10:00:00Z",
  };

  const mockServices: BackendSpService[] = [
    {
      id: "srv-1",
      providerId: "sp-101",
      title: "Socket Replacement",
      slug: "socket-replacement",
      description: "Quick repair or installation of wall sockets",
      categoryId: "cat-elec",
      pricingModel: "FIXED",
      basePrice: 5000,
      durationMinutes: 45,
      serviceLocationType: "OFF_CAMPUS",
      status: "ACTIVE",
      createdAt: "2026-01-20T10:00:00Z",
    },
  ];

  const mockSlots: BackendSpAvailabilitySlot[] = [
    {
      id: "slot-1",
      providerId: "sp-101",
      dayOfWeek: 1, // Monday
      startTime: "08:00",
      endTime: "18:00",
      isActive: true,
      createdAt: "2026-01-20T10:00:00Z",
    },
  ];

  describe("fetchSpDashboardLive", () => {
    it("fetches profile, services, availability, analytics, and bookings to build dashboard", async () => {
      getMock.mockImplementation((url: string) => {
        if (url.includes("/service-provider/profile/me")) {
          return Promise.resolve({ data: mockProfile, error: null });
        }
        if (url.includes("/service-provider/services/me")) {
          return Promise.resolve({ data: mockServices, error: null });
        }
        if (url.includes("/service-provider/availability/me")) {
          return Promise.resolve({ data: mockSlots, error: null });
        }
        if (url.includes("/analytics/service-provider/bookings/status")) {
          return Promise.resolve({
            data: { pending: 2, accepted: 5, in_progress: 1, completed: 18, cancelled: 1 },
            error: null,
          });
        }
        if (url.includes("/analytics/service-provider")) {
          return Promise.resolve({
            data: { totalBookings: 27, averageRating: 4.8, ratingCount: 15, profileViews: 140 },
            error: null,
          });
        }
        if (url.includes("/service-provider/bookings/me")) {
          return Promise.resolve({
            data: [
              {
                id: "b-1",
                serviceId: "srv-1",
                customerId: "c-1",
                status: "pending",
                scheduledDate: "2026-10-02",
                scheduledTime: "14:00",
                createdAt: "2026-09-29T10:00:00Z",
                service: { id: "srv-1", title: "Socket Replacement" },
              },
            ],
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const result = await fetchSpDashboardLive();

      expect(result.record.providerId).toBe("sp-101");
      expect(result.record.slug).toBe("fixit-electricals");
      expect(result.record.profile.displayName).toBe("FixIt Electricals");
      expect(result.record.services).toHaveLength(1);
      expect(result.record.services[0].name).toBe("Socket Replacement");

      // Verify metrics
      const activeSvcMetric = result.metrics.find((m) => m.key === "active_services");
      expect(activeSvcMetric?.valueLabel).toBe("1");

      const totalBookingsMetric = result.metrics.find((m) => m.key === "total_bookings");
      expect(totalBookingsMetric?.valueLabel).toBe("27");

      const upcomingMetric = result.metrics.find((m) => m.key === "upcoming_bookings");
      expect(upcomingMetric?.valueLabel).toBe("5");

      const ratingMetric = result.metrics.find((m) => m.key === "average_rating");
      expect(ratingMetric?.valueLabel).toBe("4.8");

      // Verify activity events
      expect(result.activity).toHaveLength(1);
      expect(result.activity[0].kind).toBe("booking_request");
    });
  });

  describe("fetchSpProfileRecordLive & updateSpProfileLive", () => {
    it("fetches profile record and maps fields", async () => {
      getMock.mockImplementation((url: string) => {
        if (url.includes("/service-provider/profile/me")) {
          return Promise.resolve({ data: mockProfile, error: null });
        }
        if (url.includes("/service-provider/services/me")) {
          return Promise.resolve({ data: mockServices, error: null });
        }
        if (url.includes("/service-provider/availability/me")) {
          return Promise.resolve({ data: mockSlots, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const record = await fetchSpProfileRecordLive();
      expect(record.providerId).toBe("sp-101");
      expect(record.profile.displayName).toBe("FixIt Electricals");
      expect(record.profile.yearsExperience).toBe(5);
    });

    it("updates profile via PATCH /service-provider/profile/me", async () => {
      patchMock.mockResolvedValue({
        data: { ...mockProfile, displayName: "FixIt Electricals Pro" },
        error: null,
      });
      getMock.mockImplementation((url: string) => {
        if (url.includes("/service-provider/profile/me")) {
          return Promise.resolve({
            data: { ...mockProfile, displayName: "FixIt Electricals Pro" },
            error: null,
          });
        }
        return Promise.resolve({ data: [], error: null });
      });

      const res = await updateSpProfileLive({ displayName: "FixIt Electricals Pro" });
      expect(patchMock).toHaveBeenCalledWith("/service-provider/profile/me", {
        displayName: "FixIt Electricals Pro",
      });
      expect(res.ok).toBe(true);
      expect(res.record?.profile.displayName).toBe("FixIt Electricals Pro");
    });
  });

  describe("services CRUD", () => {
    it("fetches provider services", async () => {
      getMock.mockResolvedValue({ data: mockServices, error: null });
      const services = await fetchSpServicesLive();
      expect(services).toHaveLength(1);
      expect(services[0].id).toBe("srv-1");
      expect(services[0].price).toBe(5000);
      expect(services[0].locationType).toBe("customer_location");
    });

    it("creates a new service via POST /service-provider/services", async () => {
      postMock.mockResolvedValue({
        data: {
          id: "srv-2",
          providerId: "sp-101",
          title: "Ceiling Fan Repair",
          slug: "ceiling-fan-repair-123",
          description: "Complete repair of ceiling fans",
          categoryId: "cat-elec",
          pricingModel: "FIXED",
          basePrice: 7500,
          durationMinutes: 60,
          serviceLocationType: "ON_CAMPUS",
          status: "DRAFT",
          createdAt: "2026-09-29T10:00:00Z",
        },
        error: null,
      });

      const res = await addSpDashboardServiceLive({
        name: "Ceiling Fan Repair",
        description: "Complete repair of ceiling fans",
        categoryId: "cat-elec",
        pricingModel: "fixed",
        price: 7500,
        durationMinutes: 60,
        locationType: "provider_location",
      });

      expect(postMock).toHaveBeenCalledWith(
        "/service-provider/services",
        expect.objectContaining({
          title: "Ceiling Fan Repair",
          basePrice: 7500,
          durationMinutes: 60,
        })
      );
      expect(res.ok).toBe(true);
      expect(res.service?.name).toBe("Ceiling Fan Repair");
    });

    describe("service picture", () => {
      const base = {
        name: "Photo",
        description: "Shoots",
        categoryId: "cat-1",
        pricingModel: "fixed" as const,
        price: 5000,
        durationMinutes: 60,
        locationType: "provider_location" as const,
      };
      const created = { ...mockServices[0], id: "srv-3", title: "Photo", status: "DRAFT" };

      it("sends the uploaded picture's id when creating, and leaves it out when there is none", async () => {
        postMock.mockResolvedValue({ data: created, error: null });

        await addSpDashboardServiceLive({ ...base, coverMediaId: "media-1" });
        expect(postMock.mock.calls[0][1]).toMatchObject({ coverMediaId: "media-1" });

        await addSpDashboardServiceLive(base);
        expect(postMock.mock.calls[1][1]).not.toHaveProperty("coverMediaId");
      });

      it("changes or removes the picture on update, and keeps it when not mentioned", async () => {
        patchMock.mockResolvedValue({ data: created, error: null });

        await updateSpDashboardServiceLive("srv-3", { coverMediaId: "media-2" });
        expect(patchMock.mock.calls[0][1]).toEqual({ coverMediaId: "media-2" });

        await updateSpDashboardServiceLive("srv-3", { coverMediaId: null });
        expect(patchMock.mock.calls[1][1]).toEqual({ coverMediaId: null });

        await updateSpDashboardServiceLive("srv-3", { price: 6000 });
        expect(patchMock.mock.calls[2][1]).not.toHaveProperty("coverMediaId");
      });

      it("sends the chosen status when creating, so a new service doesn't silently become a draft", async () => {
        postMock.mockResolvedValue({ data: created, error: null });

        await addSpDashboardServiceLive({ ...base, status: "active" });
        await addSpDashboardServiceLive({ ...base, status: "inactive" });
        await addSpDashboardServiceLive({ ...base, status: "draft" });
        await addSpDashboardServiceLive(base);

        const statuses = postMock.mock.calls.slice(-4).map(([, body]) => (body as { status?: string }).status);
        expect(statuses).toEqual(["ACTIVE", "INACTIVE", "DRAFT", undefined]);
      });

      it("sends the extra pictures as an ordered list of upload ids", async () => {
        postMock.mockResolvedValue({ data: created, error: null });
        patchMock.mockResolvedValue({ data: created, error: null });

        await addSpDashboardServiceLive({ ...base, galleryMediaIds: ["a", "b"] });
        expect(postMock.mock.calls.at(-1)?.[1]).toMatchObject({ galleryMediaIds: ["a", "b"] });

        await addSpDashboardServiceLive({ ...base, galleryMediaIds: [] });
        expect(postMock.mock.calls.at(-1)?.[1]).not.toHaveProperty("galleryMediaIds");

        await updateSpDashboardServiceLive("srv-3", { galleryMediaIds: [] });
        expect(patchMock.mock.calls.at(-1)?.[1]).toEqual({ galleryMediaIds: [] });

        await updateSpDashboardServiceLive("srv-3", { price: 1 });
        expect(patchMock.mock.calls.at(-1)?.[1]).not.toHaveProperty("galleryMediaIds");
      });

      it("reads the extra pictures back for editing", () => {
        const gallery = [{ mediaId: "a", url: "https://cdn.example.com/a.jpg" }];
        expect(mapBackendService({ ...mockServices[0], galleryImages: gallery }).gallery).toEqual(gallery);
        expect(mapBackendService({ ...mockServices[0], galleryImages: null }).gallery).toEqual([]);
      });

      it("shows the saved picture's address as the service image", () => {
        const withPicture = mapBackendService({ ...mockServices[0], coverImageUrl: "https://cdn.example.com/p.jpg" });
        expect(withPicture.images).toEqual(["https://cdn.example.com/p.jpg"]);
        expect(mapBackendService({ ...mockServices[0], coverImageUrl: null }).images).toEqual([]);
      });
    });

    it("updates service status via setSpDashboardServiceStatusLive", async () => {
      patchMock.mockResolvedValue({
        data: { ...mockServices[0], status: "INACTIVE" },
        error: null,
      });

      const res = await setSpDashboardServiceStatusLive("srv-1", "inactive");
      expect(patchMock).toHaveBeenCalledWith("/service-provider/services/srv-1", {
        status: "INACTIVE",
      });
      expect(res.ok).toBe(true);
    });
  });

  describe("availability schedule", () => {
    it("fetches availability and maps slots into 7-day schedule", async () => {
      getMock.mockImplementation((url: string) => {
        if (url.includes("/service-provider/profile/me")) {
          return Promise.resolve({ data: mockProfile, error: null });
        }
        if (url.includes("/service-provider/availability/me")) {
          return Promise.resolve({ data: mockSlots, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const schedule = await fetchSpAvailabilityLive();
      expect(schedule.availability.days).toHaveLength(7);
      const monday = schedule.availability.days.find((d) => d.dayIndex === 0);
      expect(monday?.isAvailable).toBe(true);
      expect(monday?.openTime).toBe("08:00");
    });

    it("updates availability slots via PATCH for existing and POST for new", async () => {
      getMock.mockResolvedValue({ data: mockSlots, error: null });
      patchMock.mockResolvedValue({ data: {}, error: null });
      postMock.mockResolvedValue({ data: {}, error: null });

      const res = await updateSpAvailabilityLive([
        {
          dayIndex: 0, // Monday -> dayOfWeek 1 (existing slot-1)
          label: "Monday",
          isAvailable: true,
          openTime: "09:00",
          closeTime: "17:00",
        },
        {
          dayIndex: 1, // Tuesday -> dayOfWeek 2 (new slot for Tuesday)
          label: "Tuesday",
          isAvailable: true,
          openTime: "09:00",
          closeTime: "17:00",
        },
      ]);

      expect(patchMock).toHaveBeenCalledWith("/service-provider/availability/slot-1", {
        startTime: "09:00",
        endTime: "17:00",
        isActive: true,
      });
      expect(postMock).toHaveBeenCalledWith("/service-provider/availability", {
        dayOfWeek: 2,
        startTime: "09:00",
        endTime: "17:00",
        isActive: true,
      });
      expect(res.ok).toBe(true);
    });
  });

  describe("profile completion: service photos", () => {
    const svc = (over: Record<string, unknown>) => ({ id: "s1", name: "Braiding", status: "active", images: [], ...over });
    const record = (services: unknown[]) =>
      ({
        profile: { displayName: "Chi", bio: "Braids" },
        services,
        availability: { days: [{ isAvailable: true }] },
        verification: { status: "approved" },
      }) as never;

    it("asks for a photo on a live service that has none, linking straight to it", () => {
      const done = computeProfileCompletionFromLive(record([svc({ images: ["https://x/1.jpg"] })]));
      const nudged = computeProfileCompletionFromLive(record([svc({})]));

      expect(done.missing.some((m) => m.key === "service_photos")).toBe(false);
      const item = nudged.missing.find((m) => m.key === "service_photos");
      expect(item?.href).toBe("/service-provider/services/s1/edit");
      expect(item?.description).toContain("Braiding");
      expect(nudged.percentage).toBe(done.percentage - 5);
    });

    it("points to the services list when several need a photo", () => {
      const result = computeProfileCompletionFromLive(record([svc({}), svc({ id: "s2", name: "Wigs" })]));

      const item = result.missing.find((m) => m.key === "service_photos");
      expect(item?.href).toBe("/service-provider/services");
      expect(item?.description).toContain("2 of your services");
    });

    it("ignores drafts and inactive services, which customers can't see anyway", () => {
      const result = computeProfileCompletionFromLive(
        record([svc({ images: ["https://x/1.jpg"] }), svc({ id: "s2", status: "draft" }), svc({ id: "s3", status: "inactive" })])
      );

      expect(result.missing.some((m) => m.key === "service_photos")).toBe(false);
    });

    it("never goes below zero", () => {
      const result = computeProfileCompletionFromLive({
        profile: {},
        services: [svc({})],
        availability: { days: [] },
        verification: { status: "pending" },
      } as never);

      expect(result.percentage).toBeGreaterThanOrEqual(0);
    });
  });

  describe("fetchSpReviewsSummaryLive", () => {
    it("shows what the backend reports for the provider's finished bookings", async () => {
      getMock.mockImplementation((url: string) => {
        if (url === "/bookings/provider/reviews") {
          return Promise.resolve({
            data: {
              averageRating: 4.5,
              totalCount: 2,
              distribution: [
                { stars: 5, count: 1 },
                { stars: 4, count: 1 },
                { stars: 3, count: 0 },
                { stars: 2, count: 0 },
                { stars: 1, count: 0 },
              ],
              recent: [
                { id: "rev-1", rating: 5, comment: "Great work!", authorName: "Emeka O.", serviceName: "Socket Replacement", createdAt: "2026-09-20T00:00:00Z" },
                { id: "rev-2", rating: 4, comment: "Good job", authorName: "Ada N.", serviceName: "Socket Replacement", createdAt: "2026-09-21T00:00:00Z" },
              ],
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const summary = await fetchSpReviewsSummaryLive();
      expect(summary.totalCount).toBe(2);
      expect(summary.averageRating).toBe(4.5);
      expect(summary.distribution.find((d) => d.stars === 5)?.count).toBe(1);
      expect(summary.recent).toHaveLength(2);
      expect(summary.recent[0]).toMatchObject({ authorName: "Emeka O.", visible: true });
    });

    it("has no rating, not a made-up five stars, before the first review", async () => {
      getMock.mockImplementation(() =>
        Promise.resolve({
          data: { averageRating: null, totalCount: 0, distribution: [], recent: [] },
          error: null,
        })
      );
      expect((await fetchSpReviewsSummaryLive()).averageRating).toBeNull();
    });

    it("throws instead of showing placeholder reviews when it cannot load", async () => {
      getMock.mockImplementation(() => Promise.resolve({ data: null, error: new Error("down") }));
      await expect(fetchSpReviewsSummaryLive()).rejects.toThrow("down");
    });
  });
});

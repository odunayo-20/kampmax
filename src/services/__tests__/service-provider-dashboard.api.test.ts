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

import type { ServiceProviderDashboardMetric } from "@/types/service-provider-dashboard";
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
  statusCountsOf,
  overviewOf,
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
        if (url.includes("/bookings/provider/reviews")) {
          return Promise.resolve({ data: { averageRating: 4.8, totalCount: 15 }, error: null });
        }
        if (url.includes("/analytics/service-provider/bookings/status")) {
          return Promise.resolve({
            data: { pending: 2, accepted: 5, in_progress: 1, completed: 18, cancelled: 1 },
            error: null,
          });
        }
        if (url.includes("/analytics/service-provider")) {
          return Promise.resolve({
            data: { totalBookings: 27, profileViews: 140 },
            error: null,
          });
        }
        if (url.includes("/bookings/provider?")) {
          return Promise.resolve({
            data: {
              items: [
                {
                  id: "b-1",
                  status: "pending",
                  serviceName: "Socket Replacement",
                  startAt: "2026-10-02T14:00:00Z",
                  createdAt: "2026-09-29T10:00:00Z",
                },
              ],
              meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
            },
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

  describe("a failed list request", () => {
    // The API client answers a failure with `data: {}` (truthy), not undefined.
    it("still loads the dashboard, with that list left empty", async () => {
      getMock.mockImplementation((url: string) => {
        const ok = (data: unknown) => Promise.resolve({ data, error: null });
        const failed = Promise.resolve({ data: {}, error: new Error("Not Found") });
        if (url.includes("/bookings/provider/reviews")) return ok({ averageRating: null, totalCount: 0 });
        if (url.includes("/bookings/provider?")) return failed;
        if (url.includes("/service-provider/services/me")) return failed;
        if (url.includes("/service-provider/profile/me")) return ok(mockProfile);
        if (url.includes("/service-provider/availability/me")) return ok(mockSlots);
        if (url.includes("/analytics/service-provider/bookings/status")) return ok([]);
        if (url.includes("/analytics/service-provider")) return ok({ overview: { totalBookings: 0 } });
        return ok(null);
      });

      const { record, activity } = await fetchSpDashboardLive();

      expect(record.services).toEqual([]);
      expect(activity).toHaveLength(1);
      expect(activity[0].kind).toBe("profile_approved");
    });
  });

  describe("profile views", () => {
    const withOverview = async (overview: unknown) => {
      getMock.mockImplementation((url: string) => {
        const ok = (data: unknown) => Promise.resolve({ data, error: null });
        if (url.includes("/bookings/provider/reviews")) return ok({ averageRating: null, totalCount: 0 });
        if (url.includes("/service-provider/profile/me")) return ok(mockProfile);
        if (url.includes("/service-provider/services/me")) return ok(mockServices);
        if (url.includes("/service-provider/availability/me")) return ok(mockSlots);
        if (url.includes("/analytics/service-provider/bookings/status")) return ok([]);
        if (url.includes("/analytics/service-provider")) return ok(overview);
        if (url.includes("/bookings/provider?")) return ok({ items: [] });
        return ok(null);
      });
      return fetchSpDashboardLive();
    };
    const card = (metrics: ServiceProviderDashboardMetric[]) => metrics.find((m) => m.key === "profile_views")!;

    it("shows no number, not a false 0, when the backend doesn't track views", async () => {
      // This is what the backend sends today: no profileViews at all.
      const { metrics, record } = await withOverview({ overview: { totalBookings: 4 } });

      expect(card(metrics)).toMatchObject({ valueLabel: "—", sublabel: "Not tracked yet" });
      expect(record.metrics.profileViews).toBeNull();
    });

    it("shows the number when the backend does send one, including a real 0", async () => {
      const some = await withOverview({ overview: { totalBookings: 4, profileViews: 140 } });
      expect(card(some.metrics)).toMatchObject({ valueLabel: "140", sublabel: "this month" });
      expect(some.record.metrics.profileViews).toBe(140);

      const none = await withOverview({ overview: { totalBookings: 0, profileViews: 0 } });
      expect(card(none.metrics)).toMatchObject({ valueLabel: "0", sublabel: "this month" });
    });
  });

  describe("average rating", () => {
    const dashboard = async (reviews: unknown) => {
      getMock.mockImplementation((url: string) => {
        const ok = (data: unknown) => Promise.resolve({ data, error: null });
        if (url.includes("/bookings/provider/reviews")) return reviews === "fail" ? Promise.resolve({ data: null, error: new Error("down") }) : ok(reviews);
        if (url.includes("/service-provider/profile/me")) return ok(mockProfile);
        if (url.includes("/service-provider/services/me")) return ok(mockServices);
        if (url.includes("/service-provider/availability/me")) return ok(mockSlots);
        if (url.includes("/analytics/service-provider/bookings/status")) return ok([]);
        if (url.includes("/analytics/service-provider")) return ok({ overview: { totalBookings: 0 } });
        if (url.includes("/bookings/provider?")) return ok({ items: [] });
        return ok(null);
      });
      return fetchSpDashboardLive();
    };
    const card = (metrics: ServiceProviderDashboardMetric[]) => metrics.find((m) => m.key === "average_rating")!;

    it("shows the real average and how many reviews it comes from", async () => {
      const { metrics, record } = await dashboard({ averageRating: 4.7, totalCount: 12 });

      expect(card(metrics)).toMatchObject({ valueLabel: "4.7", sublabel: "From 12 reviews", tone: "gold" });
      expect(record.metrics.averageRating).toBe(4.7);
    });

    it("says '1 review' for a single review", async () => {
      const { metrics } = await dashboard({ averageRating: 5, totalCount: 1 });

      expect(card(metrics).sublabel).toBe("From 1 review");
    });

    it("shows no rating, not a made-up 5.0, when there are no reviews yet", async () => {
      const { metrics, record } = await dashboard({ averageRating: null, totalCount: 0 });

      expect(card(metrics)).toMatchObject({ valueLabel: "—", sublabel: "No reviews yet", tone: "neutral" });
      expect(JSON.stringify(metrics)).not.toContain("5-star");
      expect(record.metrics.averageRating).toBeNull();
    });

    it("says so when the ratings can't be loaded, and still loads the rest of the dashboard", async () => {
      const { metrics } = await dashboard("fail");

      expect(card(metrics)).toMatchObject({ valueLabel: "—", sublabel: "Ratings unavailable" });
      expect(metrics.find((m) => m.key === "active_services")).toBeTruthy();
    });
  });

  describe("booking counts, as the backend really sends them", () => {
    it("reads the status list into the dashboard's counts, grouped as customers see them", () => {
      expect(
        statusCountsOf([
          { status: "PENDING", count: 2 },
          { status: "CONFIRMED", count: 3 },
          { status: "ACCEPTED", count: 1 },
          { status: "IN_PROGRESS", count: 1 },
          { status: "COMPLETED", count: 18 },
          { status: "DISPUTED", count: 1 },
          { status: "CANCELLED", count: 2 },
          { status: "EXPIRED", count: 1 },
          { status: "REJECTED", count: 4 },
        ])
      ).toEqual({ pending: 2, accepted: 4, in_progress: 1, completed: 19, cancelled: 3, rejected: 4 });
    });

    it("ignores rows it can't read, and accepts lower-case statuses", () => {
      expect(statusCountsOf([{ status: "completed", count: 5 }, { status: "MYSTERY", count: 9 }, { status: "PENDING", count: "x" }, null])).toEqual({
        completed: 5,
      });
    });

    it("passes an already-keyed object through, and treats anything else as no bookings", () => {
      expect(statusCountsOf({ pending: 2 })).toEqual({ pending: 2 });
      expect(statusCountsOf(null)).toEqual({});
      expect(statusCountsOf(undefined)).toEqual({});
      expect(statusCountsOf([])).toEqual({});
    });

    it("unwraps the overview the backend nests as { overview: {...} }, and leaves a flat one alone", () => {
      expect(overviewOf({ overview: { totalBookings: 27 } })?.totalBookings).toBe(27);
      expect(overviewOf({ totalBookings: 27 })?.totalBookings).toBe(27);
      expect(overviewOf(null)).toBeUndefined();
    });

    it("shows the real totals on the dashboard instead of zeros", async () => {
      getMock.mockImplementation((url: string) => {
        const ok = (data: unknown) => Promise.resolve({ data, error: null });
        if (url.includes("/service-provider/profile/me")) return ok(mockProfile);
        if (url.includes("/service-provider/services/me")) return ok(mockServices);
        if (url.includes("/service-provider/availability/me")) return ok(mockSlots);
        if (url.includes("/analytics/service-provider/bookings/status")) {
          return ok([
            { status: "PENDING", count: 2 },
            { status: "CONFIRMED", count: 5 },
            { status: "IN_PROGRESS", count: 1 },
            { status: "COMPLETED", count: 18 },
            { status: "CANCELLED", count: 1 },
          ]);
        }
        if (url.includes("/analytics/service-provider")) {
          return ok({ overview: { totalServices: 1, totalBookings: 27, completedBookings: 18, cancelledBookings: 1, rejectedBookings: 0, acceptanceRate: 96 } });
        }
        if (url.includes("/bookings/provider?")) return ok({ items: [] });
        return ok(null);
      });

      const { metrics } = await fetchSpDashboardLive();
      const label = (key: string) => metrics.find((m) => m.key === key)?.valueLabel;
      const sublabel = (key: string) => metrics.find((m) => m.key === key)?.sublabel;

      expect(label("total_bookings")).toBe("27");
      expect(label("upcoming_bookings")).toBe("5");
      expect(sublabel("upcoming_bookings")).toBe("2 awaiting confirmation");
      expect(label("in_progress_bookings")).toBe("1");
      expect(sublabel("in_progress_bookings")).toBe("18 completed · 1 cancelled");
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

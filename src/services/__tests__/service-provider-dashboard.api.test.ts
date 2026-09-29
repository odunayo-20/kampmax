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

  describe("fetchSpReviewsSummaryLive", () => {
    it("computes distribution and average rating from real reviews endpoint", async () => {
      getMock.mockImplementation((url: string) => {
        if (url.includes("/service-provider/profile/me")) {
          return Promise.resolve({ data: mockProfile, error: null });
        }
        if (url.includes("/reviews")) {
          return Promise.resolve({
            data: {
              items: [
                { id: "rev-1", rating: 5, comment: "Great work!", user: { firstName: "Emeka" }, createdAt: "2026-09-20Z" },
                { id: "rev-2", rating: 4, comment: "Good job", user: { firstName: "Ada" }, createdAt: "2026-09-21Z" },
              ],
              meta: { total: 2 },
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
      expect(summary.distribution.find((d) => d.stars === 4)?.count).toBe(1);
      expect(summary.recent).toHaveLength(2);
    });
  });
});

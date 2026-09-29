import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api-client";
import {
  acceptProviderBookingLive,
  fetchProviderBookingByIdLive,
  fetchProviderBookingsLive,
  fetchProviderBookingSummaryLive,
  mapBackendBookingStatus,
  mapBackendBookingToFrontend,
  rejectProviderBookingLive,
  type BackendBookingEntity,
} from "../service-provider-booking.api";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const getMock = vi.mocked(apiClient.get);
const postMock = vi.mocked(apiClient.post);

describe("ServiceProviderBookings API", () => {
  const sampleBooking: BackendBookingEntity = {
    id: "bkm-123456",
    customerId: "cust-1",
    providerId: "prov-1",
    serviceId: "srv-1",
    scheduledDate: "2026-04-10T00:00:00.000Z",
    scheduledTime: "14:30",
    durationMinutes: 90,
    agreedPrice: "7500.00",
    customerNotes: "Please come to room 402",
    providerNotes: "Accepted by provider",
    status: "PENDING",
    createdAt: "2026-04-01T12:00:00.000Z",
    customer: {
      id: "cust-1",
      firstName: "Chidi",
      lastName: "Okonkwo",
      email: "chidi@unilag.edu.ng",
      phone: "+234 812 345 6789",
    },
    provider: {
      id: "prov-1",
      displayName: "Kelechi Tech",
      slug: "kelechi-tech",
    },
    service: {
      id: "srv-1",
      title: "Laptop Screen Repair",
      basePrice: 7500,
      durationMinutes: 90,
      pricingModel: "FIXED",
      serviceLocationType: "ON_CAMPUS",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("status and entity mapping", () => {
    it("maps backend status strings to frontend domain statuses", () => {
      expect(mapBackendBookingStatus("PENDING")).toBe("pending");
      expect(mapBackendBookingStatus("ACCEPTED")).toBe("confirmed");
      expect(mapBackendBookingStatus("CONFIRMED")).toBe("confirmed");
      expect(mapBackendBookingStatus("IN_PROGRESS")).toBe("in_progress");
      expect(mapBackendBookingStatus("COMPLETED")).toBe("completed");
      expect(mapBackendBookingStatus("REJECTED")).toBe("declined");
      expect(mapBackendBookingStatus("CANCELLED")).toBe("cancelled");
    });

    it("maps backend entity to full frontend ServiceBooking shape", () => {
      const mapped = mapBackendBookingToFrontend(sampleBooking);
      expect(mapped.id).toBe("bkm-123456");
      expect(mapped.bookingReference).toBe("KM-BKM-12");
      expect(mapped.serviceName).toBe("Laptop Screen Repair");
      expect(mapped.customer.name).toBe("Chidi Okonkwo");
      expect(mapped.customer.phone).toBe("+234 812 345 6789");
      expect(mapped.price.amount).toBe(7500);
      expect(mapped.startAt).toContain("2026-04-10T14:30:00.000Z");
      expect(mapped.durationMinutes).toBe(90);
      expect(mapped.timeline.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("fetchProviderBookingsLive", () => {
    it("retrieves and filters bookings by status tab", async () => {
      const pendingItem = { ...sampleBooking, id: "bkm-1", status: "PENDING" as const };
      const acceptedItem = { ...sampleBooking, id: "bkm-2", status: "ACCEPTED" as const };
      const completedItem = { ...sampleBooking, id: "bkm-3", status: "COMPLETED" as const };

      getMock.mockResolvedValue({
        data: [pendingItem, acceptedItem, completedItem],
        error: null,
      });

      const pendingResult = await fetchProviderBookingsLive({ status: "pending" });
      expect(pendingResult.items).toHaveLength(1);
      expect(pendingResult.items[0].id).toBe("bkm-1");

      const upcomingResult = await fetchProviderBookingsLive({ status: "upcoming" });
      expect(upcomingResult.items).toHaveLength(1);
      expect(upcomingResult.items[0].id).toBe("bkm-2");

      const allResult = await fetchProviderBookingsLive({ status: "all" });
      expect(allResult.items).toHaveLength(3);
    });

    it("filters bookings by search query across customer and service name", async () => {
      const item1 = { ...sampleBooking, id: "bkm-1", customer: { id: "c1", firstName: "Emeka", lastName: "Eze" } };
      const item2 = { ...sampleBooking, id: "bkm-2", customer: { id: "c2", firstName: "Fatima", lastName: "Bello" } };

      getMock.mockResolvedValue({
        data: [item1, item2],
        error: null,
      });

      const result = await fetchProviderBookingsLive({ search: "fatima" });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].customer.name).toContain("Fatima");
    });
  });

  describe("fetchProviderBookingByIdLive", () => {
    it("finds a booking by id", async () => {
      getMock.mockResolvedValue({ data: [sampleBooking], error: null });

      const found = await fetchProviderBookingByIdLive("bkm-123456");
      expect(found).not.toBeNull();
      expect(found?.id).toBe("bkm-123456");
    });

    it("returns null if not found", async () => {
      getMock.mockResolvedValue({ data: [sampleBooking], error: null });

      const found = await fetchProviderBookingByIdLive("non-existent");
      expect(found).toBeNull();
    });
  });

  describe("acceptProviderBookingLive", () => {
    it("posts accept to backend endpoint and returns confirmed booking", async () => {
      postMock.mockResolvedValue({
        data: { ...sampleBooking, status: "ACCEPTED" },
        error: null,
      });

      const res = await acceptProviderBookingLive("bkm-123456");
      expect(postMock).toHaveBeenCalledWith("/service-provider/bookings/bkm-123456/accept");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.booking.status).toBe("confirmed");
      }
    });

    it("handles error response on accept", async () => {
      postMock.mockResolvedValue({
        data: null,
        error: { name: "ApiError", message: "Booking already handled", status: 400 },
      });

      const res = await acceptProviderBookingLive("bkm-123456");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.message).toBe("Booking already handled");
      }
    });
  });

  describe("rejectProviderBookingLive", () => {
    it("posts reject with reason to backend endpoint", async () => {
      postMock.mockResolvedValue({
        data: { ...sampleBooking, status: "REJECTED", cancellationReason: "Conflict" },
        error: null,
      });

      const res = await rejectProviderBookingLive("bkm-123456", "Conflict");
      expect(postMock).toHaveBeenCalledWith("/service-provider/bookings/bkm-123456/reject", {
        reason: "Conflict",
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.booking.status).toBe("declined");
      }
    });
  });

  describe("fetchProviderBookingSummaryLive", () => {
    it("aggregates counts from status analytics endpoint", async () => {
      getMock.mockImplementation((url: string) => {
        if (url.includes("/analytics/service-provider/bookings/status")) {
          return Promise.resolve({
            data: {
              pending: 4,
              accepted: 2,
              in_progress: 1,
              completed: 8,
              cancelled: 1,
              rejected: 1,
            },
            error: null,
          });
        }
        if (url.includes("/service-provider/bookings/me")) {
          return Promise.resolve({ data: [sampleBooking], error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const summary = await fetchProviderBookingSummaryLive();
      expect(summary.pending).toBe(4);
      expect(summary.upcoming).toBe(2);
      expect(summary.inProgress).toBe(1);
      expect(summary.completed).toBe(8);
      expect(summary.cancelled).toBe(2);
    });
  });
});

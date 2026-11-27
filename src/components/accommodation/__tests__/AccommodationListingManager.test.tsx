// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { AccommodationListing } from "@/types/accommodation";

// Every action is a mutation that does nothing here; what is tested is what the row says.
vi.mock("@/hooks/use-accommodation", () => {
  const mutation = () => ({ isPending: false, error: null, mutate: vi.fn(), mutateAsync: vi.fn() });
  return {
    useArchiveAccommodationListing: mutation,
    useCancelAccommodationRenewal: mutation,
    useConfirmAccommodationAvailability: mutation,
    useEnableAccommodationRenewal: mutation,
    useRenewAccommodationSubscription: mutation,
    useSubmitAccommodationListing: mutation,
    useSubscribeAccommodationListing: mutation,
    useUpdateAccommodationListing: mutation,
  };
});

import { AccommodationListingManager } from "../AccommodationListingManager";

afterEach(cleanup);

const listing = (over: Partial<AccommodationListing> = {}): AccommodationListing => ({
  id: "l1",
  propertyId: "p1",
  unitId: "u1",
  title: "Self-contain near gate",
  description: null,
  rentAmount: 450000,
  currency: "NGN",
  paymentFrequency: "ANNUALLY",
  cautionFee: 0,
  agencyFee: 0,
  agreementFee: 0,
  otherCharges: 0,
  totalUpfrontCost: 450000,
  moderationStatus: "APPROVED",
  publicationStatus: "ACTIVE",
  availabilityStatus: "AVAILABLE",
  rejectionReason: null,
  submittedAt: null,
  approvedAt: null,
  expiresAt: null,
  lastAvailabilityConfirmedAt: null,
  unit: { id: "u1", unitName: "Room 1", unitType: "ROOM" },
  property: { id: "p1", title: "Hill House", city: "Ibadan", state: "Oyo" },
  media: [],
  amenities: [],
  subscription: null,
  stats: { views: 40, saves: 6, enquiries: 3 },
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
  ...over,
});

const render_ = (l: AccommodationListing) =>
  render(<AccommodationListingManager listing={l} packages={[]} />);

describe("one listing", () => {
  it("shows views, saves and enquiries for a live listing, and what students pay", () => {
    render_(listing());

    expect(screen.getByText("Views").nextSibling?.textContent).toBe("40");
    expect(screen.getByText("Enquiries").nextSibling?.textContent).toBe("3");
    expect(screen.getByText("Students pay up front").nextSibling?.textContent).toBe("₦450,000");
  });

  it("shows no numbers for a draft nobody can see yet, and asks to finish it first", () => {
    render_(listing({ moderationStatus: "DRAFT", publicationStatus: "INACTIVE" as never, stats: { views: 0, saves: 0, enquiries: 0 } }));

    expect(screen.queryByText("Views")).toBeNull();
    expect(screen.getByRole("button", { name: "Finish your listing" })).toBeTruthy();
    expect(screen.getByText("Add a description and at least one photo.")).toBeTruthy();
  });

  it("offers Publish again, not resubmit, for a rejected listing with no paid period", () => {
    render_(listing({ moderationStatus: "REJECTED", rejectionReason: "Blurry photos" }));

    expect(screen.getByRole("button", { name: "Publish again" })).toBeTruthy();
    expect(screen.getByText("Kampmax asked for changes: Blurry photos")).toBeTruthy();
  });

  it("explains why a listing with a running package cannot be archived", () => {
    render_(listing({ subscription: { id: "s1", status: "ACTIVE", amount: 5000, autoRenew: true, endsAt: "2027-03-01T00:00:00Z" } }));

    expect(screen.queryByRole("button", { name: "Archive listing" })).toBeNull();
    expect(screen.getByText(/can be archived after its subscription ends/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Turn off automatic renewal" })).toBeTruthy();
  });
});

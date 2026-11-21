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
  render(<AccommodationListingManager listing={l} packages={[]} amenities={[]} />);

describe("a listing row", () => {
  it("shows views, saves and enquiries for a live listing", () => {
    render_(listing());

    expect(screen.getByText("40 views · 6 saves · 3 enquiries")).toBeTruthy();
    expect(screen.getByText(/₦450,000/)).toBeTruthy();
  });

  it("shows no numbers for a draft nobody can see yet", () => {
    render_(listing({ moderationStatus: "DRAFT", stats: { views: 0, saves: 0, enquiries: 0 } }));

    expect(screen.queryByText(/views/)).toBeNull();
  });
});

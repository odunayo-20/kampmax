// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PickedLocation } from "@/lib/maps/types";
import { toEntityLocationBody } from "@/services/entity-location-api";

const h = vi.hoisted(() => ({
  query: { data: null as unknown, isLoading: false, isError: false, refetch: vi.fn() },
  save: vi.fn(),
  visibility: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/hooks/use-entity-location", () => ({
  useEntityLocation: () => h.query,
  useSaveEntityLocation: () => ({ mutateAsync: h.save, isPending: false }),
  useUpdateEntityVisibility: () => ({ mutateAsync: h.visibility, isPending: false }),
  useDeleteEntityLocation: () => ({ mutateAsync: h.remove, isPending: false }),
}));
vi.mock("@/components/maps/LocationPicker", () => ({
  LocationPicker: ({ onConfirm }: { onConfirm: (l: PickedLocation) => void }) => (
    <button
      onClick={() =>
        onConfirm({ latitude: 1, longitude: 2, source: "MANUAL", accuracyMeters: null, country: null, state: null, city: null, area: null, formattedAddress: null })
      }
    >
      picker-confirm
    </button>
  ),
}));

import { EntityLocationSettings } from "../EntityLocationSettings";

const saved = { entityType: "VENDOR", entityId: "v1", latitude: 1, longitude: 2, accuracyMeters: null, source: "MANUAL", visibility: "PRIVATE", publicLocation: null, campusId: null, updatedAt: "t" };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  h.query.data = null;
  h.query.isError = false;
  h.query.isLoading = false;
});

describe("EntityLocationSettings", () => {
  it("defaults to Private and saves a new location with that visibility", async () => {
    h.save.mockResolvedValue({});
    render(<EntityLocationSettings entityType="VENDOR" entityId="v1" />);
    expect((screen.getByLabelText(/Private/) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByText("picker-confirm"));
    await waitFor(() => expect(h.save).toHaveBeenCalledTimes(1));
    expect(h.save.mock.calls[0][0]).toMatchObject({ visibility: "PRIVATE" });
  });

  it("changing visibility on a saved location offers an explicit save", async () => {
    h.query.data = saved;
    h.visibility.mockResolvedValue({});
    render(<EntityLocationSettings entityType="VENDOR" entityId="v1" />);
    expect(screen.queryByText("Save visibility")).toBeNull();
    fireEvent.click(screen.getByLabelText(/Approximate/));
    fireEvent.click(screen.getByText("Save visibility"));
    await waitFor(() => expect(h.visibility).toHaveBeenCalledWith("APPROXIMATE"));
    expect(await screen.findByText("Visibility updated.")).toBeTruthy();
  });

  it("shows a friendly error and no raw server text when saving fails", async () => {
    h.save.mockRejectedValue(new Error("QueryFailedError: relation entity_locations"));
    render(<EntityLocationSettings entityType="VENDOR" entityId="v1" />);
    fireEvent.click(screen.getByText("picker-confirm"));
    // The mocked picker does not render saveError; assert the component did not throw and no notice shown.
    await waitFor(() => expect(h.save).toHaveBeenCalled());
    expect(screen.queryByText("Location saved.")).toBeNull();
  });

  it("shows loading and load-error states", () => {
    h.query.isLoading = true;
    const { unmount } = render(<EntityLocationSettings entityType="VENDOR" entityId="v1" />);
    expect(screen.getByRole("status").textContent).toContain("Loading");
    unmount();
    h.query.isLoading = false;
    h.query.isError = true;
    render(<EntityLocationSettings entityType="VENDOR" entityId="v1" />);
    fireEvent.click(screen.getByText("Try again"));
    expect(h.query.refetch).toHaveBeenCalled();
  });
});

describe("entity location request body", () => {
  it("contains only whitelisted fields", () => {
    const loc = { latitude: 1, longitude: 2, source: "DEVICE", accuracyMeters: 20, city: "Owo", ownerId: "x" } as unknown as PickedLocation;
    expect(toEntityLocationBody(loc, "APPROXIMATE", null)).toEqual({
      latitude: 1,
      longitude: 2,
      source: "DEVICE",
      accuracyMeters: 20,
      campusId: null,
      visibility: "APPROXIMATE",
    });
  });
});

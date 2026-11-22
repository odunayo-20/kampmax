// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PickedLocation } from "@/lib/maps/types";

// The real picker draws a map; here it just offers one spot to confirm.
const spot: PickedLocation = {
  latitude: 6.5158,
  longitude: 3.3896,
  source: "MANUAL",
  accuracyMeters: null,
  country: null,
  state: null,
  city: null,
  area: null,
  formattedAddress: null,
};
vi.mock("@/components/maps/LocationPicker", () => ({
  LocationPicker: ({
    onConfirm,
    saveError,
    confirmLabel,
  }: {
    onConfirm: (l: PickedLocation) => void;
    saveError?: string | null;
    confirmLabel?: string;
  }) => (
    <div>
      <button type="button" onClick={() => onConfirm(spot)}>
        {confirmLabel}
      </button>
      {saveError && <p role="alert">{saveError}</p>}
    </div>
  ),
}));

import { PropertyPin } from "../PropertyPin";

afterEach(cleanup);

describe("PropertyPin", () => {
  it("says when a property has no pin and offers to add one", () => {
    render(<PropertyPin value={null} onChange={vi.fn()} />);
    expect(screen.getByText("Not pinned yet")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pin on map" })).toBeTruthy();
  });

  it("says when a property is pinned and offers to change it", () => {
    render(<PropertyPin value={{ latitude: 6.5, longitude: 3.3 }} onChange={vi.fn()} />);
    expect(screen.getByText("Pinned")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Change pin" })).toBeTruthy();
  });

  it("reports only the coordinates and closes the map once saved", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(<PropertyPin value={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Pin on map" }));
    fireEvent.click(screen.getByRole("button", { name: "Use this spot" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Use this spot" })).toBeNull());
    expect(onChange).toHaveBeenCalledWith({ latitude: 6.5158, longitude: 3.3896 });
  });

  it("keeps the map open and shows the problem when saving fails", async () => {
    const onChange = vi.fn().mockRejectedValue(new Error("Latitude must be between -90 and 90"));
    render(<PropertyPin value={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Pin on map" }));
    fireEvent.click(screen.getByRole("button", { name: "Use this spot" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Use this spot" })).toBeTruthy();
  });
});

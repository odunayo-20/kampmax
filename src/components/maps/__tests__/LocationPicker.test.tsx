// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { LatLng } from "@/lib/maps/types";
import { DeviceLocationError, GeocodingError } from "@/lib/maps/types";

const mocks = vi.hoisted(() => ({
  getDevicePosition: vi.fn(),
  searchPlaces: vi.fn(),
  reverseGeocode: vi.fn(),
}));

vi.mock("@/lib/maps/geolocation", () => ({ getDevicePosition: mocks.getDevicePosition }));
vi.mock("@/lib/maps/maptiler/geocoding", () => ({
  searchPlaces: mocks.searchPlaces,
  reverseGeocode: mocks.reverseGeocode,
}));
vi.mock("@/components/maps/MapView", () => ({
  MapView: ({ marker, onSelect }: { marker?: LatLng | null; onSelect?: (p: LatLng) => void }) => (
    <div data-testid="map" data-marker={marker ? `${marker.latitude},${marker.longitude}` : ""}>
      <button onClick={() => onSelect?.({ latitude: 6.5, longitude: 3.4 })}>map-click</button>
    </div>
  ),
}));

import { LocationPicker } from "../LocationPicker";

const owo = {
  id: "1",
  label: "Owo, Ondo, Nigeria",
  latitude: 7.19,
  longitude: 5.58,
  country: "Nigeria",
  state: "Ondo",
  city: "Owo",
  area: null,
};

beforeEach(() => {
  mocks.reverseGeocode.mockResolvedValue({
    ...owo,
    label: "Lagos, Nigeria",
    city: "Lagos",
    state: "Lagos",
    latitude: 6.5,
    longitude: 3.4,
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LocationPicker", () => {
  it("disables confirm until a location is selected", () => {
    render(<LocationPicker onConfirm={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Confirm location" })).toHaveProperty("disabled", true);
    expect(screen.getByText("No location selected yet.")).toBeTruthy();
  });

  it("uses device location, reverse geocodes, and confirms with DEVICE source + accuracy", async () => {
    mocks.getDevicePosition.mockResolvedValue({ latitude: 7.19, longitude: 5.58, accuracyMeters: 30 });
    mocks.reverseGeocode.mockResolvedValue(owo);
    const onConfirm = vi.fn();
    render(<LocationPicker onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: /use my current location/i }));
    await screen.findByText("Owo, Ondo, Nigeria");
    expect(screen.getByTestId("map").dataset.marker).toBe("7.19,5.58");
    fireEvent.click(screen.getByRole("button", { name: "Confirm location" }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ source: "DEVICE", accuracyMeters: 30, city: "Owo", latitude: 7.19 }),
    );
  });

  it("shows a message when permission is denied", async () => {
    mocks.getDevicePosition.mockRejectedValue(new DeviceLocationError("denied", "Location permission was denied."));
    render(<LocationPicker onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /use my current location/i }));
    expect((await screen.findByRole("alert")).textContent).toContain("permission was denied");
    expect(screen.getByRole("button", { name: "Confirm location" })).toHaveProperty("disabled", true);
  });

  it("searches, lists results, and selects one", async () => {
    mocks.searchPlaces.mockResolvedValue([owo]);
    render(<LocationPicker onConfirm={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Search for a location"), { target: { value: "Owo" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.click(await screen.findByRole("button", { name: "Owo, Ondo, Nigeria" }));
    expect(screen.getByTestId("map").dataset.marker).toBe("7.19,5.58");
    expect(screen.getByText("Owo, Ondo, Nigeria")).toBeTruthy();
  });

  it("debounces typing into a single search request", async () => {
    mocks.searchPlaces.mockResolvedValue([]);
    render(<LocationPicker onConfirm={vi.fn()} />);
    const input = screen.getByLabelText("Search for a location");
    fireEvent.change(input, { target: { value: "Ow" } });
    fireEvent.change(input, { target: { value: "Owo" } });
    fireEvent.change(input, { target: { value: "Owo, Ondo" } });
    await screen.findByText(/no places found/i);
    expect(mocks.searchPlaces).toHaveBeenCalledTimes(1);
    expect(mocks.searchPlaces.mock.calls[0][0]).toBe("Owo, Ondo");
  });

  it("shows an error when search fails", async () => {
    mocks.searchPlaces.mockRejectedValue(new GeocodingError("network", "Could not reach the map service."));
    render(<LocationPicker onConfirm={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Search for a location"), { target: { value: "Owo" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Could not reach the map service.");
  });

  it("rejects an empty search without a request", () => {
    render(<LocationPicker onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByRole("alert").textContent).toContain("at least 2 characters");
    expect(mocks.searchPlaces).not.toHaveBeenCalled();
  });

  it("map click reverse geocodes once and confirms as MANUAL with null accuracy", async () => {
    const onConfirm = vi.fn();
    render(<LocationPicker onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("map-click"));
    await screen.findByText("Lagos, Nigeria");
    expect(mocks.reverseGeocode).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Confirm location" }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ source: "MANUAL", accuracyMeters: null, latitude: 6.5 }),
    );
  });

  it("keeps coordinates and warns when reverse geocoding fails", async () => {
    mocks.reverseGeocode.mockRejectedValue(new GeocodingError("http", "The map service could not complete that request."));
    render(<LocationPicker onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByText("map-click"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("coordinates were still captured"));
    expect(screen.getByRole("button", { name: "Confirm location" })).toHaveProperty("disabled", false);
  });

  it("shows saving state and save error", () => {
    render(
      <LocationPicker
        initial={{ ...owo, source: "MANUAL", accuracyMeters: null, formattedAddress: owo.label }}
        onConfirm={vi.fn()}
        saving
        saveError="Save failed."
      />,
    );
    expect(screen.getByRole("button", { name: "Saving…" })).toHaveProperty("disabled", true);
    expect(screen.getByText("Save failed.")).toBeTruthy();
  });
});

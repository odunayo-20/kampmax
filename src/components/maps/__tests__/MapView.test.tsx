// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => {
  const remove = vi.fn();
  const handlers: Record<string, () => void> = {};
  const source = { setData: vi.fn() };
  const state = { hasSource: false };
  const api = {
    addSource: vi.fn((_id?: unknown, _source?: unknown) => { state.hasSource = true; }),
    addLayer: vi.fn(),
    getSource: vi.fn(() => (state.hasSource ? source : undefined)),
    getLayer: vi.fn(() => ({})),
    setFilter: vi.fn(),
    getBounds: () => ({ contains: () => true }),
    getCanvas: () => ({ style: {} }),
    fitBounds: vi.fn(),
  };
  const Map = vi.fn(function (_options?: unknown) {
    return {
      on: (ev: string, fn: () => void) => {
        handlers[ev] = fn;
      },
      addControl: vi.fn(),
      remove,
      resize: vi.fn(),
      loaded: () => false,
      getCenter: () => ({ lat: 0, lng: 0 }),
      getZoom: () => 5,
      easeTo: vi.fn(),
      ...api,
    };
  });
  const Marker = vi.fn(function () {
    const m = { setLngLat: () => m, addTo: () => m, on: vi.fn(), setDraggable: vi.fn(), remove: vi.fn() };
    return m;
  });
  return { remove, handlers, Map, Marker, api, source, state, configured: { value: true } };
});

vi.mock("maplibre-gl", () => ({
  Map: h.Map,
  Marker: h.Marker,
  NavigationControl: vi.fn(),
  LngLatBounds: vi.fn(function () {
    return { extend: vi.fn(), getCenter: () => ({ lng: 0, lat: 0 }) };
  }),
}));
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));
vi.mock("@/lib/maps/config", async (orig) => ({
  ...(await orig<typeof import("@/lib/maps/config")>()),
  isMapConfigured: () => h.configured.value,
  getMapStyleUrl: () => "https://api.maptiler.com/maps/streets-v2/style.json?key=test",
}));

import { MapView } from "../MapView";

class FakeResizeObserver {
  observe() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof FakeResizeObserver }).ResizeObserver = FakeResizeObserver;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  h.configured.value = true;
  h.state.hasSource = false;
});

describe("MapView", () => {
  it("shows a fallback (and never creates a map) without an API key", () => {
    h.configured.value = false;
    render(<MapView />);
    expect(screen.getByText("Map unavailable")).toBeTruthy();
    expect(h.Map).not.toHaveBeenCalled();
  });

  it("creates the MapTiler-styled map once and shows loading", async () => {
    const { rerender } = render(<MapView marker={null} />);
    await waitFor(() => expect(h.Map).toHaveBeenCalledTimes(1));
    expect(h.Map.mock.calls[0][0]).toMatchObject({ style: expect.stringContaining("api.maptiler.com") });
    expect(screen.getByText("Loading map…")).toBeTruthy();
    rerender(<MapView marker={{ latitude: 1, longitude: 2 }} draggable />);
    expect(h.Map).toHaveBeenCalledTimes(1);
  });

  it("shows an error if the style fails before load", async () => {
    render(<MapView />);
    await waitFor(() => expect(h.handlers.error).toBeDefined());
    h.handlers.error();
    expect((await screen.findByRole("alert")).textContent).toContain("couldn't load");
  });

  it("destroys the map on unmount", async () => {
    const { unmount } = render(<MapView />);
    await waitFor(() => expect(h.Map).toHaveBeenCalled());
    unmount();
    expect(h.remove).toHaveBeenCalledTimes(1);
  });

  it("draws clustered and unclustered points, updates data in place, and fits once per fitKey", async () => {
    const a = [{ id: "a", latitude: 1, longitude: 2 }];
    const b = [...a, { id: "b", latitude: 1.1, longitude: 2.1 }];
    const { rerender } = render(<MapView points={a} fitKey="k1" />);
    await waitFor(() => expect(h.handlers.load).toBeDefined());
    await act(async () => h.handlers.load());
    await waitFor(() => expect(h.api.addSource).toHaveBeenCalledTimes(1));
    // Clustered source configuration
    expect(h.api.addSource).toHaveBeenCalledWith(
      "kampmax-points",
      expect.objectContaining({
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      }),
    );
    // 4 layers: clusters, cluster-count, unclustered circles, selected circle
    expect(h.api.addLayer).toHaveBeenCalledTimes(4);
    expect(h.api.fitBounds).not.toHaveBeenCalled(); // single point → eased, not fitted
    rerender(<MapView points={b} fitKey="k1" />);
    expect(h.api.addSource).toHaveBeenCalledTimes(1);
    expect(h.source.setData).toHaveBeenCalledTimes(1);
    expect(h.Map).toHaveBeenCalledTimes(1);
    rerender(<MapView points={b} fitKey="k1" selectedPointId="b" />);
    expect(h.api.setFilter).toHaveBeenLastCalledWith(expect.any(String), ["==", ["get", "id"], "b"]);
  });

  it("gives each point's kind to the GeoJSON feature and colors the layer by it", async () => {
    const points = [
      { id: "a", latitude: 1, longitude: 2, kind: "EVENT" },
      { id: "b", latitude: 1.1, longitude: 2.1 }, // no kind: still renders (default color)
    ];
    render(<MapView points={points} fitKey="k1" />);
    await waitFor(() => expect(h.handlers.load).toBeDefined());
    await act(async () => h.handlers.load());
    await waitFor(() => expect(h.api.addSource).toHaveBeenCalledTimes(1));
    const source = h.api.addSource.mock.calls[0][1] as { data: { features: { properties: { id: string; kind: string } }[] } };
    const data = source.data;
    expect(data.features.map((f) => f.properties)).toEqual([
      { id: "a", kind: "EVENT" },
      { id: "b", kind: "" },
    ]);
    const circleLayer = h.api.addLayer.mock.calls.find((c) => c[0].id === "kampmax-points-circles")![0];
    expect(JSON.stringify(circleLayer.paint["circle-color"])).toContain("EVENT");
    // Also verify cluster layers were added
    const clusterLayer = h.api.addLayer.mock.calls.find((c) => c[0].id === "kampmax-clusters")![0];
    expect(clusterLayer).toBeDefined();
    const countLayer = h.api.addLayer.mock.calls.find((c) => c[0].id === "kampmax-cluster-count")![0];
    expect(countLayer).toBeDefined();
  });
});

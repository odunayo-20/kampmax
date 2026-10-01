// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { MapPoint } from "@/components/maps/MapView";
import type { NearbyItem } from "@/services/nearby-api";
import { DeviceLocationError } from "@/lib/maps/types";

const h = vi.hoisted(() => ({
  profile: { data: null as unknown },
  nearby: {} as Record<string, unknown>,
  useNearby: vi.fn(),
  getDevicePosition: vi.fn(),
  refetch: vi.fn(),
  fetchNextPage: vi.fn(),
  mapProps: { current: null as null | Record<string, unknown> },
  routerReplace: vi.fn(),
  searchParams: "",
  campuses: [] as { id: string; name: string; abbreviation: string; location: string; departments: string[] }[],
}));

vi.mock("@/hooks/use-location", () => ({ useMyLocation: () => h.profile }));
vi.mock("@/hooks/use-nearby", () => ({
  useNearby: (p: unknown) => h.useNearby(p),
  useNearbyTypes: () => ({
    data: [
      { type: "VENDOR", label: "Vendors", categoryTaxonomy: null, hasSchedule: false },
      { type: "EVENT", label: "Events", categoryTaxonomy: "EVENT", hasSchedule: true },
    ],
  }),
}));
vi.mock("@/hooks/use-taxonomy", () => ({
  useCategories: () => ({ categories: [], isLoading: false, nameById: new Map() }),
}));
vi.mock("@/lib/app-context", () => ({ useApp: () => ({ campuses: h.campuses }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: h.routerReplace }),
  usePathname: () => "/nearby",
  useSearchParams: () => new URLSearchParams(h.searchParams),
}));
vi.mock("@/lib/maps/geolocation", () => ({ getDevicePosition: h.getDevicePosition }));
vi.mock("@/components/maps/LocationPicker", () => ({
  LocationPicker: ({ onConfirm }: { onConfirm: (l: unknown) => void }) => (
    <button
      onClick={() =>
        onConfirm({ latitude: 6.5, longitude: 3.4, source: "MANUAL", accuracyMeters: null, formattedAddress: "Lagos", city: "Lagos", state: null })
      }
    >
      picker-confirm
    </button>
  ),
}));
vi.mock("@/components/maps/MapView", () => ({
  MapView: (props: {
    points?: MapPoint[];
    selectedPointId?: string | null;
    onPointSelect?: (id: string) => void;
    onBoundsChange?: (b: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void;
  }) => {
    h.mapProps.current = props as never;
    return (
      <div data-testid="map" data-selected={props.selectedPointId ?? ""} data-count={props.points?.length ?? 0}>
        {props.points?.map((p) => (
          <button key={p.id} onClick={() => props.onPointSelect?.(p.id)}>{`marker ${p.id}`}</button>
        ))}
        <button
          onClick={() =>
            props.onBoundsChange?.({
              minLat: 6.4,
              maxLat: 6.6,
              minLng: 3.3,
              maxLng: 3.5,
            })
          }
        >
          trigger-bounds-change
        </button>
      </div>
    );
  },
}));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import { NearbyExplorer } from "../NearbyExplorer";

const item = (
  id: string,
  title: string,
  meters: number,
  type = "VENDOR",
  extra: Partial<NearbyItem> = {},
): NearbyItem => ({
  entityType: type,
  entityId: id,
  title,
  subtitle: null,
  image: null,
  detailPath: `/store/${id}`,
  campusId: null,
  category: null,
  schedule: null,
  distanceMeters: meters,
  location: { latitude: 7 + meters / 1e5, longitude: 5, precision: "DISCOVERABLE" },
  ...extra,
});

const setResults = (items: NearbyItem[], extra: Record<string, unknown> = {}) => {
  h.useNearby.mockImplementation(() => ({
    data: { pages: [{ items, meta: { total: items.length, page: 1, limit: 20, totalPages: 1, hasNextPage: false } }] },
    isPending: false,
    isError: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    refetch: h.refetch,
    fetchNextPage: h.fetchNextPage,
    ...extra,
  }));
};

const PROFILE = { latitude: 7.19, longitude: 5.58, formattedAddress: "Owo, Ondo", city: "Owo" };

beforeEach(() => {
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  Element.prototype.scrollIntoView = vi.fn();
  sessionStorage.clear();
  h.profile.data = PROFILE;
  h.searchParams = "";
  h.campuses = [];
  h.routerReplace.mockClear();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NearbyExplorer", () => {
  it("falls back to the saved profile location and queries with it (no device prompt)", () => {
    setResults([item("a", "Alpha", 250)]);
    render(<NearbyExplorer />);
    expect(screen.getByText("Owo, Ondo")).toBeTruthy();
    expect(h.useNearby).toHaveBeenLastCalledWith(expect.objectContaining({ latitude: 7.19, longitude: 5.58, radiusMeters: 5000 }));
    expect(h.getDevicePosition).not.toHaveBeenCalled();
  });

  it("makes no request and fabricates nothing without any location", () => {
    h.profile.data = null;
    setResults([]);
    render(<NearbyExplorer />);
    expect(h.useNearby).toHaveBeenLastCalledWith(null);
    expect(screen.getByText(/Set your location/)).toBeTruthy();
  });

  it("renders results with human-friendly, backend-provided distance and total count", () => {
    setResults([item("a", "Alpha", 250), item("b", "Beta", 1200)]);
    render(<NearbyExplorer />);
    expect(screen.getByText(/250 m away/)).toBeTruthy();
    expect(screen.getByText(/1\.2 km away/)).toBeTruthy();
    expect(screen.getByText(/2 places within 5 km/)).toBeTruthy();
    expect(screen.getByTestId("map").dataset.count).toBe("2");
  });

  it("list → map: selecting a result highlights its marker and shows a preview with a link", () => {
    setResults([item("a", "Alpha", 250), item("b", "Beta", 900)]);
    render(<NearbyExplorer />);
    fireEvent.click(screen.getByRole("button", { name: /^Beta/ }));
    expect(screen.getByTestId("map").dataset.selected).toBe("VENDOR:b");
    const preview = screen.getByRole("region", { name: "Selected place" });
    expect(preview.querySelector("a")?.getAttribute("href")).toBe("/store/b");
    expect(screen.getByRole("button", { name: /^Beta/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("map → list: selecting a marker selects and scrolls to the result, without navigating", () => {
    setResults([item("a", "Alpha", 250), item("b", "Beta", 900)]);
    render(<NearbyExplorer />);
    fireEvent.click(screen.getByText("marker VENDOR:a"));
    expect(screen.getByRole("button", { name: /^Alpha/ }).getAttribute("aria-pressed")).toBe("true");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Selected place" })).toBeTruthy();
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByRole("region", { name: "Selected place" })).toBeNull();
  });

  it("shows the empty state with useful actions", () => {
    setResults([]);
    render(<NearbyExplorer />);
    expect(screen.getByText("No Kampmax places found here")).toBeTruthy();
    fireEvent.click(screen.getByText("Search within 10 km"));
    expect(h.useNearby).toHaveBeenLastCalledWith(expect.objectContaining({ radiusMeters: 10000 }));
  });

  it("shows a friendly error and can retry", () => {
    setResults([], { data: undefined, isError: true, error: new Error("QueryFailedError: secret") });
    render(<NearbyExplorer />);
    expect(screen.queryByText(/QueryFailedError/)).toBeNull();
    fireEvent.click(screen.getByText("Try again"));
    expect(h.refetch).toHaveBeenCalled();
  });

  it("shows a loading state on first load", () => {
    setResults([], { data: undefined, isPending: true });
    render(<NearbyExplorer />);
    expect(screen.getByText("Finding places…")).toBeTruthy();
  });

  it("device location becomes the search origin and is not written anywhere else", async () => {
    setResults([]);
    h.getDevicePosition.mockResolvedValue({ latitude: 6.5, longitude: 3.4, accuracyMeters: 20 });
    render(<NearbyExplorer />);
    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    await waitFor(() => expect(h.useNearby).toHaveBeenLastCalledWith(expect.objectContaining({ latitude: 6.5, longitude: 3.4 })));
    expect(screen.getByText("Current location")).toBeTruthy();
    expect(h.getDevicePosition).toHaveBeenCalledTimes(1);
  });

  it("permission denied shows a message and keeps the previous origin", async () => {
    setResults([]);
    h.getDevicePosition.mockRejectedValue(new DeviceLocationError("denied", "Location permission was denied."));
    render(<NearbyExplorer />);
    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    expect((await screen.findByRole("alert")).textContent).toContain("permission was denied");
    expect(h.useNearby).toHaveBeenLastCalledWith(expect.objectContaining({ latitude: 7.19 }));
  });

  it("manual location via the picker changes the origin only", async () => {
    setResults([]);
    render(<NearbyExplorer />);
    fireEvent.click(screen.getAllByRole("button", { name: /change location/i })[0]);
    fireEvent.click(screen.getByText("picker-confirm"));
    await waitFor(() => expect(h.useNearby).toHaveBeenLastCalledWith(expect.objectContaining({ latitude: 6.5 })));
    expect(JSON.parse(sessionStorage.getItem("kampmax:nearby-origin") ?? "{}").latitude).toBe(6.5);
  });

  it("debounces search text into a single query change", async () => {
    vi.useFakeTimers();
    try {
      setResults([]);
      render(<NearbyExplorer />);
      const input = screen.getByLabelText("Search Kampmax nearby");
      fireEvent.change(input, { target: { value: "br" } });
      fireEvent.change(input, { target: { value: "bre" } });
      fireEvent.change(input, { target: { value: "bread" } });
      expect(h.useNearby).not.toHaveBeenCalledWith(expect.objectContaining({ q: "bread" }));
      await act(async () => {
        vi.advanceTimersByTime(450);
      });
      expect(h.useNearby).toHaveBeenLastCalledWith(expect.objectContaining({ q: "bread" }));
      expect(h.useNearby).not.toHaveBeenCalledWith(expect.objectContaining({ q: "bre" }));
    } finally {
      vi.useRealTimers();
    }
  });

  it("type filter and radius are passed to the query, and reflected in the URL", () => {
    setResults([]);
    render(<NearbyExplorer />);
    fireEvent.click(screen.getByRole("button", { name: "Events" }));
    expect(h.useNearby).toHaveBeenLastCalledWith(expect.objectContaining({ entityType: "EVENT" }));
    expect(h.routerReplace).toHaveBeenLastCalledWith(expect.stringContaining("entityType=EVENT"), expect.anything());
    fireEvent.change(screen.getByLabelText("Distance"), { target: { value: "1000" } });
    expect(h.useNearby).toHaveBeenLastCalledWith(expect.objectContaining({ radiusMeters: 1000 }));
    expect(h.routerReplace).toHaveBeenLastCalledWith(expect.stringContaining("radius=1000"), expect.anything());
  });

  it("mobile: selecting from the list switches to the map view", () => {
    window.matchMedia = ((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} })) as never;
    setResults([item("a", "Alpha", 250)]);
    render(<NearbyExplorer />);
    expect(screen.getByRole("tab", { name: "List" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /^Alpha/ }));
    expect(screen.getByRole("tab", { name: "Map" }).getAttribute("aria-selected")).toBe("true");
  });

  it("restores entityType, radius and search from the URL on load", () => {
    h.searchParams = "entityType=EVENT&radius=10000&q=music";
    setResults([]);
    render(<NearbyExplorer />);
    expect(h.useNearby).toHaveBeenLastCalledWith(
      expect.objectContaining({ entityType: "EVENT", radiusMeters: 10000 }),
    );
    expect(screen.getByRole("button", { name: "Events" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("lists every campus from the app's campus architecture (never hardcoded) and filters by the chosen one", () => {
    h.campuses = [
      { id: "campus-1", name: "Main Campus", abbreviation: "MC", location: "", departments: [] },
      { id: "campus-2", name: "North Campus", abbreviation: "NC", location: "", departments: [] },
    ];
    setResults([]);
    render(<NearbyExplorer />);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    const select = screen.getByLabelText("Campus") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
      "All campuses",
      "Main Campus",
      "North Campus",
    ]);
    fireEvent.change(select, { target: { value: "campus-1" } });
    fireEvent.click(screen.getByText("Apply"));
    expect(h.useNearby).toHaveBeenLastCalledWith(
      expect.objectContaining({ campusId: "campus-1", campusScope: "WITHIN" }),
    );
  });

  it("hides the campus filter entirely when no campuses are available", () => {
    setResults([]);
    render(<NearbyExplorer />);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    expect(screen.queryByLabelText("Campus")).toBeNull();
  });

  it("clearing filters in the drawer resets category and campus", () => {
    h.campuses = [{ id: "campus-1", name: "Main Campus", abbreviation: "MC", location: "", departments: [] }];
    setResults([]);
    render(<NearbyExplorer />);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    fireEvent.change(screen.getByLabelText("Campus"), { target: { value: "campus-1" } });
    fireEvent.click(screen.getByText("Clear"));
    expect(h.useNearby).toHaveBeenLastCalledWith(expect.objectContaining({ campusId: undefined }));
  });

  it("shows date presets only for a scheduled type (events), and applies them", () => {
    setResults([]);
    render(<NearbyExplorer />);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    expect(screen.queryByText("This weekend")).toBeNull(); // "All" selected: no type has a schedule

    fireEvent.click(screen.getByText("Apply")); // close, then switch to Events
    fireEvent.click(screen.getByRole("button", { name: "Events" }));
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    fireEvent.click(screen.getByText("This weekend"));
    expect(h.useNearby).toHaveBeenLastCalledWith(
      expect.objectContaining({ dateFrom: expect.any(String), dateTo: expect.any(String) }),
    );
  });

  it("only offers the Upcoming sort for a scheduled type", () => {
    setResults([]);
    render(<NearbyExplorer />);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    expect(screen.queryByRole("button", { name: "Upcoming" })).toBeNull();
    fireEvent.click(screen.getByText("Apply"));

    fireEvent.click(screen.getByRole("button", { name: "Events" }));
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    fireEvent.click(screen.getByRole("button", { name: "Upcoming" }));
    expect(h.useNearby).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "upcoming" }));
  });

  it("switching away from a scheduled type drops its date filter and upcoming sort", () => {
    setResults([]);
    render(<NearbyExplorer />);
    fireEvent.click(screen.getByRole("button", { name: "Events" }));
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    fireEvent.click(screen.getByRole("button", { name: "Upcoming" }));
    fireEvent.click(screen.getByText("Apply"));
    expect(h.useNearby).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "upcoming" }));

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(h.useNearby).toHaveBeenLastCalledWith(
      expect.objectContaining({ dateFrom: undefined, dateTo: undefined, sort: undefined }),
    );
  });

  it("shows removable active-filter chips and a working Clear all", () => {
    setResults([]);
    render(<NearbyExplorer />);
    fireEvent.click(screen.getByRole("button", { name: "Events" }));
    const chips = screen.getByRole("group", { name: "Active filters" });
    expect(within(chips).getByText("Events")).toBeTruthy();

    fireEvent.click(within(chips).getByText("Clear all"));
    expect(h.useNearby).toHaveBeenLastCalledWith(expect.objectContaining({ entityType: undefined }));
    expect(screen.queryByRole("group", { name: "Active filters" })).toBeNull();
  });

  it("removing a single active filter chip clears only that filter", () => {
    setResults([]);
    render(<NearbyExplorer />);
    fireEvent.click(screen.getByRole("button", { name: "Events" }));
    fireEvent.change(screen.getByLabelText("Distance"), { target: { value: "1000" } });

    fireEvent.click(screen.getByRole("button", { name: /Remove 1 km filter/i }));
    expect(h.useNearby).toHaveBeenLastCalledWith(
      expect.objectContaining({ entityType: "EVENT", radiusMeters: 5000 }),
    );
  });

  it("shows an event's date and time on its card and preview", () => {
    setResults([
      item("e1", "Fresher Party", 400, "EVENT", {
        schedule: { startsAt: "2025-06-14T18:00:00.000Z", endsAt: "2025-06-14T22:00:00.000Z" },
      }),
    ]);
    render(<NearbyExplorer />);
    expect(screen.getByText(/Jun/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Fresher Party/ }));
    const preview = screen.getByRole("region", { name: "Selected place" });
    expect(preview.textContent).toMatch(/Jun/);
  });

  it("gives an event marker a distinct kind for the map", () => {
    setResults([item("e1", "Fresher Party", 400, "EVENT")]);
    render(<NearbyExplorer />);
    expect(h.mapProps.current?.points).toEqual([
      expect.objectContaining({ id: "EVENT:e1", kind: "EVENT" }),
    ]);
  });

  it("shows a no-events empty message for a scheduled type", () => {
    setResults([]);
    render(<NearbyExplorer />);
    fireEvent.click(screen.getByRole("button", { name: "Events" }));
    expect(screen.getByText("No upcoming events found here")).toBeTruthy();
  });

  it("displays 'Search this area' when the map moves, and searching this area passes bounds to query and adds a removable chip", () => {
    setResults([]);
    render(<NearbyExplorer />);
    expect(screen.queryByRole("button", { name: "Search this area" })).toBeNull();

    // Simulate map moveend triggering bounds change
    fireEvent.click(screen.getByText("trigger-bounds-change"));

    // "Search this area" floating button appears
    const searchAreaBtn = screen.getByRole("button", { name: "Search this area" });
    expect(searchAreaBtn).toBeTruthy();

    // Clicking "Search this area" applies bounds to query
    fireEvent.click(searchAreaBtn);
    expect(h.useNearby).toHaveBeenLastCalledWith(
      expect.objectContaining({ bounds: "3.3,6.4,3.5,6.6" }),
    );

    // Active filters group now includes "Map area" chip
    const chips = screen.getByRole("group", { name: "Active filters" });
    expect(within(chips).getByText("Map area")).toBeTruthy();

    // Removing the chip clears the viewport search
    fireEvent.click(within(chips).getByRole("button", { name: /Remove Map area filter/i }));
    expect(h.useNearby).toHaveBeenLastCalledWith(
      expect.objectContaining({ bounds: undefined }),
    );
  });
});


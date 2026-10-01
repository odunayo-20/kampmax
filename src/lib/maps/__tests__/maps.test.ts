import { describe, expect, it, vi } from "vitest";
import { getMapStyleUrl, isMapConfigured } from "../config";
import { getDevicePosition } from "../geolocation";
import { parseFeature, reverseGeocode, searchPlaces } from "../maptiler/geocoding";
import { DeviceLocationError, GeocodingError } from "../types";
import { toLocationBody } from "@/services/location-api";

const feature = {
  id: "municipality.1",
  text: "Owo",
  place_name: "Owo, Ondo, Nigeria",
  center: [5.5866, 7.1966] as [number, number],
  context: [
    { id: "region.2", text: "Ondo" },
    { id: "country.3", text: "Nigeria" },
  ],
};

const okFetch = (body: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => body }) as unknown as typeof fetch;

describe("map config", () => {
  it("treats an empty key as not configured", () => {
    expect(isMapConfigured("")).toBe(false);
    expect(isMapConfigured("abc")).toBe(true);
  });
  it("builds a MapTiler style URL with the key encoded", () => {
    expect(getMapStyleUrl("a b")).toBe("https://api.maptiler.com/maps/streets-v2/style.json?key=a%20b");
  });
});

describe("geocoding", () => {
  it("parses a feature into structured location", () => {
    expect(parseFeature(feature)).toMatchObject({
      latitude: 7.1966,
      longitude: 5.5866,
      city: "Owo",
      state: "Ondo",
      country: "Nigeria",
      label: "Owo, Ondo, Nigeria",
    });
  });

  it("drops features with invalid coordinates", () => {
    expect(parseFeature({ ...feature, center: [500, 7] })).toBeNull();
    expect(parseFeature({ ...feature, center: undefined })).toBeNull();
  });

  it("search success returns results and sends the key", async () => {
    const f = okFetch({ features: [feature] });
    const res = await searchPlaces("Owo", { apiKey: "k", fetchImpl: f });
    expect(res).toHaveLength(1);
    const url = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/geocoding/Owo.json");
    expect(url).toContain("key=k");
  });

  it("skips the network for very short queries", async () => {
    const f = okFetch({ features: [] });
    expect(await searchPlaces("a", { apiKey: "k", fetchImpl: f })).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it("fails with not_configured when the key is missing", async () => {
    await expect(searchPlaces("Owo", { apiKey: "", fetchImpl: okFetch({}) })).rejects.toMatchObject({ code: "not_configured" });
  });

  it("maps network failure, HTTP error and bad body to typed errors", async () => {
    const net = vi.fn().mockRejectedValue(new TypeError("fail")) as unknown as typeof fetch;
    await expect(searchPlaces("Owo", { apiKey: "k", fetchImpl: net })).rejects.toMatchObject({ code: "network" });
    const http = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    await expect(searchPlaces("Owo", { apiKey: "k", fetchImpl: http })).rejects.toBeInstanceOf(GeocodingError);
    await expect(searchPlaces("Owo", { apiKey: "k", fetchImpl: okFetch({ nope: 1 }) })).rejects.toMatchObject({ code: "bad_response" });
  });

  it("reverse geocodes lng,lat order", async () => {
    const f = okFetch({ features: [feature] });
    const res = await reverseGeocode({ latitude: 7.1966, longitude: 5.5866 }, { apiKey: "k", fetchImpl: f });
    expect(res?.city).toBe("Owo");
    expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain("/geocoding/5.5866,7.1966.json");
  });

  it("reverse geocode returns null when nothing matches", async () => {
    expect(await reverseGeocode({ latitude: 0, longitude: 0 }, { apiKey: "k", fetchImpl: okFetch({ features: [] }) })).toBeNull();
  });
});

describe("device geolocation", () => {
  const geo = (impl: (ok: PositionCallback, err: PositionErrorCallback) => void) =>
    ({ getCurrentPosition: impl }) as unknown as Geolocation;

  it("resolves with coordinates and accuracy", async () => {
    const g = geo((ok) => ok({ coords: { latitude: 1, longitude: 2, accuracy: 25 } } as GeolocationPosition));
    await expect(getDevicePosition(g)).resolves.toEqual({ latitude: 1, longitude: 2, accuracyMeters: 25 });
  });

  it("stores null accuracy when the browser gives none", async () => {
    const g = geo((ok) => ok({ coords: { latitude: 1, longitude: 2, accuracy: undefined } } as unknown as GeolocationPosition));
    expect((await getDevicePosition(g)).accuracyMeters).toBeNull();
  });

  it.each([
    [1, "denied"],
    [2, "unavailable"],
    [3, "timeout"],
  ])("maps error code %i to %s", async (code, expected) => {
    const g = geo((_ok, err) => err({ code } as GeolocationPositionError));
    await expect(getDevicePosition(g)).rejects.toMatchObject({ code: expected });
  });

  it("reports unsupported browsers", async () => {
    await expect(getDevicePosition(undefined)).rejects.toBeInstanceOf(DeviceLocationError);
    await expect(getDevicePosition(undefined)).rejects.toMatchObject({ code: "unsupported" });
  });
});

describe("location API body", () => {
  it("sends only whitelisted fields", () => {
    const body = toLocationBody({
      latitude: 1,
      longitude: 2,
      source: "MANUAL",
      accuracyMeters: null,
      country: null,
      state: null,
      city: "Owo",
      area: null,
      formattedAddress: null,
      userId: "victim",
    } as never);
    expect(body).not.toHaveProperty("userId");
    expect(body).toMatchObject({ city: "Owo", campusId: null, accuracyMeters: null });
  });
});

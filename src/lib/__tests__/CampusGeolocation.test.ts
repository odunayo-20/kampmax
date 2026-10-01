import { describe, it, expect, vi } from "vitest";
import {
  calculateHaversineDistanceKm,
  formatCampusDistance,
  findNearestCampus,
  detectCampusFromGeolocation,
} from "@/lib/campus-geolocation";
import { campuses } from "@/data/campus";

describe("Campus Geolocation & Distance Utilities", () => {
  it("calculates accurate great-circle distance between two Nigerian coordinates", () => {
    // UNILAG (6.5173, 3.3986) to OAU (7.5199, 4.523)
    const dist = calculateHaversineDistanceKm(6.5173, 3.3986, 7.5199, 4.523);
    expect(dist).toBeGreaterThan(150);
    expect(dist).toBeLessThan(200);
  });

  it("formats distances properly for UI presentation", () => {
    expect(formatCampusDistance(0.45)).toBe("450m away");
    expect(formatCampusDistance(3.24)).toBe("3.2 km away");
    expect(formatCampusDistance(45.8)).toBe("46 km away");
  });

  it("finds the nearest campus to given coordinates", () => {
    // Coords right near UNILAG campus in Akoka: 6.518, 3.399
    const nearest = findNearestCampus({ latitude: 6.518, longitude: 3.399 }, campuses);
    expect(nearest).not.toBeNull();
    expect(nearest?.campus.id).toBe("unilag");
    expect(nearest?.isCloseProximity).toBe(true);
    expect(nearest?.distanceKm).toBeLessThan(2);
  });

  it("detects when user is too far from any campus", () => {
    // Far out in the Atlantic Ocean: 0, 0
    const nearest = findNearestCampus({ latitude: 0, longitude: 0 }, campuses, 40);
    expect(nearest).not.toBeNull();
    expect(nearest?.isCloseProximity).toBe(false);
  });

  it("resolves campus detection successfully via mock device resolver", async () => {
    const mockResolver = vi.fn().mockResolvedValue({
      latitude: 7.197,
      longitude: 5.587,
      accuracyMeters: 10,
    });

    const result = await detectCampusFromGeolocation(campuses, 40, mockResolver);
    expect(result.status).toBe("success");
    expect(result.detectedCampus?.id).toBe("rugipo");
    expect(result.promptMessage).toContain("Rufus Giwa Polytechnic");
  });
});

import { describe, expect, it } from "vitest";
import { BLOCKER_FIX, canClose, closeFailure, orderSessions, otherSessions, sessionLine, type Session } from "@/lib/account-safety";

const session = (id: string, signedInAt: string, current = false, place: string | null = null): Session => ({
  id,
  device: "Chrome on Windows",
  place,
  signedInAt,
  expiresAt: "2030-01-01T00:00:00Z",
  current,
});

describe("sessions", () => {
  it("puts this device first, then the most recent", () => {
    const list = orderSessions([session("old", "2026-01-01T00:00:00Z"), session("me", "2025-01-01T00:00:00Z", true), session("new", "2026-06-01T00:00:00Z")]);
    expect(list.map((s) => s.id)).toEqual(["me", "new", "old"]);
  });

  it("counts only the other devices", () => {
    expect(otherSessions([session("a", "2026-01-01T00:00:00Z", true), session("b", "2026-01-01T00:00:00Z")])).toBe(1);
  });

  it("labels this device and adds the network when known", () => {
    expect(sessionLine(session("a", "2026-01-01T00:00:00Z", true))).toBe("This device");
    expect(sessionLine(session("a", "2026-01-01T00:00:00Z", true, "102.89.•.•"))).toBe("This device · 102.89.•.•");
  });
});

describe("closing the account", () => {
  it("needs no blockers and a password", () => {
    expect(canClose([], "secret")).toBe(true);
    expect(canClose([], "")).toBe(false);
    expect(canClose([{ code: "money", message: "x" }], "secret")).toBe(false);
  });

  it("says what went wrong", () => {
    expect(closeFailure({ status: 400 })).toMatch(/password/);
    expect(closeFailure({ status: 409 })).toMatch(/still open/);
    expect(closeFailure({ status: 429 })).toMatch(/Too many/);
    expect(closeFailure(null)).toMatch(/Could not close/);
  });

  it("sends every blocker to a page that exists on web", () => {
    for (const fix of Object.values(BLOCKER_FIX)) expect(fix.href.startsWith("/")).toBe(true);
    expect(Object.keys(BLOCKER_FIX).sort()).toEqual(["bookings", "buying", "contracts", "listings", "money", "selling"]);
  });
});

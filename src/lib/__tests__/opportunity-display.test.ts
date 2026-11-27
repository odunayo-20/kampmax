import { describe, expect, it } from "vitest";
import { closesText } from "../opportunity-display";

describe("closesText", () => {
  const now = Date.parse("2026-11-27T12:00:00Z");

  it("counts forward to the deadline instead of saying 'just now'", () => {
    expect(closesText("2026-12-02T12:00:00Z", now)).toBe("Closes in 5 days");
    expect(closesText("2026-11-28T10:00:00Z", now)).toBe("Closes tomorrow");
    expect(closesText("2026-11-27T12:00:00Z", now)).toBe("Closes today");
  });

  it("says Closed after the deadline, and nothing without one", () => {
    expect(closesText("2026-11-20T12:00:00Z", now)).toBe("Closed");
    expect(closesText(null, now)).toBeNull();
    expect(closesText("", now)).toBeNull();
  });
});

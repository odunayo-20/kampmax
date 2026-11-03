import { describe, expect, it } from "vitest";
import { getFriendlyErrorMessage, getRefusalMessage } from "../error-messages";

const apiError = (status: number, message: string) => Object.assign(new Error(message), { status });

describe("getRefusalMessage", () => {
  it("shows the backend's own words when it refused what was asked", () => {
    expect(getRefusalMessage(apiError(400, "That would go over this week's 20-hour limit. You have 1h 40m left"))).toBe(
      "That would go over this week's 20-hour limit. You have 1h 40m left"
    );
    expect(getRefusalMessage(apiError(409, "This contract just changed. Refresh and try again."))).toBe(
      "This contract just changed. Refresh and try again."
    );
    expect(getRefusalMessage(apiError(422, "Pick a real date for this time"))).toBe("Pick a real date for this time");
  });

  it.each([401, 403, 429])("keeps the friendly message for a %i, which is about the session, not the request", (status) => {
    const error = apiError(status, "raw server text that should not be shown");
    expect(getRefusalMessage(error)).toBe(getFriendlyErrorMessage(error));
    expect(getRefusalMessage(error)).not.toContain("raw server text");
  });

  it.each([500, 502, 503])("never shows server text for a %i failure", (status) => {
    expect(getRefusalMessage(apiError(status, "ECONNREFUSED 10.0.0.5:5432"))).toBe(
      "Something went wrong on our end. Please try again."
    );
  });

  it("falls back to the friendly message when there is no status or no text", () => {
    expect(getRefusalMessage(new Error("boom"))).toBe(getFriendlyErrorMessage(new Error("boom")));
    expect(getRefusalMessage(apiError(400, "   "))).toBe(getFriendlyErrorMessage(apiError(400, "   ")));
    expect(getRefusalMessage(undefined)).toBe("Something went wrong on our end. Please try again.");
    expect(getRefusalMessage(null)).toBe("Something went wrong on our end. Please try again.");
  });

  it("ignores a status that is not a number", () => {
    const error = Object.assign(new Error("a reason"), { status: "400" });
    expect(getRefusalMessage(error)).toBe(getFriendlyErrorMessage(error));
  });
});

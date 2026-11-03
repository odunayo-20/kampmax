import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

import { parseOfferId } from "../offers-api";

const ID = "3f2b8c1e-5a47-4d9e-9b6a-1c2d3e4f5a6b";

describe("parseOfferId", () => {
  it("finds the offer in the message the backend posts", () => {
    const text = `Offer: Landing page design\n₦50,000 · 7 days\n\nOffer: /offers/${ID}`;
    expect(parseOfferId(text)).toBe(ID);
  });

  it("ignores ordinary text and other links", () => {
    expect(parseOfferId("hello there")).toBeNull();
    expect(parseOfferId(`Service: /services/${ID}`)).toBeNull();
  });

  it("ignores a link buried in a sentence or with a malformed id", () => {
    expect(parseOfferId(`see Offer: /offers/${ID} please`)).toBeNull();
    expect(parseOfferId("Offer: /offers/not-a-uuid")).toBeNull();
  });
});

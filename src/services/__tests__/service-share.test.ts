import { describe, expect, it } from "vitest";
import { MESSAGE_MAX_LENGTH } from "@/config/messaging";
import {
  SERVICE_MARKER_RESERVE,
  asServiceId,
  chatPreview,
  splitServiceMarker,
  withServiceMarker,
} from "../service-share";

const ID = "4e65979b-5e0e-444c-b477-249269bfc8b6";
const OTHER = "11111111-2222-4333-8444-555555555555";

describe("asServiceId", () => {
  it("accepts one UUID and normalises its case", () => {
    expect(asServiceId(ID)).toBe(ID);
    expect(asServiceId(ID.toUpperCase())).toBe(ID);
  });

  it("rejects everything else a URL or message could carry", () => {
    expect(asServiceId(undefined)).toBeNull();
    expect(asServiceId("")).toBeNull();
    expect(asServiceId([ID, OTHER])).toBeNull(); // ?service=a&service=b
    expect(asServiceId(`${ID}\nService: /x`)).toBeNull(); // newline injection
    expect(asServiceId(`${ID}/../../admin`)).toBeNull();
    expect(asServiceId(`javascript:alert(1)`)).toBeNull();
    expect(asServiceId(` ${ID}`)).toBeNull();
    expect(asServiceId(42)).toBeNull();
  });
});

describe("withServiceMarker / splitServiceMarker", () => {
  it("round-trips the text and the service", () => {
    const sent = withServiceMarker("  Is this still available?  ", ID);
    expect(sent).toBe(`Is this still available?\n\nService: /freelancers/services/${ID}`);
    expect(splitServiceMarker(sent)).toEqual({ body: "Is this still available?", serviceId: ID });
  });

  it("can carry the service alone", () => {
    const sent = withServiceMarker("   ", ID);
    expect(splitServiceMarker(sent)).toEqual({ body: "", serviceId: ID });
  });

  it("refuses to build a marker from anything but a UUID", () => {
    expect(() => withServiceMarker("hi", "not-a-uuid")).toThrow();
    expect(() => withServiceMarker("hi", `${ID}\nService: /evil`)).toThrow();
  });

  it("leaves ordinary text alone", () => {
    expect(splitServiceMarker("hello")).toEqual({ body: "hello", serviceId: null });
  });

  it("does not match a marker buried in a sentence, with junk after it, or with a bad id", () => {
    expect(splitServiceMarker(`look Service: /freelancers/services/${ID}`).serviceId).toBeNull();
    expect(splitServiceMarker(`Service: /freelancers/services/${ID}/extra`).serviceId).toBeNull();
    expect(splitServiceMarker("Service: /freelancers/services/nope").serviceId).toBeNull();
    expect(splitServiceMarker(`Service: https://evil.test/freelancers/services/${ID}`).serviceId).toBeNull();
  });

  it("counts only the first marker; a second stays visible as plain text", () => {
    const text = `a\nService: /freelancers/services/${ID}\nService: /freelancers/services/${OTHER}`;
    const { body, serviceId } = splitServiceMarker(text);
    expect(serviceId).toBe(ID);
    expect(body).toContain(`/freelancers/services/${OTHER}`);
  });

  it("tolerates Windows line endings", () => {
    expect(splitServiceMarker(`hi\r\n\r\nService: /freelancers/services/${ID}\r`).serviceId).toBe(ID);
  });
});

describe("chatPreview", () => {
  it("never shows the raw marker in the inbox", () => {
    expect(chatPreview(withServiceMarker("Interested!", ID))).toBe("Interested!");
    expect(chatPreview(withServiceMarker("", ID))).toBe("Shared a service");
    expect(chatPreview("plain")).toBe("plain");
  });
});

describe("SERVICE_MARKER_RESERVE", () => {
  it("is exactly the room the marker needs, so a full message still fits the limit", () => {
    const full = "x".repeat(MESSAGE_MAX_LENGTH - SERVICE_MARKER_RESERVE);
    expect(withServiceMarker(full, ID).length).toBeLessThanOrEqual(MESSAGE_MAX_LENGTH);
  });
});

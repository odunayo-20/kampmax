import { describe, expect, it } from "vitest";
import { safeWebUrl, validateApplication } from "../organizer-application";

const good = {
  organizationName: "  Tech Community  ",
  description: "We run monthly coding meetups for students on campus.",
  proofUrl: "",
};

describe("validateApplication", () => {
  it("trims the fields and leaves out an empty link", () => {
    expect(validateApplication(good)).toEqual({
      ok: true,
      value: { organizationName: "Tech Community", description: good.description },
    });
  });

  it("names the problem under each field", () => {
    const result = validateApplication({ organizationName: "ab", description: "short", proofUrl: "not a link" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.organizationName).toContain("at least 3");
    expect(result.errors.description).toContain("25 more characters");
    expect(result.errors.proofUrl).toContain("web address");
  });

  it("adds https to a bare address", () => {
    const result = validateApplication({ ...good, proofUrl: "instagram.com/club" });
    expect(result.ok && result.value.proofUrl).toBe("https://instagram.com/club");
  });
});

describe("safeWebUrl", () => {
  it.each(["javascript:alert(1)", "file:///etc/passwd", "https://user:pass@example.com", "localhost", ""])(
    "refuses %j",
    (input) => {
      expect(safeWebUrl(input)).toBeNull();
    }
  );
});

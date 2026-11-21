import { describe, expect, it } from "vitest";
import {
  applicantResponseView,
  canAnswer,
  employerResponseView,
  interviewBodyFrom,
  interviewFrom,
  interviewLine,
} from "@/lib/interviews";

const NOW = new Date(2026, 11, 1, 10, 0).getTime();
const local = (h: number) => {
  const d = new Date(NOW + h * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

describe("interviewFrom", () => {
  it("reads an interview and drops nonsense", () => {
    expect(interviewFrom(null)).toBeNull();
    expect(interviewFrom({ at: "nope" })).toBeNull();
    expect(
      interviewFrom({ at: "2026-12-05T13:00:00.000Z", place: "", note: "Bring ID", response: "WEIRD" })
    ).toEqual({ at: "2026-12-05T13:00:00.000Z", place: null, note: "Bring ID", response: "PROPOSED" });
    expect(interviewFrom({ at: "2026-12-05T13:00:00.000Z", response: "CONFIRMED" })?.response).toBe("CONFIRMED");
  });

  it("says when, and where if there is a place", () => {
    const at = new Date(2026, 11, 5, 14, 0).toISOString();
    expect(interviewLine({ at, place: "Block C" })).toMatch(/Block C$/);
    expect(interviewLine({ at, place: null })).not.toMatch(/ at Block/);
  });
});

describe("interviewBodyFrom", () => {
  it("builds the body the server takes", () => {
    const r = interviewBodyFrom({ when: local(48), place: "  Block C  ", note: "  Ask for Emeka " }, NOW);
    expect(r).toMatchObject({ body: { place: "Block C", note: "Ask for Emeka" } });
    const bare = interviewBodyFrom({ when: local(48), place: "", note: "" }, NOW) as { body: object };
    expect(Object.keys(bare.body)).toEqual(["at"]);
  });

  it("needs a real time, at least an hour away and within 90 days", () => {
    expect(interviewBodyFrom({ when: "", place: "", note: "" }, NOW)).toHaveProperty("problem");
    expect(interviewBodyFrom({ when: local(0.5), place: "", note: "" }, NOW)).toMatchObject({
      problem: expect.stringMatching(/at least an hour/),
    });
    expect(interviewBodyFrom({ when: local(24 * 91), place: "", note: "" }, NOW)).toMatchObject({
      problem: expect.stringMatching(/90 days/),
    });
  });

  it("keeps the place and note within the server's limits", () => {
    expect(interviewBodyFrom({ when: local(48), place: "x".repeat(201), note: "" }, NOW)).toMatchObject({
      problem: expect.stringMatching(/place/),
    });
    expect(interviewBodyFrom({ when: local(48), place: "", note: "x".repeat(501) }, NOW)).toMatchObject({
      problem: expect.stringMatching(/note/),
    });
  });
});

describe("how each side reads the answer", () => {
  it("words it for the employer and the applicant", () => {
    expect(employerResponseView("PROPOSED").label).toBe("Waiting for their answer");
    expect(employerResponseView("CONFIRMED").tone).toBe("success");
    expect(employerResponseView("DECLINED").label).toBe("Cannot make it");
    expect(applicantResponseView("PROPOSED").label).toBe("Please confirm");
    expect(applicantResponseView("DECLINED").text).toMatch(/can pick another time/);
  });

  it("cannot be answered once the time has passed", () => {
    expect(canAnswer({ at: new Date(NOW + 3_600_000).toISOString() }, NOW)).toBe(true);
    expect(canAnswer({ at: new Date(NOW - 1000).toISOString() }, NOW)).toBe(false);
  });
});

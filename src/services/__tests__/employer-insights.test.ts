import { describe, expect, it } from "vitest";
import {
  pipelineFrom,
  replyTimeText,
  reputationChips,
  reputationFrom,
  reputationHint,
} from "@/services/employer-insights";

describe("pipelineFrom", () => {
  it("reads missing and bad numbers as zero", () => {
    expect(pipelineFrom(null)).toEqual({ new: 0, shortlisted: 0, interviewing: 0, hired: 0 });
    expect(pipelineFrom({ new: 4, shortlisted: -1, interviewing: Number.NaN, hired: 2.9 })).toEqual({
      new: 4,
      shortlisted: 0,
      interviewing: 0,
      hired: 2,
    });
  });
});

describe("reputationFrom", () => {
  it("is null when the server sent nothing", () => {
    expect(reputationFrom(null)).toBeNull();
  });

  it("keeps a rate between 0 and 100 and rounds the reply time", () => {
    expect(
      reputationFrom({ received: 12, responseRate: 140, typicalReplyHours: 5.4, hires: 3 })
    ).toEqual({ received: 12, responseRate: 100, typicalReplyHours: 5, hires: 3 });
  });

  it("keeps 'too few to say' as null rather than zero", () => {
    expect(
      reputationFrom({ received: 2, responseRate: null, typicalReplyHours: null, hires: 0 })
    ).toEqual({ received: 2, responseRate: null, typicalReplyHours: null, hires: 0 });
  });
});

describe("reply times and chips", () => {
  it("words reply times like a person would", () => {
    expect(replyTimeText(0)).toBe("within an hour");
    expect(replyTimeText(5)).toBe("within 5 hours");
    expect(replyTimeText(24)).toBe("in about 1 day");
    expect(replyTimeText(60)).toBe("in about 3 days");
  });

  it("leaves out any fact with too little behind it", () => {
    expect(
      reputationChips({ received: 20, responseRate: 90, typicalReplyHours: 30, hires: 1 })
    ).toEqual(["Replies in about 1 day", "90% answered", "1 person hired"]);
    expect(
      reputationChips({ received: 20, responseRate: 90, typicalReplyHours: null, hires: 4 })
    ).toEqual(["90% answered", "4 people hired"]);
    expect(
      reputationChips({ received: 1, responseRate: null, typicalReplyHours: null, hires: 0 })
    ).toEqual([]);
    expect(reputationChips(null)).toEqual([]);
  });

  it("only coaches the employer while there is nothing to show", () => {
    expect(reputationHint(null)).toMatch(/once a few people have applied/);
    expect(
      reputationHint({ received: 9, responseRate: 80, typicalReplyHours: null, hires: 0 })
    ).toBeNull();
  });
});

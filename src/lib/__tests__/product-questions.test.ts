import { describe, expect, it } from "vitest";
import { answerProblem, questionProblem, questionsCount, tidyQuestion } from "../product-questions";

describe("product question rules", () => {
  it("tidies a question the way the server does", () => {
    expect(tidyQuestion("  Is it   new?\n")).toBe("Is it new?");
  });

  it("wants a question long enough to answer and not too long", () => {
    expect(questionProblem("new?")).toMatch(/at least 10/);
    expect(questionProblem("hi        there")).toMatch(/at least 10/);
    expect(questionProblem("Is the battery original?")).toBeNull();
    expect(questionProblem("x".repeat(301))).toMatch(/under 300/);
  });

  it("wants an answer with text and a sensible length", () => {
    expect(answerProblem("   ")).toBe("Write an answer");
    expect(answerProblem("Yes, original.")).toBeNull();
    expect(answerProblem("x".repeat(1001))).toMatch(/under 1000/);
  });

  it("counts questions naturally", () => {
    expect(questionsCount(1)).toBe("1 question");
    expect(questionsCount(1204)).toBe("1,204 questions");
  });
});

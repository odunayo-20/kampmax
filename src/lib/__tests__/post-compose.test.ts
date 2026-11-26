import { describe, expect, it } from "vitest";
import { draftProblem, type PostDraft } from "../post-compose";

const draft: PostDraft = { kind: "POST", text: "", photoCount: 0, pollOptions: ["", ""], lostItem: "", lostLocation: "" };
const check = (patch: Partial<PostDraft>, hasCampus = true) => draftProblem({ ...draft, ...patch }, { hasCampus });

describe("draftProblem", () => {
  it("needs words or a photo for a post", () => {
    expect(check({})).toBe("Write something or add a photo.");
    expect(check({ photoCount: 1 })).toBeNull();
  });

  it("needs a question and two different answers for a poll", () => {
    expect(check({ kind: "POLL" })).toBe("Ask your question first.");
    expect(check({ kind: "POLL", text: "Best hostel?", pollOptions: ["A", " "] })).toBe("Add at least two answers.");
    expect(check({ kind: "POLL", text: "Best hostel?", pollOptions: ["A", "a"] })).toBe("Each answer must be different.");
    expect(check({ kind: "POLL", text: "Best hostel?", pollOptions: ["A", "B"] })).toBeNull();
  });

  it("needs the item and place for lost and found", () => {
    expect(check({ kind: "LOST_FOUND" })).toBe("Say what the item is.");
    expect(check({ kind: "LOST_FOUND", lostItem: "Bag" })).toBe("Say where it was lost or found.");
  });

  it("needs a campus for an announcement", () => {
    expect(check({ kind: "ANNOUNCEMENT", text: "Exams move" }, false)).toBe("Choose your campus first.");
  });
});

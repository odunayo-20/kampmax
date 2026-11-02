import { describe, expect, it } from "vitest";
import { highlightParts } from "../highlight";

const matches = (text: string, query: string) =>
  highlightParts(text, query)
    .filter((p) => p.match)
    .map((p) => p.text);

describe("highlightParts", () => {
  it("marks where the search matches, keeping the text's own case", () => {
    expect(highlightParts("Logo Design Pack", "design")).toEqual([
      { text: "Logo ", match: false },
      { text: "Design", match: true },
      { text: " Pack", match: false },
    ]);
  });

  it("matches each word of the search on its own, wherever it is", () => {
    expect(matches("Design a logo for your brand", "logo design")).toEqual(["Design", "logo"]);
  });

  it("finds every occurrence", () => {
    expect(matches("desk lamp, desk chair", "desk")).toEqual(["desk", "desk"]);
  });

  it("prefers the longer word where two would match", () => {
    expect(matches("Designer wanted", "des design")).toEqual(["Design"]);
  });

  it("treats the search as plain text, not as a pattern", () => {
    expect(matches("Price (new) + tax", "(new)")).toEqual(["(new)"]);
    expect(() => highlightParts("a.b", "[")).not.toThrow();
    expect(matches("a.b and axb", "a.b")).toEqual(["a.b"]);
  });

  it("ignores one-letter words, which would light up everything", () => {
    expect(highlightParts("a cat sat", "a")).toEqual([{ text: "a cat sat", match: false }]);
  });

  it("leaves text alone when there is nothing to match, and copes with empty input", () => {
    expect(highlightParts("Hello", "")).toEqual([{ text: "Hello", match: false }]);
    expect(highlightParts("Hello", "zzz")).toEqual([{ text: "Hello", match: false }]);
    expect(highlightParts("", "hello")).toEqual([]);
  });

  it("joins back to the original text", () => {
    const text = "Scientific calculator (Casio fx-991)";

    expect(highlightParts(text, "calc casio 99").map((p) => p.text).join("")).toBe(text);
  });
});

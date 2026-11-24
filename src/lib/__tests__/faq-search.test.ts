import { describe, expect, it } from "vitest";
import { searchFaq } from "@/lib/faq-search";
import { faqItems } from "@/data/profile";

describe("searchFaq", () => {
  it("returns everything when nothing is typed", () => {
    expect(searchFaq(faqItems, "  ")).toHaveLength(faqItems.length);
  });
  it("needs every word, in the question or the answer", () => {
    expect(searchFaq(faqItems, "pickup point").map((f) => f.id)).toEqual(["faq2"]);
    expect(searchFaq(faqItems, "pickup banana")).toEqual([]);
  });
  it("ignores case", () => {
    expect(searchFaq(faqItems, "QR CODE").map((f) => f.id)).toEqual(["faq7"]);
  });
});

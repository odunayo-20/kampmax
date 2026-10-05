import { describe, expect, it } from "vitest";
import { insertBlock, insertLink, prefixLines, wrapSelection } from "../markdown-actions";

describe("wrapSelection", () => {
  it("wraps the selected text", () => {
    const r = wrapSelection("make this bold", 5, 9, "**", "**", "bold");
    expect(r.text).toBe("make **this** bold");
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe("this");
  });

  it("inserts a selected placeholder when nothing is selected", () => {
    const r = wrapSelection("", 0, 0, "_", "_", "italic");
    expect(r.text).toBe("_italic_");
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe("italic");
  });

  it("toggles off when the caret sits inside empty markers", () => {
    const r = wrapSelection("a ****b", 4, 4, "**", "**", "bold");
    expect(r.text).toBe("a b");
  });
});

describe("prefixLines", () => {
  it("prefixes every selected line", () => {
    const r = prefixLines("one\ntwo\nthree", 0, 7, "- ");
    expect(r.text).toBe("- one\n- two\nthree");
  });

  it("removes the prefix when every line already has it", () => {
    const r = prefixLines("- one\n- two", 0, 11, "- ");
    expect(r.text).toBe("one\ntwo");
  });

  it("numbers lines for ordered lists", () => {
    const r = prefixLines("a\nb", 0, 3, "", true);
    expect(r.text).toBe("1. a\n2. b");
  });

  it("only touches the caret's line when nothing is selected", () => {
    const r = prefixLines("first\nsecond\nthird", 8, 8, "## ");
    expect(r.text).toBe("first\n## second\nthird");
  });
});

describe("insertLink", () => {
  it("wraps the selection and selects the URL", () => {
    const r = insertLink("visit Kampmax today", 6, 13);
    expect(r.text).toBe("visit [Kampmax](https://) today");
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe("https://");
  });
});

describe("insertBlock", () => {
  it("separates the block from surrounding text with blank lines", () => {
    const r = insertBlock("before\nafter", 7, 7, "![alt](https://x.test/a.png)");
    expect(r.text).toBe("before\n\n![alt](https://x.test/a.png)\n\nafter");
  });

  it("adds no leading blank lines at the start of the document", () => {
    const r = insertBlock("", 0, 0, "> [!TIP] Tip");
    expect(r.text).toBe("> [!TIP] Tip");
  });
});

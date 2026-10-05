import { describe, expect, it } from "vitest";
import { parseEmbedUrl, parseStoredEmbedSrc } from "../embed-utils";
import {
  countImagesMissingAlt,
  countWords,
  findHeadingIssues,
  isExternalUrl,
  normalizeLinkUrl,
  validateImageFile,
} from "../content-utils";

describe("parseEmbedUrl", () => {
  const yt = "dQw4w9WgXcQ";
  it.each([
    `https://www.youtube.com/watch?v=${yt}`,
    `https://youtube.com/watch?v=${yt}&t=42s`,
    `https://m.youtube.com/watch?v=${yt}`,
    `https://youtu.be/${yt}`,
    `https://www.youtube.com/embed/${yt}`,
    `https://www.youtube.com/shorts/${yt}`,
    `youtube.com/watch?v=${yt}`,
  ])("recognises YouTube link %s", (link) => {
    expect(parseEmbedUrl(link)).toEqual({
      provider: "youtube",
      id: yt,
      src: `https://www.youtube-nocookie.com/embed/${yt}`,
    });
  });

  it.each([
    ["https://vimeo.com/76979871", "76979871"],
    ["https://vimeo.com/channels/staffpicks/76979871", "76979871"],
    ["https://player.vimeo.com/video/76979871", "76979871"],
  ])("recognises Vimeo link %s", (link, id) => {
    expect(parseEmbedUrl(link)).toEqual({ provider: "vimeo", id, src: `https://player.vimeo.com/video/${id}` });
  });

  it.each([
    "",
    "not a url",
    "https://evil.test/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch",
    "https://www.youtube.com/channel/UC123",
    "https://vimeo.com/about",
    "https://user:pw@www.youtube.com/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
  ])("refuses %s", (link) => {
    expect(parseEmbedUrl(link)).toBeNull();
  });

  it("reads back a stored embed src and refuses anything else", () => {
    expect(parseStoredEmbedSrc("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")?.provider).toBe("youtube");
    expect(parseStoredEmbedSrc("https://player.vimeo.com/video/76979871")?.provider).toBe("vimeo");
    expect(parseStoredEmbedSrc("https://evil.test/embed/dQw4w9WgXcQ")).toBeNull();
    expect(parseStoredEmbedSrc("http://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")).toBeNull();
    expect(parseStoredEmbedSrc(null)).toBeNull();
  });
});

describe("normalizeLinkUrl", () => {
  it("adds https:// to bare domains", () => {
    expect(normalizeLinkUrl("kampmax.com/jobs")).toEqual({ url: "https://kampmax.com/jobs" });
  });
  it("accepts http(s), mailto, tel, relative paths and anchors", () => {
    expect(normalizeLinkUrl("https://a.test/x")).toEqual({ url: "https://a.test/x" });
    expect(normalizeLinkUrl("mailto:hi@kampmax.com")).toEqual({ url: "mailto:hi@kampmax.com" });
    expect(normalizeLinkUrl("tel:+2348000000000")).toEqual({ url: "tel:+2348000000000" });
    expect(normalizeLinkUrl("/marketplace")).toEqual({ url: "/marketplace" });
    expect(normalizeLinkUrl("#section")).toEqual({ url: "#section" });
  });
  it.each(["", "javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "vbscript:x", "file:///etc/passwd", "ftp://a.test", "not valid", "http://nodot"])(
    "refuses %s",
    (value) => {
      expect(normalizeLinkUrl(value)).toHaveProperty("error");
    }
  );
  it("tells external from internal links", () => {
    expect(isExternalUrl("https://a.test")).toBe(true);
    expect(isExternalUrl("/jobs")).toBe(false);
    expect(isExternalUrl("mailto:a@b.co")).toBe(false);
  });
});

describe("content checks", () => {
  it("counts images missing alt text", () => {
    expect(countImagesMissingAlt('<img src="a.png" alt=""><img src="b.png"><img src="c.png" alt="Real"><img src="d.png" alt="Describe the image">')).toBe(3);
    expect(countImagesMissingAlt("<p>none</p>")).toBe(0);
  });

  it("flags heading order problems", () => {
    expect(findHeadingIssues("<h2>a</h2><h3>b</h3><h2>c</h2>")).toEqual([]);
    expect(findHeadingIssues("<h3>a</h3>")[0]).toMatch(/Heading 2/);
    expect(findHeadingIssues("<h2>a</h2><h4>b</h4>")[0]).toMatch(/Heading 2 is followed by Heading 4/);
  });

  it("counts words in visible text only", () => {
    expect(countWords("<h2>Two words</h2><p>and <strong>three</strong> more&nbsp;here</p><script>x y z</script>")).toBe(6);
    expect(countWords("")).toBe(0);
  });
});

describe("validateImageFile", () => {
  const file = (type: string, size = 1000) => new File([new Uint8Array(size)], "x", { type });
  it("accepts supported image types under the limit", () => {
    expect(validateImageFile(file("image/png"))).toBeNull();
    expect(validateImageFile(file("image/webp"))).toBeNull();
  });
  it("rejects other types and oversized files with a clear message", () => {
    expect(validateImageFile(file("application/pdf"))).toMatch(/JPG, PNG, WebP or GIF/);
    expect(validateImageFile(file("image/svg+xml"))).toMatch(/JPG, PNG, WebP or GIF/);
    expect(validateImageFile(file("image/png", 11 * 1024 * 1024))).toMatch(/10 MB/);
  });
});

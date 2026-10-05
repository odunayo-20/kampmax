// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import { DOMParser as PMParser, DOMSerializer } from "@tiptap/pm/model";
import { createExtensions } from "../extensions";

const schema = getSchema(createExtensions("Write…"));

/** Parse HTML with the editor schema and serialize it back (what load → save does). */
function roundTrip(html: string): string {
  const dom = new window.DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body;
  const doc = PMParser.fromSchema(schema).parse(dom);
  const out = document.createElement("div");
  out.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content, { document }));
  return out.innerHTML;
}

describe("editor schema: content that must survive a save and reload", () => {
  it("formatting marks", () => {
    const out = roundTrip("<p><strong>b</strong><em>i</em><u>u</u><s>s</s><code>c</code></p>");
    for (const tag of ["<strong>b</strong>", "<em>i</em>", "<u>u</u>", "<s>s</s>", "<code>c</code>"]) expect(out).toContain(tag);
  });

  it("headings 2–4", () => {
    const out = roundTrip("<h2>a</h2><h3>b</h3><h4>c</h4>");
    expect(out).toBe("<h2>a</h2><h3>b</h3><h4>c</h4>");
  });

  it("nested ordered and unordered lists", () => {
    const html = "<ul><li><p>a</p><ul><li><p>nested</p></li></ul></li></ul><ol><li><p>one</p></li></ol>";
    expect(roundTrip(html)).toBe(html);
  });

  it("task lists with checked state", () => {
    const out = roundTrip('<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span></span></label><div><p>Done</p></div></li></ul>');
    expect(out).toContain('data-type="taskList"');
    expect(out).toContain('data-checked="true"');
    expect(out).toContain("Done");
  });

  it("blockquote, divider and code block", () => {
    const out = roundTrip("<blockquote><p>q</p></blockquote><hr><pre><code>x = 1</code></pre>");
    expect(out).toContain("<blockquote><p>q</p></blockquote>");
    expect(out).toContain("<hr>");
    expect(out).toContain("<pre><code>x = 1</code></pre>");
  });

  it("text alignment", () => {
    expect(roundTrip('<p style="text-align: center">x</p>')).toContain('style="text-align: center;"');
  });

  it("links keep their href and get a safe rel", () => {
    const out = roundTrip('<p><a href="https://example.com/x">link</a></p>');
    expect(out).toContain('href="https://example.com/x"');
    expect(out).toContain("noopener noreferrer");
  });

  it("captioned images keep src, alt, caption, alignment and size", () => {
    const out = roundTrip(
      '<figure class="figure-right figure-md"><img src="https://res.cloudinary.com/x/a.jpg" alt="Students at OAU"><figcaption>Fresh<strong>ers</strong> week</figcaption></figure>'
    );
    expect(out).toContain('class="figure-right figure-md"');
    expect(out).toContain('src="https://res.cloudinary.com/x/a.jpg"');
    expect(out).toContain('alt="Students at OAU"');
    expect(out).toContain("<figcaption>Fresh<strong>ers</strong> week</figcaption>");
  });

  it("an image without a caption loads (the server drops empty captions)", () => {
    const out = roundTrip(
      '<p>a</p><figure class="figure-right figure-full"><img src="https://res.cloudinary.com/x/a.webp" alt="great" loading="lazy"></figure><p>b</p>'
    );
    expect(out).toContain('src="https://res.cloudinary.com/x/a.webp"');
    expect(out).toContain('alt="great"');
    expect(out).toContain("<p>b</p>");
  });

  it("callouts keep their variant and inner blocks", () => {
    const out = roundTrip('<aside class="callout callout-warning"><p>Careful</p><ul><li><p>a</p></li></ul></aside>');
    expect(out).toContain('class="callout callout-warning"');
    expect(out).toContain("<ul>");
  });

  it("approved embeds", () => {
    const yt = roundTrip('<figure class="embed"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe></figure>');
    expect(yt).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    const vimeo = roundTrip('<figure class="embed"><iframe src="https://player.vimeo.com/video/76979871"></iframe></figure>');
    expect(vimeo).toContain("player.vimeo.com/video/76979871");
  });

  it("is stable: a second round trip changes nothing", () => {
    const once = roundTrip(
      '<h2>T</h2><p>x <a href="https://a.test">l</a></p><figure class="figure-center figure-full"><img src="https://a.test/i.png" alt="A"><figcaption>c</figcaption></figure><aside class="callout callout-tip"><p>t</p></aside>'
    );
    expect(roundTrip(once)).toBe(once);
  });
});

describe("editor schema: unsafe or unsupported content is dropped on parse", () => {
  it("scripts, styles and event handlers never enter the document", () => {
    const out = roundTrip('<p onclick="alert(1)">hi</p><script>alert(1)</script><style>p{}</style><img src=x onerror=alert(1)>');
    expect(out).not.toMatch(/<script|<style|onclick|onerror|<img/i);
    expect(out).toContain("hi");
  });

  it("unapproved iframes and embeds are refused", () => {
    for (const src of ["https://evil.test/embed/abcdefghijk", "javascript:alert(1)", "https://www.youtube.com.evil.test/embed/dQw4w9WgXcQ"]) {
      expect(roundTrip(`<figure class="embed"><iframe src="${src}"></iframe></figure>`)).not.toMatch(/iframe/i);
      expect(roundTrip(`<iframe src="${src}"></iframe>`)).not.toMatch(/iframe/i);
    }
  });

  it("images with data: or script URLs are refused (no base64 content)", () => {
    for (const src of ["data:image/png;base64,AAAA", "javascript:alert(1)", "//evil.test/a.png"]) {
      expect(roundTrip(`<figure class="figure-center figure-full"><img src="${src}" alt="x"></figure>`)).not.toMatch(/<img|src=/i);
    }
  });

  it("bare inline <img> from pasted web pages is not kept", () => {
    expect(roundTrip('<p>text <img src="https://a.test/x.png" alt="x"></p>')).not.toContain("<img");
  });

  it("an H1 is not a valid heading level", () => {
    expect(roundTrip("<h1>Title</h1>")).not.toContain("<h1");
  });

  it("javascript: links are not kept as links", () => {
    expect(roundTrip('<p><a href="javascript:alert(1)">x</a></p>')).not.toMatch(/javascript:/i);
  });
});

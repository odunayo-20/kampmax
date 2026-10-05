import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { CaptionedImage } from "./CaptionedImage";
import { Callout } from "./Callout";
import { Embed } from "./Embed";

/**
 * The editor's schema. Anything not listed here cannot exist in a document:
 * pasted scripts, iframes, styles and unknown tags are discarded on parse.
 * H1 is deliberately absent (the article title is the page's only H1).
 * Keep this in step with the backend allow-list in blog-content.ts.
 */
export function createExtensions(placeholder: string): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        protocols: ["mailto", "tel"],
        HTMLAttributes: { rel: "noopener noreferrer nofollow ugc" },
      },
    }),
    TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right"] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({
      placeholder: ({ node }) => (node.type.name === "captionedImage" ? "Add a caption (optional)" : placeholder),
    }),
    CaptionedImage,
    Embed,
    Callout,
  ];
}

"use client";

import { useState } from "react";
import { Node } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { AlignCenter, AlignLeft, AlignRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ImageAlign = "left" | "center" | "right";
export type ImageSize = "sm" | "md" | "lg" | "full";

const ALIGNS: { value: ImageAlign; label: string; Icon: typeof AlignLeft }[] = [
  { value: "left", label: "Align left", Icon: AlignLeft },
  { value: "center", label: "Align center", Icon: AlignCenter },
  { value: "right", label: "Align right", Icon: AlignRight },
];

const SIZES: { value: ImageSize; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "full", label: "Full width" },
];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    captionedImage: {
      insertCaptionedImage: (attrs: { src: string; alt?: string }) => ReturnType;
    };
  }
}

/** Only http(s) or site-relative image sources are ever accepted (no data: URIs). */
export function isSafeImageSrc(src: string): boolean {
  return /^https?:\/\//i.test(src) || (src.startsWith("/") && !src.startsWith("//"));
}

function readClass<T extends string>(el: HTMLElement, prefix: string, allowed: readonly T[], fallback: T): T {
  for (const value of allowed) if (el.classList.contains(`${prefix}-${value}`)) return value;
  return fallback;
}

function CaptionedImageView({ node, updateAttributes, deleteNode, selected, editor, getPos }: NodeViewProps) {
  const { src, alt, align, size } = node.attrs as { src: string; alt: string; align: ImageAlign; size: ImageSize };
  const missingAlt = !String(alt ?? "").trim();
  const editable = editor.isEditable;
  // Stay open while focus is inside the panel (typing alt text deselects the node).
  const [focusWithin, setFocusWithin] = useState(false);
  const showPanel = editable && (selected || missingAlt || focusWithin);

  return (
    <NodeViewWrapper
      as="figure"
      className={cn("rte-figure", `figure-${align}`, `figure-${size}`, selected && "rte-figure-selected")}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={(e: React.FocusEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as HTMLElement | null)) setFocusWithin(false);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        contentEditable={false}
        onClick={() => {
          const pos = getPos();
          if (typeof pos === "number") editor.commands.setNodeSelection(pos);
        }}
      />
      <NodeViewContent as={"figcaption" as unknown as "div"} />
      {showPanel && (
        <div contentEditable={false} className="rte-image-panel">
          <div className="rte-image-field">
            <label htmlFor={`alt-${getPos()}`}>Alt text {missingAlt && <span className="rte-required">required to publish</span>}</label>
            <input
              id={`alt-${getPos()}`}
              type="text"
              value={alt ?? ""}
              maxLength={250}
              placeholder="Describe the image for people who can't see it"
              onChange={(e) => updateAttributes({ alt: e.target.value })}
            />
          </div>
          <div className="rte-image-controls">
            <div role="group" aria-label="Image alignment" className="rte-segment">
              {ALIGNS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={align === value}
                  onClick={() => updateAttributes({ align: value })}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                </button>
              ))}
            </div>
            <label className="rte-select">
              <span className="sr-only">Image size</span>
              <select value={size} onChange={(e) => updateAttributes({ size: e.target.value })}>
                {SIZES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="rte-danger" onClick={() => deleteNode()}>
              <Trash2 aria-hidden className="h-4 w-4" /> Remove image
            </button>
          </div>
          <p className="rte-hint">Click below the image to add a caption.</p>
        </div>
      )}
    </NodeViewWrapper>
  );
}

/**
 * A block image with an editable caption. Stored as
 * `<figure class="figure-center figure-md"><img alt="…"><figcaption>…</figcaption></figure>`,
 * using classes (not inline styles) so the backend sanitizer can allow-list them.
 */
export const CaptionedImage = Node.create({
  name: "captionedImage",
  group: "block",
  content: "inline*",
  isolating: true,
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      align: { default: "center" },
      size: { default: "full" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure",
        // Captions are optional (the server drops empty ones), so fall back to an empty element.
        contentElement: (node) => (node as HTMLElement).querySelector("figcaption") ?? document.createElement("figcaption"),
        getAttrs: (node) => {
          const el = node as HTMLElement;
          if (el.classList.contains("embed")) return false;
          const img = el.querySelector("img");
          const src = img?.getAttribute("src");
          if (!img || !src || !isSafeImageSrc(src)) return false;
          return {
            src,
            alt: img.getAttribute("alt") ?? "",
            align: readClass(el, "figure", ["left", "center", "right"] as const, "center"),
            size: readClass(el, "figure", ["sm", "md", "lg", "full"] as const, "full"),
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, alt, align, size } = node.attrs;
    return ["figure", { class: `figure-${align} figure-${size}` }, ["img", { src, alt }], ["figcaption", 0]];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CaptionedImageView);
  },

  addCommands() {
    return {
      insertCaptionedImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { alt: "", ...attrs } }),
    };
  },
});

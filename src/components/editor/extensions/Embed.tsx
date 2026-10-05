"use client";

import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Trash2, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMBED_PROVIDER_LABEL, parseStoredEmbedSrc, type EmbedProvider } from "../embed-utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embed: {
      insertEmbed: (attrs: { provider: EmbedProvider; src: string }) => ReturnType;
    };
  }
}

/**
 * The editor shows a lightweight card instead of loading the third-party
 * player (faster, and no tracking while editing). Readers get the real,
 * sandboxed iframe from the sanitized article HTML.
 */
function EmbedView({ node, selected, deleteNode, editor }: NodeViewProps) {
  const provider = node.attrs.provider as EmbedProvider;
  return (
    <NodeViewWrapper className={cn("rte-embed", selected && "rte-embed-selected")} data-drag-handle>
      <div contentEditable={false} className="rte-embed-card">
        <Video aria-hidden className="h-5 w-5" />
        <div className="rte-embed-meta">
          <strong>{EMBED_PROVIDER_LABEL[provider] ?? "Video"} video</strong>
          <span>Plays on the published article</span>
        </div>
        {editor.isEditable && (
          <button type="button" className="rte-danger" onClick={() => deleteNode()}>
            <Trash2 aria-hidden className="h-4 w-4" /> Remove
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
}

/** Approved-provider video embed. Stored as `<figure class="embed"><iframe src="…"></iframe></figure>`. */
export const Embed = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return { provider: { default: "youtube" }, src: { default: null } };
  },

  parseHTML() {
    return [
      {
        tag: "figure.embed",
        priority: 70,
        getAttrs: (node) => {
          const parsed = parseStoredEmbedSrc((node as HTMLElement).querySelector("iframe")?.getAttribute("src"));
          return parsed ? { provider: parsed.provider, src: parsed.src } : false;
        },
      },
    ];
  },

  renderHTML({ node }) {
    const label = EMBED_PROVIDER_LABEL[node.attrs.provider as EmbedProvider] ?? "Video";
    return [
      "figure",
      { class: "embed" },
      ["iframe", { src: node.attrs.src, title: `${label} video`, allowfullscreen: "true" }],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedView);
  },

  addCommands() {
    return {
      insertEmbed:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

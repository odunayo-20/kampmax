import { Node } from "@tiptap/core";

export type CalloutVariant = "note" | "tip" | "warning";
export const CALLOUT_VARIANTS: { value: CalloutVariant; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "tip", label: "Tip" },
  { value: "warning", label: "Warning" },
];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      toggleCallout: (variant?: CalloutVariant) => ReturnType;
      setCalloutVariant: (variant: CalloutVariant) => ReturnType;
    };
  }
}

/** Highlighted info block. Stored as `<aside class="callout callout-tip">…</aside>`. */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "note",
        parseHTML: (el) => /\bcallout-(tip|warning)\b/.exec(el.className)?.[1] ?? "note",
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "aside.callout" }];
  },

  renderHTML({ node }) {
    return ["aside", { class: `callout callout-${node.attrs.variant}` }, 0];
  },

  addCommands() {
    return {
      toggleCallout:
        (variant = "note") =>
        ({ commands, editor }) =>
          editor.isActive(this.name) ? commands.lift(this.name) : commands.wrapIn(this.name, { variant }),
      setCalloutVariant:
        (variant) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { variant }),
    };
  },
});

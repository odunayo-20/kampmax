"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  FileCode,
  IndentDecrease,
  IndentIncrease,
  Info,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CALLOUT_VARIANTS, type CalloutVariant } from "./extensions/Callout";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl+";

interface ToolButtonProps {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** Show the label next to the icon on wider screens (for the main insert actions). */
  showLabel?: boolean;
  children: React.ReactNode;
}

function ToolButton({ label, shortcut, active, disabled, onClick, showLabel, children }: ToolButtonProps) {
  const tooltip = shortcut ? `${label} (${shortcut})` : label;
  return (
    <button
      type="button"
      title={tooltip}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      // Keep the editor selection while clicking toolbar buttons.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue disabled:cursor-not-allowed disabled:opacity-40",
        active ? "bg-primary-100 text-primary-700" : "text-kampmax-text-secondary hover:bg-kampmax-muted hover:text-kampmax-text"
      )}
    >
      {children}
      {showLabel && <span className="hidden text-xs font-medium lg:inline">{label}</span>}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex max-w-full flex-wrap items-center gap-0.5 border-r border-kampmax-border pr-1.5 last:border-r-0 last:pr-0 [&:not(:first-child)]:pl-1.5">
      {children}
    </div>
  );
}

const BLOCK_STYLES = [
  { value: "paragraph", label: "Paragraph" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "h4", label: "Heading 4" },
] as const;

export interface ToolbarActions {
  openLink: () => void;
  pickImage: () => void;
  openEmbed: () => void;
}

interface EditorToolbarProps extends ToolbarActions {
  editor: Editor;
  disabled?: boolean;
}

export function EditorToolbar({ editor, disabled, openLink, pickImage, openEmbed }: EditorToolbarProps) {
  const s = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      block: ed.isActive("heading", { level: 2 })
        ? "h2"
        : ed.isActive("heading", { level: 3 })
          ? "h3"
          : ed.isActive("heading", { level: 4 })
            ? "h4"
            : "paragraph",
      bold: ed.isActive("bold"),
      italic: ed.isActive("italic"),
      underline: ed.isActive("underline"),
      strike: ed.isActive("strike"),
      code: ed.isActive("code"),
      bullet: ed.isActive("bulletList"),
      ordered: ed.isActive("orderedList"),
      task: ed.isActive("taskList"),
      quote: ed.isActive("blockquote"),
      codeBlock: ed.isActive("codeBlock"),
      callout: ed.isActive("callout"),
      calloutVariant: (ed.getAttributes("callout").variant as CalloutVariant | undefined) ?? "note",
      link: ed.isActive("link"),
      alignLeft: ed.isActive({ textAlign: "left" }),
      alignCenter: ed.isActive({ textAlign: "center" }),
      alignRight: ed.isActive({ textAlign: "right" }),
      inList: ed.isActive("listItem") || ed.isActive("taskItem"),
      canUndo: ed.can().undo(),
      canRedo: ed.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();
  const off = !!disabled;

  function setBlock(value: string) {
    if (value === "paragraph") chain().setParagraph().run();
    else chain().toggleHeading({ level: Number(value.slice(1)) as 2 | 3 | 4 }).run();
  }

  const listItemType = editor.isActive("taskItem") ? "taskItem" : "listItem";

  return (
    <div role="toolbar" aria-label="Text formatting" aria-orientation="horizontal" className="z-10 md:sticky md:top-14 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-t-lg border-b border-kampmax-border bg-white px-2 py-1.5">
      <Group label="History">
        <ToolButton label="Undo" shortcut={`${MOD}Z`} disabled={off || !s.canUndo} onClick={() => chain().undo().run()}>
          <Undo2 aria-hidden className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Redo" shortcut={`${MOD}${isMac ? "⇧Z" : "Y"}`} disabled={off || !s.canRedo} onClick={() => chain().redo().run()}>
          <Redo2 aria-hidden className="h-4 w-4" />
        </ToolButton>
      </Group>

      <Group label="Text style">
        <label className="shrink-0">
          <span className="sr-only">Paragraph style</span>
          <select
            value={s.block}
            disabled={off}
            title="Paragraph style. The article title is Heading 1, so sections start at Heading 2."
            onChange={(e) => setBlock(e.target.value)}
            className="h-9 rounded-md border border-kampmax-border bg-white px-2 text-sm text-kampmax-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue disabled:opacity-40"
          >
            {BLOCK_STYLES.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <ToolButton label="Bold" shortcut={`${MOD}B`} active={s.bold} disabled={off} onClick={() => chain().toggleBold().run()}>
          <Bold aria-hidden className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Italic" shortcut={`${MOD}I`} active={s.italic} disabled={off} onClick={() => chain().toggleItalic().run()}>
          <Italic aria-hidden className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Underline" shortcut={`${MOD}U`} active={s.underline} disabled={off} onClick={() => chain().toggleUnderline().run()}>
          <Underline aria-hidden className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Strikethrough" shortcut={`${MOD}⇧S`} active={s.strike} disabled={off} onClick={() => chain().toggleStrike().run()}>
          <Strikethrough aria-hidden className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Inline code" shortcut={`${MOD}E`} active={s.code} disabled={off} onClick={() => chain().toggleCode().run()}>
          <Code aria-hidden className="h-4 w-4" />
        </ToolButton>
      </Group>

      <Group label="Lists and blocks">
        <ToolButton label="Bulleted list" active={s.bullet} disabled={off} onClick={() => chain().toggleBulletList().run()}>
          <List aria-hidden className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Numbered list" active={s.ordered} disabled={off} onClick={() => chain().toggleOrderedList().run()}>
          <ListOrdered aria-hidden className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Checklist" active={s.task} disabled={off} onClick={() => chain().toggleTaskList().run()}>
          <ListChecks aria-hidden className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Indent list item" shortcut="Tab" disabled={off || !s.inList} onClick={() => chain().sinkListItem(listItemType).run()}>
          <IndentIncrease aria-hidden className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Outdent list item" shortcut="Shift+Tab" disabled={off || !s.inList} onClick={() => chain().liftListItem(listItemType).run()}>
          <IndentDecrease aria-hidden className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Quote" active={s.quote} disabled={off} onClick={() => chain().toggleBlockquote().run()}>
          <Quote aria-hidden className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Callout box" active={s.callout} disabled={off} onClick={() => chain().toggleCallout().run()}>
          <Info aria-hidden className="h-4 w-4" />
        </ToolButton>
        {s.callout && (
          <label className="shrink-0">
            <span className="sr-only">Callout type</span>
            <select
              value={s.calloutVariant}
              disabled={off}
              onChange={(e) => chain().setCalloutVariant(e.target.value as CalloutVariant).run()}
              className="h-9 rounded-md border border-kampmax-border bg-white px-2 text-sm text-kampmax-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue"
            >
              {CALLOUT_VARIANTS.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <ToolButton label="Code block" active={s.codeBlock} disabled={off} onClick={() => chain().toggleCodeBlock().run()}>
          <FileCode aria-hidden className="h-4 w-4" />
        </ToolButton>
      </Group>

      <Group label="Alignment">
        <ToolButton label="Align left" active={s.alignLeft} disabled={off} onClick={() => chain().setTextAlign("left").run()}>
          <AlignLeft aria-hidden className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Align center" active={s.alignCenter} disabled={off} onClick={() => chain().setTextAlign("center").run()}>
          <AlignCenter aria-hidden className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Align right" active={s.alignRight} disabled={off} onClick={() => chain().setTextAlign("right").run()}>
          <AlignRight aria-hidden className="h-4 w-4" />
        </ToolButton>
      </Group>

      <Group label="Insert">
        <ToolButton label="Link" shortcut={`${MOD}K`} active={s.link} showLabel disabled={off} onClick={openLink}>
          <Link2 aria-hidden className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Image" showLabel disabled={off} onClick={pickImage}>
          <ImagePlus aria-hidden className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Video" showLabel disabled={off} onClick={openEmbed}>
          <Video aria-hidden className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Divider" showLabel disabled={off} onClick={() => chain().setHorizontalRule().run()}>
          <Minus aria-hidden className="h-4 w-4" />
        </ToolButton>
      </Group>
    </div>
  );
}

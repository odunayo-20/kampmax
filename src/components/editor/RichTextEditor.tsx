"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { validateImageFile, IMAGE_UPLOAD_TYPES } from "./content-utils";
import { EmbedDialog } from "./EmbedDialog";
import { EditorSkeleton } from "./EditorSkeleton";
import { EditorStatus } from "./EditorStatus";
import { EditorToolbar } from "./EditorToolbar";
import { createExtensions } from "./extensions";
import { LinkDialog } from "./LinkDialog";
import type { ParsedEmbed } from "./embed-utils";

export interface RichTextEditorProps {
  /** HTML. Changing it from outside (e.g. restoring a draft) replaces the document. */
  value: string;
  /** Called with sanitized-on-save HTML; an empty document is reported as "". */
  onChange: (html: string) => void;
  /** Uploads through the platform's media service and returns the stored URL. */
  onUploadImage: (file: File) => Promise<{ url: string }>;
  /** Plain-language, user-facing messages (upload failed, wrong file type, …). */
  onError: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Accessible name for the writing area. */
  label?: string;
  className?: string;
}

type DialogState = null | { type: "link"; url: string; from: number; to: number } | { type: "embed" };

/**
 * Reusable rich-text editor (Tiptap). It knows nothing about blogs: the host
 * supplies the image uploader and handles messages. Output is plain HTML that
 * the server sanitizes before storing; this component is never used to render
 * public content.
 */
export default function RichTextEditor({
  value,
  onChange,
  onUploadImage,
  onError,
  disabled,
  placeholder = "Start writing your article…",
  label = "Article content",
  className,
}: RichTextEditorProps) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [uploading, setUploading] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef(value);

  const extensions = useMemo(() => createExtensions(placeholder), [placeholder]);

  // Latest handlers for the long-lived editorProps callbacks.
  const handlers = useRef({ upload: async (_files: File[]) => {}, openLink: () => {} });

  const editor = useEditor({
    extensions,
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: "blog-prose rte-content",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
      },
      handlePaste: (_view, event) => {
        const files = [...(event.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
        if (files.length === 0) return false;
        event.preventDefault();
        void handlers.current.upload(files);
        return true;
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;
        const files = [...(event.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith("image/"));
        if (files.length === 0) return false;
        event.preventDefault();
        void handlers.current.upload(files);
        return true;
      },
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          handlers.current.openLink();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? "" : ed.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  // Keep the editable flag in sync.
  useEffect(() => {
    // false: toggling editability is not a content change, so it must not emit onUpdate.
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);

  // Replace the document when the host changes the value (not for our own edits).
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    // Deferred: node views render through React, which cannot flush while it is already rendering.
    const next = value || "";
    queueMicrotask(() => {
      if (!editor.isDestroyed) editor.commands.setContent(next, { emitUpdate: false });
    });
  }, [editor, value]);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!editor) return;
      for (const file of files) {
        const problem = validateImageFile(file);
        if (problem) {
          onError(problem);
          continue;
        }
        setUploading((n) => n + 1);
        try {
          const { url } = await onUploadImage(file);
          editor.chain().focus().insertCaptionedImage({ src: url, alt: "" }).run();
        } catch (error) {
          onError(error instanceof Error ? error.message : "The image upload failed. Try again.");
        } finally {
          setUploading((n) => n - 1);
        }
      }
    },
    [editor, onError, onUploadImage]
  );

  const openLink = useCallback(() => {
    if (!editor || disabled) return;
    // Remember the selection now: focus moves into the dialog, and the link must apply to what was selected.
    const { from, to } = editor.state.selection;
    setDialog({ type: "link", url: (editor.getAttributes("link").href as string | undefined) ?? "", from, to });
  }, [editor, disabled]);

  useEffect(() => {
    handlers.current = { upload: uploadFiles, openLink };
  }, [uploadFiles, openLink]);

  function saveLink(url: string) {
    if (!editor || dialog?.type !== "link") return;
    const { from, to } = dialog;
    const chain = editor.chain().focus().setTextSelection({ from, to });
    if (from === to && !editor.isActive("link")) {
      // Nothing selected: insert the address itself as the link text.
      chain.insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] }).run();
    } else {
      chain.extendMarkRange("link").setLink({ href: url }).run();
    }
    setDialog(null);
  }

  function removeLink() {
    if (!editor || dialog?.type !== "link") return;
    editor.chain().focus().setTextSelection({ from: dialog.from, to: dialog.to }).extendMarkRange("link").unsetLink().run();
    setDialog(null);
  }

  function insertEmbed(embed: ParsedEmbed) {
    editor?.chain().focus().insertEmbed({ provider: embed.provider, src: embed.src }).run();
    setDialog(null);
  }

  if (!editor) return <EditorSkeleton />;

  return (
    <div className={cn("rte rounded-lg border border-kampmax-border bg-white", className)}>
      <EditorToolbar
        editor={editor}
        disabled={disabled}
        openLink={openLink}
        pickImage={() => fileInput.current?.click()}
        openEmbed={() => setDialog({ type: "embed" })}
      />

      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_UPLOAD_TYPES.join(",")}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose images to insert"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) void uploadFiles(files);
        }}
      />

      <EditorContent editor={editor} className="rte-scroll" />

      <EditorStatus editor={editor} uploading={uploading} />

      {dialog?.type === "link" && <LinkDialog initialUrl={dialog.url} onSave={saveLink} onRemove={removeLink} onClose={() => setDialog(null)} />}
      {dialog?.type === "embed" && <EmbedDialog onInsert={insertEmbed} onClose={() => setDialog(null)} />}
    </div>
  );
}

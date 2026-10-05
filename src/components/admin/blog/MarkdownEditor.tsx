"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bold, Heading2, Heading3, Image as ImageIcon, Italic, Lightbulb, Link2, List, ListOrdered, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { blogAdminApi } from "@/services/admin/blog-management.api";
import { FIELD_CLASS } from "./blog-meta";
import { insertBlock, insertLink, prefixLines, wrapSelection, type EditResult } from "./markdown-actions";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}

function ToolButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-md text-kampmax-text-secondary hover:bg-kampmax-muted hover:text-kampmax-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/**
 * Markdown editor: a formatting toolbar over a textarea, plus a preview that
 * is rendered by the backend with the exact pipeline readers get, so what
 * you see is what is published (including sanitization).
 */
export function MarkdownEditor({ value, onChange, disabled, id = "article-content" }: MarkdownEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const debounced = useDebounce(value, 400);

  const preview = useQuery({
    queryKey: ["admin", "blog", "preview", debounced],
    queryFn: () => blogAdminApi.preview(debounced),
    enabled: tab === "preview" && debounced.trim().length > 0,
    staleTime: 60_000,
  });

  function apply(edit: (text: string, start: number, end: number) => EditResult) {
    const el = ref.current;
    if (!el) return;
    const result = edit(el.value, el.selectionStart, el.selectionEnd);
    onChange(result.text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="rounded-lg border border-kampmax-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-kampmax-border px-2 py-1.5">
        <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center">
          <ToolButton label="Heading 2" disabled={disabled || tab !== "write"} onClick={() => apply((t, s, e) => prefixLines(t, s, e, "## "))}><Heading2 aria-hidden className="h-4 w-4" /></ToolButton>
          <ToolButton label="Heading 3" disabled={disabled || tab !== "write"} onClick={() => apply((t, s, e) => prefixLines(t, s, e, "### "))}><Heading3 aria-hidden className="h-4 w-4" /></ToolButton>
          <ToolButton label="Bold" disabled={disabled || tab !== "write"} onClick={() => apply((t, s, e) => wrapSelection(t, s, e, "**", "**", "bold text"))}><Bold aria-hidden className="h-4 w-4" /></ToolButton>
          <ToolButton label="Italic" disabled={disabled || tab !== "write"} onClick={() => apply((t, s, e) => wrapSelection(t, s, e, "_", "_", "italic text"))}><Italic aria-hidden className="h-4 w-4" /></ToolButton>
          <ToolButton label="Link" disabled={disabled || tab !== "write"} onClick={() => apply((t, s, e) => insertLink(t, s, e))}><Link2 aria-hidden className="h-4 w-4" /></ToolButton>
          <ToolButton label="Bulleted list" disabled={disabled || tab !== "write"} onClick={() => apply((t, s, e) => prefixLines(t, s, e, "- "))}><List aria-hidden className="h-4 w-4" /></ToolButton>
          <ToolButton label="Numbered list" disabled={disabled || tab !== "write"} onClick={() => apply((t, s, e) => prefixLines(t, s, e, "", true))}><ListOrdered aria-hidden className="h-4 w-4" /></ToolButton>
          <ToolButton label="Quote" disabled={disabled || tab !== "write"} onClick={() => apply((t, s, e) => prefixLines(t, s, e, "> "))}><Quote aria-hidden className="h-4 w-4" /></ToolButton>
          <ToolButton label="Tip callout" disabled={disabled || tab !== "write"} onClick={() => apply((t, s, e) => insertBlock(t, s, e, "> [!TIP] Your tip here"))}><Lightbulb aria-hidden className="h-4 w-4" /></ToolButton>
          <ToolButton label="Image" disabled={disabled || tab !== "write"} onClick={() => apply((t, s, e) => insertBlock(t, s, e, "![Describe the image](https://)"))}><ImageIcon aria-hidden className="h-4 w-4" /></ToolButton>
        </div>
        <div role="tablist" aria-label="Editor mode" className="flex rounded-md bg-kampmax-muted p-0.5 text-xs font-medium">
          {(["write", "preview"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={tab === mode}
              onClick={() => setTab(mode)}
              className={cn("rounded px-3 py-1.5 capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue", tab === mode ? "bg-white text-kampmax-text shadow-sm" : "text-kampmax-text-secondary")}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {tab === "write" ? (
        <>
          <label htmlFor={id} className="sr-only">Article content (Markdown)</label>
          <textarea
            ref={ref}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            spellCheck
            rows={22}
            placeholder={"Start writing…\n\nUse ## for section headings. Select text and use the toolbar to format it."}
            className={cn(FIELD_CLASS, "min-h-[28rem] resize-y rounded-none border-0 font-mono text-[13px] leading-6 focus:ring-0")}
          />
        </>
      ) : (
        <div className="min-h-[28rem] px-4 py-5" aria-live="polite">
          {!debounced.trim() ? (
            <p className="text-sm text-kampmax-text-muted">Nothing to preview yet.</p>
          ) : preview.isLoading || debounced !== value ? (
            <p className="text-sm text-kampmax-text-muted">Rendering preview…</p>
          ) : preview.isError ? (
            <p role="alert" className="text-sm text-kampmax-error">{preview.error instanceof Error ? preview.error.message : "Preview failed."}</p>
          ) : (
            // Backend-sanitized HTML (same pipeline as publishing).
            <div className="blog-prose" dangerouslySetInnerHTML={{ __html: preview.data?.html ?? "" }} />
          )}
        </div>
      )}

      <div className="flex justify-between border-t border-kampmax-border px-3 py-1.5 text-xs text-kampmax-text-muted">
        <span>Markdown supported. Raw HTML is shown as text.</span>
        <span>{wordCount.toLocaleString()} words</span>
      </div>
    </div>
  );
}

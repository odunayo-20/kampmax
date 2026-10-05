"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { countWordsInText, headingIssuesFromLevels } from "./content-utils";

/**
 * Footer with upload progress, word count and heading-order warning. It is a
 * separate component so it subscribes once the editor exists and is correct on
 * first render, not only after the first edit.
 */
export function EditorStatus({ editor, uploading }: { editor: Editor; uploading: number }) {
  const stats = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      const levels: number[] = [];
      ed.state.doc.descendants((node) => {
        if (node.type.name === "heading") levels.push(node.attrs.level as number);
      });
      return {
        words: countWordsInText(ed.state.doc.textBetween(0, ed.state.doc.content.size, " ")),
        issues: headingIssuesFromLevels(levels),
      };
    },
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-kampmax-border px-3 py-1.5 text-xs text-kampmax-text-muted">
        <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5">
          {uploading > 0 ? (
            <>
              <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> Uploading {uploading === 1 ? "image" : `${uploading} images`}…
            </>
          ) : (
            "Tip: drop or paste images straight into the article."
          )}
        </span>
        <span>{stats.words.toLocaleString()} words</span>
      </div>

      {stats.issues.length > 0 && (
        <p role="status" className="flex items-start gap-2 border-t border-warning-100 bg-warning-50 px-3 py-2 text-xs text-warning-700">
          <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Heading order: {stats.issues[0]}. A clear order helps readers and search engines.</span>
        </p>
      )}
    </>
  );
}

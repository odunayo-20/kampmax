"use client";

import { useState } from "react";
import { EMBED_PROVIDER_LABEL, parseEmbedUrl, type ParsedEmbed } from "./embed-utils";
import { DIALOG_INPUT, DIALOG_PRIMARY, DIALOG_SECONDARY, EditorDialog } from "./EditorDialog";

interface EmbedDialogProps {
  onInsert: (embed: ParsedEmbed) => void;
  onClose: () => void;
}

export function EmbedDialog({ onInsert, onClose }: EmbedDialogProps) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const parsed = parseEmbedUrl(value);
  const showError = submitted && !parsed;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (parsed) onInsert(parsed);
  }

  return (
    <EditorDialog title="Add a video" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <label htmlFor="embed-url" className="mb-1 block text-xs font-medium text-kampmax-text">
          Video link
        </label>
        <input
          id="embed-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSubmitted(false);
          }}
          placeholder="https://www.youtube.com/watch?v=…"
          className={DIALOG_INPUT}
          aria-invalid={showError}
          aria-describedby="embed-help"
        />
        <p id="embed-help" role={showError ? "alert" : "status"} className={showError ? "mt-1.5 text-xs text-kampmax-error" : "mt-1.5 text-xs text-kampmax-text-muted"}>
          {showError
            ? "Only YouTube and Vimeo links can be added."
            : parsed
              ? `${EMBED_PROVIDER_LABEL[parsed.provider]} video found.`
              : "Paste a YouTube or Vimeo link."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={DIALOG_SECONDARY}>
            Cancel
          </button>
          <button type="submit" className={DIALOG_PRIMARY}>
            Add video
          </button>
        </div>
      </form>
    </EditorDialog>
  );
}

"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { isExternalUrl, normalizeLinkUrl } from "./content-utils";
import { DIALOG_INPUT, DIALOG_PRIMARY, DIALOG_SECONDARY, EditorDialog } from "./EditorDialog";

interface LinkDialogProps {
  /** Current link target when editing an existing link. */
  initialUrl: string;
  onSave: (url: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function LinkDialog({ initialUrl, onSave, onRemove, onClose }: LinkDialogProps) {
  const [value, setValue] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const editing = initialUrl !== "";
  const preview = normalizeLinkUrl(value);
  const external = "url" in preview && isExternalUrl(preview.url);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = normalizeLinkUrl(value);
    if ("error" in result) return setError(result.error);
    onSave(result.url);
  }

  return (
    <EditorDialog title={editing ? "Edit link" : "Add link"} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <label htmlFor="link-url" className="mb-1 block text-xs font-medium text-kampmax-text">
          Web address
        </label>
        <input
          id="link-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="https://kampmax.com/jobs"
          className={DIALOG_INPUT}
          aria-invalid={!!error}
          aria-describedby="link-help"
        />
        <p id="link-help" role={error ? "alert" : undefined} className={error ? "mt-1.5 text-xs text-kampmax-error" : "mt-1.5 text-xs text-kampmax-text-muted"}>
          {error ?? (external ? "External links open in a new tab for readers." : "Links to other Kampmax pages can start with /, for example /marketplace.")}
        </p>
        {external && !error && (
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-kampmax-text-secondary">
            <ExternalLink aria-hidden className="h-3 w-3" /> Marked as an external link
          </p>
        )}
        <div className="mt-5 flex items-center justify-between gap-2">
          {editing ? (
            <button type="button" onClick={onRemove} className="text-sm font-medium text-kampmax-error hover:underline">
              Remove link
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={DIALOG_SECONDARY}>
              Cancel
            </button>
            <button type="submit" className={DIALOG_PRIMARY}>
              {editing ? "Update" : "Add link"}
            </button>
          </div>
        </div>
      </form>
    </EditorDialog>
  );
}

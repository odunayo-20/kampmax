"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { BlogApiValidationError } from "@/services/admin/blog-management.api";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, FIELD_CLASS, SLUG_PATTERN } from "./blog-meta";

export interface TaxonomyFormValues {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
}

interface TaxonomyFormDialogProps {
  /** "category" | "tag" — used in copy. */
  noun: string;
  mode: "create" | "edit";
  initial: TaxonomyFormValues;
  onSubmit: (values: TaxonomyFormValues) => Promise<void>;
  onClose: () => void;
}

/** Create/edit dialog shared by the category and tag managers. Keeps input on failure. */
export function TaxonomyFormDialog({ noun, mode, initial, onSubmit, onClose }: TaxonomyFormDialogProps) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string[]>([]);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const slugInvalid = values.slug.trim() !== "" && !SLUG_PATTERN.test(values.slug.trim());
  const nameInvalid = values.name.trim().length < 2;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (nameInvalid || slugInvalid) return;
    setSaving(true);
    setError([]);
    try {
      await onSubmit({ ...values, name: values.name.trim(), slug: values.slug.trim(), description: values.description.trim() });
    } catch (err) {
      setError(err instanceof BlogApiValidationError ? err.messages : [err instanceof Error ? err.message : "That didn't work. Try again."]);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="taxonomy-dialog-title">
      <button type="button" aria-label="Close" tabIndex={-1} className="absolute inset-0 bg-black/50" onClick={() => !saving && onClose()} />
      <form onSubmit={submit} className="relative w-full max-w-md rounded-xl border border-kampmax-border bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 id="taxonomy-dialog-title" className="text-base font-semibold text-kampmax-text">{mode === "create" ? `New ${noun}` : `Edit ${noun}`}</h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close dialog" className="-mr-1 rounded-md p-1 text-kampmax-text-secondary hover:bg-kampmax-muted"><X aria-hidden className="h-4 w-4" /></button>
        </div>

        {error.length > 0 && (
          <ul role="alert" className="mb-3 list-disc rounded-lg border border-kampmax-error/30 bg-error-50 py-2 pl-7 pr-3 text-sm text-error-700">
            {error.map((m) => <li key={m}>{m}</li>)}
          </ul>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="tx-name" className="mb-1 block text-xs font-medium text-kampmax-text">Name</label>
            <input ref={first} id="tx-name" value={values.name} maxLength={mode === "create" && noun === "tag" ? 60 : 80} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} className={FIELD_CLASS} required />
          </div>
          <div>
            <label htmlFor="tx-slug" className="mb-1 block text-xs font-medium text-kampmax-text">URL slug</label>
            <input id="tx-slug" value={values.slug} onChange={(e) => setValues((v) => ({ ...v, slug: e.target.value.toLowerCase() }))} placeholder={mode === "create" ? "Generated from the name" : undefined} className={FIELD_CLASS} aria-invalid={slugInvalid} />
            {slugInvalid && <p role="alert" className="mt-1 text-xs text-kampmax-error">Use lowercase letters and numbers separated by hyphens.</p>}
            {mode === "edit" && <p className="mt-1 text-xs text-kampmax-text-muted">Changing the slug changes the public page URL.</p>}
          </div>
          <div>
            <label htmlFor="tx-description" className="mb-1 block text-xs font-medium text-kampmax-text">Description (optional)</label>
            <textarea id="tx-description" value={values.description} maxLength={300} rows={2} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} className={FIELD_CLASS} />
          </div>
          <label className="flex items-center gap-2 text-sm text-kampmax-text">
            <input type="checkbox" checked={values.isActive} onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.checked }))} className="h-4 w-4 accent-kampmax-blue" />
            Active (available for new articles)
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className={BUTTON_SECONDARY}>Cancel</button>
          <button type="submit" disabled={saving || nameInvalid || slugInvalid} className={BUTTON_PRIMARY}>
            {saving && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            {mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

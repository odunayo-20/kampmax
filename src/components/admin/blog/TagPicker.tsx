"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useBlogTagMutations, useBlogTags } from "@/hooks/admin/use-admin-blog";
import { FIELD_CLASS } from "./blog-meta";
import { cn } from "@/lib/utils";

const MAX_TAGS = 10;

interface TagPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  canCreate: boolean;
  disabled?: boolean;
  onError: (message: string) => void;
}

/**
 * Reuses existing tags (no duplicates): type to filter, click to add. Typing a
 * name that doesn't exist offers to create it (needs the manage-tags permission).
 */
export function TagPicker({ selectedIds, onChange, canCreate, disabled, onError }: TagPickerProps) {
  const [input, setInput] = useState("");
  const tags = useBlogTags();
  const { create } = useBlogTagMutations();

  const all = tags.data?.items ?? [];
  const byId = new Map(all.map((t) => [t.id, t]));
  const query = input.trim().toLowerCase();
  const suggestions = all.filter((t) => t.isActive && !selectedIds.includes(t.id) && (!query || t.name.toLowerCase().includes(query))).slice(0, 8);
  const exact = all.find((t) => t.name.toLowerCase() === query);
  const atLimit = selectedIds.length >= MAX_TAGS;

  function add(id: string) {
    if (atLimit || selectedIds.includes(id)) return;
    onChange([...selectedIds, id]);
    setInput("");
  }

  async function createAndAdd() {
    try {
      const tag = await create.mutateAsync({ name: input.trim() });
      add(tag.id);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Couldn't create the tag.");
    }
  }

  return (
    <div>
      {selectedIds.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Selected tags">
          {selectedIds.map((id) => (
            <li key={id} className="inline-flex items-center gap-1 rounded-md bg-primary-100 py-1 pl-2.5 pr-1 text-xs font-medium text-primary-700">
              {byId.get(id)?.name ?? "Unavailable tag"}
              <button type="button" disabled={disabled} onClick={() => onChange(selectedIds.filter((x) => x !== id))} aria-label={`Remove tag ${byId.get(id)?.name ?? ""}`} className="flex h-5 w-5 items-center justify-center rounded hover:bg-primary-600/10">
                <X aria-hidden className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <label htmlFor="tag-picker-input" className="sr-only">Add a tag</label>
      <input
        id="tag-picker-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={disabled || atLimit}
        placeholder={atLimit ? `Up to ${MAX_TAGS} tags` : "Search or add a tag"}
        maxLength={60}
        className={FIELD_CLASS}
      />
      {(query || suggestions.length > 0) && !atLimit && (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {suggestions.map((t) => (
            <li key={t.id}>
              <button type="button" disabled={disabled} onClick={() => add(t.id)} className="rounded-md border border-kampmax-border bg-white px-2.5 py-1 text-xs text-kampmax-text hover:bg-kampmax-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue">
                {t.name}
              </button>
            </li>
          ))}
          {query && !exact && canCreate && (
            <li>
              <button type="button" disabled={disabled || create.isPending} onClick={() => void createAndAdd()} className={cn("inline-flex items-center gap-1 rounded-md border border-dashed border-kampmax-blue px-2.5 py-1 text-xs font-medium text-kampmax-blue hover:bg-primary-50")}>
                <Plus aria-hidden className="h-3 w-3" /> Create “{input.trim()}”
              </button>
            </li>
          )}
        </ul>
      )}
      {tags.isError && <p role="alert" className="mt-1 text-xs text-kampmax-error">Couldn&apos;t load tags.</p>}
    </div>
  );
}

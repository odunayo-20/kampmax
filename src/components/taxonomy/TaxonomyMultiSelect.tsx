"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategories } from "@/hooks/use-taxonomy";
import type { TaxonomyType } from "@/services/taxonomy";

interface Props {
  type: TaxonomyType;
  /** Selected category ids. */
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  max?: number;
  placeholder?: string;
  /** Only list nodes without children (e.g. skills under skill groups). */
  leafOnly?: boolean;
}

/**
 * Searchable multi-select over one taxonomy. Options are grouped under their
 * parent and filtered as the user types, so it stays usable with hundreds of
 * entries.
 */
export function TaxonomyMultiSelect({
  type,
  value,
  onChange,
  label,
  max,
  placeholder = "Search…",
  leafOnly = false,
}: Props) {
  const { categories, nameById, isLoading, isError } = useCategories(type);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => new Set(value), [value]);
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, { id: string; name: string }[]>();
    for (const node of categories) {
      if (leafOnly && node.hasChildren) continue;
      if (q && !node.name.toLowerCase().includes(q)) continue;
      const group = node.path[0] ?? (node.hasChildren ? node.name : "Other");
      map.set(group, [...(map.get(group) ?? []), { id: node.id, name: node.name }]);
    }
    return [...map.entries()];
  }, [categories, query, leafOnly]);

  const toggle = (id: string) => {
    if (selected.has(id)) return onChange(value.filter((v) => v !== id));
    if (max && value.length >= max) return;
    onChange([...value, id]);
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-kampmax-text">{label}</p>}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-800"
            >
              {nameById.get(id) ?? "…"}
              <button type="button" aria-label={`Remove ${nameById.get(id) ?? "item"}`} onClick={() => toggle(id)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kampmax-text-secondary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={label ?? "Search"}
          className="h-10 w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
        />
      </div>

      <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border border-neutral-200 p-3">
        {isLoading && <p className="text-sm text-kampmax-text-secondary">Loading…</p>}
        {isError && <p className="text-sm text-kampmax-error">Couldn&apos;t load options. Refresh to retry.</p>}
        {!isLoading && !isError && groups.length === 0 && (
          <p className="text-sm text-kampmax-text-secondary">No matches.</p>
        )}
        {groups.map(([group, items]) => (
          <div key={group}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-kampmax-text-secondary">{group}</p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((item) => {
                const on = selected.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(item.id)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      on
                        ? "border-primary-300 bg-primary-50 text-primary-700"
                        : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300"
                    )}
                  >
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {max && (
        <p className="text-xs text-kampmax-text-secondary">
          {value.length}/{max} selected
        </p>
      )}
    </div>
  );
}

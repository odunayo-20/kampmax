"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Lock, RotateCcw, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PermissionCatalogItem,
  RoleDetail,
} from "@/services/admin/permissions.api";

interface Props {
  role: RoleDetail;
  catalog: PermissionCatalogItem[];
  /** True when the signed-in operator may change roles (Super Admin). */
  canManage: boolean;
  saving: boolean;
  onSave: (slugs: string[]) => void;
  onReset: () => void;
}

function moduleLabel(module: string): string {
  return module
    .split(/[-_.]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Grouped checkbox editor for one role's permissions. */
export function RolePermissionsEditor({
  role,
  catalog,
  canManage,
  saving,
  onSave,
  onReset,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(role.granted)
  );
  const [filter, setFilter] = useState("");

  // Reload the draft whenever the saved role changes (after save/reset).
  useEffect(() => {
    setSelected(new Set(role.granted));
  }, [role.key, role.granted]);

  const editable = role.editable && canManage;
  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const map = new Map<string, PermissionCatalogItem[]>();
    for (const p of catalog) {
      if (q && !`${p.slug} ${p.name}`.toLowerCase().includes(q)) continue;
      const list = map.get(p.module) ?? [];
      list.push(p);
      map.set(p.module, list);
    }
    return [...map.entries()];
  }, [catalog, filter]);

  const granted = useMemo(() => new Set(role.granted), [role.granted]);
  const dirty =
    selected.size !== granted.size || [...selected].some((s) => !granted.has(s));

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function toggleGroup(items: PermissionCatalogItem[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of items) {
        if (p.reserved) continue;
        if (on) next.add(p.slug);
        else next.delete(p.slug);
      }
      return next;
    });
  }

  return (
    <section className="rounded-lg border border-kampmax-border bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-kampmax-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-kampmax-text">
            {role.name} · {selected.size}/{role.totalPermissions} permissions
          </h2>
          <p className="mt-0.5 text-xs text-kampmax-text-secondary">
            {role.description}
          </p>
        </div>
        {editable && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={onReset}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-60"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to defaults
            </button>
            <button
              type="button"
              disabled={saving || !dirty}
              onClick={() => onSave([...selected])}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-blue px-3 text-sm font-medium text-white transition-colors hover:bg-kampmax-blue/90 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save changes
            </button>
          </div>
        )}
      </header>

      {!editable && (
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-md border border-kampmax-border bg-kampmax-muted/40 px-3 py-2 text-xs text-kampmax-text-secondary">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {role.lockedReason ??
              "Only a Super Admin can change role permissions. You can view them here."}
          </span>
        </div>
      )}

      <div className="px-4 pt-4">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter permissions…"
          aria-label="Filter permissions"
          className="h-9 w-full rounded-lg border border-kampmax-border bg-white px-3 text-sm focus:border-kampmax-blue focus:outline-none focus:ring-1 focus:ring-kampmax-blue sm:w-72"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
        {groups.map(([module, items]) => {
          const on = items.filter((p) => selected.has(p.slug)).length;
          const selectable = items.filter((p) => !p.reserved);
          return (
            <fieldset
              key={module}
              className="rounded-lg border border-kampmax-border"
            >
              <legend className="sr-only">{moduleLabel(module)}</legend>
              <div className="flex items-center justify-between gap-2 border-b border-kampmax-border bg-kampmax-muted/40 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-kampmax-text-secondary">
                  {moduleLabel(module)}{" "}
                  <span className="tabular-nums">
                    ({on}/{items.length})
                  </span>
                </span>
                {editable && selectable.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      toggleGroup(items, on < selectable.length)
                    }
                    className="text-[11px] font-medium text-kampmax-blue hover:underline"
                  >
                    {on < selectable.length ? "Select all" : "Clear"}
                  </button>
                )}
              </div>
              <ul role="list" className="divide-y divide-kampmax-border/70">
                {items.map((p) => (
                  <li key={p.slug}>
                    <label
                      className={cn(
                        "flex items-start gap-2 px-3 py-2 text-sm",
                        editable && !p.reserved && "cursor-pointer hover:bg-kampmax-muted/30"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(p.slug)}
                        disabled={!editable || p.reserved}
                        onChange={() => toggle(p.slug)}
                        className="mt-0.5 h-4 w-4 rounded accent-kampmax-blue"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-xs text-kampmax-text">
                          {p.slug}
                        </span>
                        <span className="block truncate text-xs text-kampmax-text-secondary">
                          {p.reserved
                            ? "Reserved for Super Admin"
                            : p.name}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          );
        })}
      </div>
    </section>
  );
}

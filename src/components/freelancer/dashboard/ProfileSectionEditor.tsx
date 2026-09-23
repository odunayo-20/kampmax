"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { apiClient } from "@/lib/api-client";

export interface SectionField {
  key: string;
  label: string;
  type: "text" | "month" | "year" | "url" | "textarea" | "select" | "checkbox";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** Hidden (and sent as null) while this boolean field is checked. */
  hideWhenChecked?: string;
}

type Row = Record<string, unknown> & { id: string };
type FormValues = Record<string, string | boolean>;

function emptyValues(fields: SectionField[]): FormValues {
  return Object.fromEntries(
    fields.map((f) => [f.key, f.type === "checkbox" ? false : f.type === "select" ? f.options?.[0]?.value ?? "" : ""])
  );
}

function rowToValues(fields: SectionField[], row: Row): FormValues {
  return Object.fromEntries(
    fields.map((f) => {
      const v = row[f.key];
      return [f.key, f.type === "checkbox" ? Boolean(v) : v == null ? "" : String(v)];
    })
  );
}

export function ProfileSectionEditor({
  title,
  addLabel,
  path,
  fields,
  summarize,
}: {
  title: string;
  addLabel: string;
  path: string;
  fields: SectionField[];
  summarize: (row: Row) => { primary: string; secondary: string };
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [values, setValues] = useState<FormValues>(() => emptyValues(fields));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await apiClient.get<Row[]>(path);
    if (error) setLoadError(error.message || `Couldn't load ${title.toLowerCase()}.`);
    else {
      setLoadError(null);
      setRows(data ?? []);
    }
    setLoading(false);
  }, [path, title]);

  useEffect(() => {
    void load();
  }, [load]);

  function startAdd() {
    setValues(emptyValues(fields));
    setFormError(null);
    setEditingId("new");
  }

  function startEdit(row: Row) {
    setValues(rowToValues(fields, row));
    setFormError(null);
    setEditingId(row.id);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      const hidden = f.hideWhenChecked && values[f.hideWhenChecked] === true;
      const raw = values[f.key];
      if (f.type === "checkbox") {
        body[f.key] = raw === true;
        continue;
      }
      const text = typeof raw === "string" ? raw.trim() : "";
      if (f.required && !text && !hidden) {
        setFormError(`${f.label} is required.`);
        return;
      }
      body[f.key] = hidden || !text ? (f.required ? undefined : null) : text;
    }

    setSaving(true);
    setFormError(null);
    const { error } =
      editingId === "new"
        ? await apiClient.post(path, body)
        : await apiClient.patch(`${path}/${editingId}`, body);
    setSaving(false);
    if (error) {
      setFormError(error.message || "Couldn't save. Please try again.");
      return;
    }
    setEditingId(null);
    await load();
  }

  async function handleDelete(row: Row) {
    if (!window.confirm("Delete this entry?")) return;
    const { error } = await apiClient.delete(`${path}/${row.id}`);
    if (error) {
      setLoadError(error.message || "Couldn't delete. Please try again.");
      return;
    }
    await load();
  }

  return (
    <div className="rounded-xl border border-kampmax-border bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-kampmax-text">{title}</h2>
        {editingId === null && (
          <Button type="button" variant="outline" size="sm" onClick={startAdd}>
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            {addLabel}
          </Button>
        )}
      </div>

      {loadError && (
        <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {loading ? (
        <p className="mt-3 text-sm text-kampmax-text-secondary">Loading...</p>
      ) : (
        <ul className="mt-3 divide-y divide-kampmax-border">
          {rows.length === 0 && editingId === null && (
            <li className="py-3 text-sm text-kampmax-text-secondary">Nothing added yet.</li>
          )}
          {rows.map((row) => {
            const s = summarize(row);
            return (
              <li key={row.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-kampmax-text">{s.primary}</p>
                  <p className="truncate text-xs text-kampmax-text-secondary">{s.secondary}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(row)}
                    aria-label="Edit"
                    className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(row)}
                    aria-label="Delete"
                    className="rounded-md p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editingId !== null && (
        <form onSubmit={handleSave} className="mt-4 space-y-3 border-t border-kampmax-border pt-4">
          {formError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => {
              if (f.hideWhenChecked && values[f.hideWhenChecked] === true) return null;
              const value = values[f.key];
              const set = (v: string | boolean) => setValues((p) => ({ ...p, [f.key]: v }));
              const label = f.required ? `${f.label} *` : f.label;

              if (f.type === "checkbox") {
                return (
                  <label key={f.key} className="flex items-center gap-2 text-sm text-kampmax-text sm:col-span-2">
                    <input type="checkbox" checked={value === true} onChange={(e) => set(e.target.checked)} />
                    {f.label}
                  </label>
                );
              }
              if (f.type === "textarea") {
                return (
                  <div key={f.key} className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-kampmax-text">{label}</label>
                    <textarea
                      value={String(value)}
                      onChange={(e) => set(e.target.value)}
                      rows={3}
                      maxLength={5000}
                      className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm shadow-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                    />
                  </div>
                );
              }
              if (f.type === "select") {
                return (
                  <Select key={f.key} label={label} value={String(value)} onChange={(e) => set(e.target.value)}>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                );
              }
              return (
                <Input
                  key={f.key}
                  label={label}
                  type={f.type === "month" ? "month" : f.type === "url" ? "url" : "text"}
                  inputMode={f.type === "year" ? "numeric" : undefined}
                  maxLength={f.type === "year" ? 4 : undefined}
                  placeholder={f.placeholder}
                  value={String(value)}
                  onChange={(e) => set(e.target.value)}
                />
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

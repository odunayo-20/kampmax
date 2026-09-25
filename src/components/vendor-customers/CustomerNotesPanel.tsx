"use client";

import { useState } from "react";
import { Check, Eye, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useAddCustomerNote, useDeleteCustomerNote, useUpdateCustomerNote } from "@/hooks/use-vendor-customers";
import { Button } from "@/components/ui";
import type { VendorCustomerNote } from "@/types/vendor-customers";

interface CustomerNotesPanelProps {
  buyerId: string;
  notes: VendorCustomerNote[];
  canNote: boolean;
  onChanged: () => void;
}

export function CustomerNotesPanel({ buyerId, notes, canNote, onChanged }: CustomerNotesPanelProps) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const addNote = useAddCustomerNote(buyerId);
  const updateNote = useUpdateCustomerNote();
  const deleteNote = useDeleteCustomerNote();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, fallback: string, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await action();
      after?.();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  const submitNew = () => run(() => addNote.mutateAsync(draft), "Could not save note.", () => setDraft(""));

  const submitEdit = () => {
    if (!editingId) return Promise.resolve();
    return run(
      () => updateNote.mutateAsync({ noteId: editingId, body: editingText }),
      "Could not update note.",
      () => {
        setEditingId(null);
        setEditingText("");
      }
    );
  };

  const submitDelete = (noteId: string) => run(() => deleteNote.mutateAsync(noteId), "Could not delete note.");

  return (
    <section className="rounded-xl border border-kampmax-border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-kampmax-text">
          <Lock className="h-4 w-4 text-kampmax-blue" aria-hidden />
          Internal notes
        </h2>
        <span className="text-[10px] text-kampmax-text-secondary">Only you and your staff can see these</span>
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        maxLength={400}
        disabled={!canNote}
        placeholder={canNote ? "Add a private note about this customer…" : "You don't have permission to add notes."}
        className="mt-3 w-full resize-none rounded-lg border border-kampmax-border px-3 py-2 text-sm focus:border-kampmax-blue focus:outline-none disabled:bg-kampmax-muted/40"
        aria-label="New internal note"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[10px] text-kampmax-text-secondary">{draft.length}/400</p>
        <Button size="sm" onClick={submitNew} disabled={!canNote || !draft.trim() || busy}>
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
          Add note
        </Button>
      </div>

      {error && (
        <p className="mt-2 rounded-lg bg-kampmax-error/10 px-3 py-2 text-xs font-medium text-kampmax-error" role="alert">
          {error}
        </p>
      )}

      {notes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-kampmax-border p-3">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={2}
                    maxLength={400}
                    className="w-full resize-none rounded-lg border border-kampmax-border px-3 py-2 text-sm focus:border-kampmax-blue focus:outline-none"
                    aria-label="Edit note"
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={submitEdit} disabled={!editingText.trim() || busy}>
                      <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setEditingText(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm text-kampmax-text">{note.body}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] text-kampmax-text-secondary">
                      <Eye className="mr-1 inline h-3 w-3" aria-hidden />
                      {formatDateTime(note.updatedAt)}
                    </p>
                    {canNote && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditingId(note.id); setEditingText(note.body); }}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-kampmax-text-secondary hover:bg-kampmax-muted"
                        >
                          <Pencil className="h-3 w-3" aria-hidden />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => submitDelete(note.id)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-kampmax-error hover:bg-kampmax-muted"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
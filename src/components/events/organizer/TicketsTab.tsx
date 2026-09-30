"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useTierMutations } from "@/hooks/use-events";
import type { EventDashboard, EventItem, EventTier } from "@/types/event-ticketing";
import { naira } from "../event-format";

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600";

interface Draft {
  name: string;
  description: string;
  price: string;
  quantity: string;
}

const EMPTY: Draft = { name: "", description: "", price: "0", quantity: "50" };

export function TicketsTab({
  event,
  dashboard,
  canEdit,
}: {
  event: EventItem;
  dashboard: EventDashboard;
  canEdit: boolean;
}) {
  const { add, update, remove } = useTierMutations(event.id);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const busy = add.isPending || update.isPending || remove.isPending;
  const error = add.error ?? update.error ?? remove.error;
  const revenueByTier = new Map(dashboard.tiers.map((t) => [t.id, t.revenue]));

  function open(tier?: EventTier) {
    add.reset();
    update.reset();
    remove.reset();
    if (tier) {
      setDraft({
        name: tier.name,
        description: tier.description,
        price: String(tier.price),
        quantity: String(tier.quantity),
      });
      setEditing(tier.id);
    } else {
      setDraft(EMPTY);
      setEditing("new");
    }
  }

  const valid =
    draft.name.trim().length >= 2 &&
    Number(draft.price) >= 0 &&
    Number.isInteger(Number(draft.quantity)) &&
    Number(draft.quantity) >= 1;

  function save() {
    if (!valid) return;
    const body = {
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      price: Number(draft.price),
      quantity: Number(draft.quantity),
    };
    const done = { onSuccess: () => setEditing(null) };
    if (editing === "new") add.mutate(body, done);
    else if (editing) update.mutate({ tierId: editing, patch: body }, done);
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
        {event.tiers.map((t) => (
          <li key={t.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-neutral-900">{t.name}</p>
              <p className="text-[11px] text-neutral-500">
                {t.price > 0 ? naira(t.price) : "Free"} &middot; {t.sold}/{t.quantity} sold
                {t.soldOut ? " · sold out" : ""}
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100" aria-hidden>
                <div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.min(100, (t.sold / t.quantity) * 100)}%` }} />
              </div>
            </div>
            <span className="shrink-0 text-xs font-semibold text-neutral-600">
              {naira(revenueByTier.get(t.id) ?? 0)}
            </span>
            {canEdit && (
              <>
                <button aria-label={`Edit ${t.name}`} onClick={() => open(t)} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100">
                  <Pencil className="h-4 w-4" />
                </button>
                {t.sold === 0 && event.tiers.length > 1 && (
                  <button
                    aria-label={`Remove ${t.name}`}
                    disabled={busy}
                    onClick={() => remove.mutate(t.id)}
                    className="rounded-lg p-2 text-error-600 hover:bg-error-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      {canEdit && editing === null && event.tiers.length < 6 && (
        <button onClick={() => open()} className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary-400 text-xs font-bold text-primary-700">
          <Plus className="h-4 w-4" /> Add ticket type
        </button>
      )}

      {editing !== null && (
        <div className="space-y-2 rounded-2xl border border-primary-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-neutral-900">{editing === "new" ? "New ticket type" : "Edit ticket type"}</p>
            <button aria-label="Close" onClick={() => setEditing(null)} className="text-neutral-400"><X className="h-4 w-4" /></button>
          </div>
          <input aria-label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} placeholder="VIP" className={inputClass} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-semibold text-neutral-500">
              Price (₦)
              <input inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value.replace(/[^\d.]/g, "") })} className={`mt-0.5 ${inputClass}`} />
            </label>
            <label className="text-[11px] font-semibold text-neutral-500">
              Quantity
              <input inputMode="numeric" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value.replace(/\D/g, "") })} className={`mt-0.5 ${inputClass}`} />
            </label>
          </div>
          <input aria-label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={300} placeholder="What's included (optional)" className={inputClass} />
          {error && <p role="alert" className="text-xs text-error-700">{error.message}</p>}
          <button onClick={save} disabled={!valid || busy} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-bold text-white disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </div>
      )}
      {editing === null && error && <p role="alert" className="text-xs text-error-700">{error.message}</p>}
    </div>
  );
}

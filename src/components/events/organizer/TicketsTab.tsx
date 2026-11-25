"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useTierMutations } from "@/hooks/use-events";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { actionError, validateTierDraft, type TierErrors } from "@/lib/event-publish";
import type { EventDashboard, EventItem, EventTier, TierInput } from "@/types/event-ticketing";
import { naira } from "../event-format";
import { FieldError } from "./fields";

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
  const [errors, setErrors] = useState<TierErrors>({});
  const [priceChange, setPriceChange] = useState<{ tier: EventTier; body: TierInput } | null>(null);
  const [removing, setRemoving] = useState<EventTier | null>(null);

  const busy = add.isPending || update.isPending || remove.isPending;
  const error = add.error ?? update.error ?? remove.error;
  const revenueByTier = new Map(dashboard.tiers.map((t) => [t.id, t.revenue]));

  function open(tier?: EventTier) {
    add.reset();
    update.reset();
    remove.reset();
    setErrors({});
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

  function save() {
    const current = event.tiers.find((t) => t.id === editing);
    const result = validateTierDraft(draft, {
      sold: current?.sold ?? 0,
      otherNames: event.tiers.filter((t) => t.id !== editing).map((t) => t.name),
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    // An emptied note has to be sent as "" to clear it.
    const body = { ...result.value, description: result.value.description ?? "" };
    if (current && current.sold > 0 && body.price !== current.price) {
      setPriceChange({ tier: current, body });
      return;
    }
    send(body);
  }

  function send(body: TierInput) {
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
                    onClick={() => setRemoving(t)}
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
          <FieldError message={errors.name} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-semibold text-neutral-500">
              Price (₦)
              <input inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} className={`mt-0.5 ${inputClass}`} />
              <FieldError message={errors.price} />
            </label>
            <label className="text-[11px] font-semibold text-neutral-500">
              Quantity
              <input inputMode="numeric" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} className={`mt-0.5 ${inputClass}`} />
              <FieldError message={errors.quantity} />
            </label>
          </div>
          <input aria-label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={300} placeholder="What's included (optional)" className={inputClass} />
          <FieldError message={errors.description} />
          {error && <p role="alert" className="text-xs text-error-700">{actionError(error, "Couldn't save the ticket type. Try again.")}</p>}
          <button onClick={save} disabled={busy} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-bold text-white disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </div>
      )}
      {editing === null && error && <p role="alert" className="text-xs text-error-700">{actionError(error, "Couldn't update the ticket types. Try again.")}</p>}

      <ConfirmDialog
        open={priceChange !== null}
        title="Change the price?"
        body={
          priceChange
            ? `${priceChange.tier.sold} ${priceChange.tier.sold === 1 ? "ticket was" : "tickets were"} already sold at ${naira(priceChange.tier.price)}. They keep that price; only new buyers pay the new one.`
            : ""
        }
        confirmLabel="Change price"
        pending={update.isPending}
        onCancel={() => setPriceChange(null)}
        onConfirm={() => {
          if (!priceChange) return;
          send(priceChange.body);
          setPriceChange(null);
        }}
      />
      <ConfirmDialog
        open={removing !== null}
        title={`Remove "${removing?.name ?? ""}"?`}
        body="No tickets were sold for this type."
        confirmLabel="Remove"
        destructive
        pending={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          remove.mutate(removing.id);
          setRemoving(null);
        }}
      />
    </div>
  );
}

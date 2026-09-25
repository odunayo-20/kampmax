"use client";

import { useMemo, useState } from "react";
import { Plus, Check, MapPin, Pencil, Trash2, Home } from "lucide-react";
import type { SavedAddress } from "@/types";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import { AddressForm, AddressFormValues } from "./AddressForm";

interface SavedAddressesProps {
  addresses: SavedAddress[];
  selectedId: string | null;
  onSelect: (address: SavedAddress) => void;
  onAdd: (values: AddressFormValues) => void;
  onUpdate: (id: string, values: AddressFormValues) => void;
  onDelete: (id: string) => void;
}

export function SavedAddresses({
  addresses,
  selectedId,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
}: SavedAddressesProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { campuses } = useApp();

  const campusName = (id: string) =>
    campuses.find((c) => c.id === id)?.name || "Campus";

  return (
    <section
      aria-labelledby="saved-addresses-title"
      className="bg-white rounded-xl border border-kampmax-border p-4 sm:p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h2
          id="saved-addresses-title"
          className="text-sm font-semibold text-kampmax-text flex items-center gap-2"
        >
          <Home className="h-4 w-4 text-kampmax-blue" />
          Saved Delivery Addresses
        </h2>
        <button
          onClick={() => {
            setAdding(true);
            setEditingId(null);
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-kampmax-blue hover:text-kampmax-blue/80 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {adding && (
        <AddressForm
          campuses={campuses}
          submitLabel="Save address"
          onCancel={() => setAdding(false)}
          onSubmit={(values) => {
            onAdd(values);
            setAdding(false);
          }}
        />
      )}

      {addresses.length === 0 && !adding ? (
        <p className="text-sm text-kampmax-text-secondary">
          No saved addresses yet. Add one for faster checkout.
        </p>
      ) : (
        <ul className="space-y-2">
          {addresses.map((addr) => {
            const selected = addr.id === selectedId;
            const editing = addr.id === editingId;
            return (
              <li
                key={addr.id}
                className={cn(
                  "rounded-lg border transition-colors",
                  selected ? "border-kampmax-blue bg-kampmax-blue/5" : "border-kampmax-border"
                )}
              >
                <div className="flex items-center gap-3 p-3">
                  <button
                    onClick={() => onSelect(addr)}
                    aria-pressed={selected}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-kampmax-text">
                        {addr.label}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-medium text-kampmax-blue bg-kampmax-blue/10 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-kampmax-text-secondary line-clamp-1">
                      {addr.address}
                    </p>
                    <p className="text-[11px] text-kampmax-text-muted">
                      {campusName(addr.campusId)} · {addr.contactName}
                    </p>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(editing ? null : addr.id);
                        setAdding(false);
                      }}
                      aria-label="Edit address"
                      className="p-1.5 rounded-md text-kampmax-text-secondary hover:bg-neutral-100 hover:text-kampmax-text transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(addr.id)}
                      aria-label="Delete address"
                      className="p-1.5 rounded-md text-kampmax-text-secondary hover:bg-kampmax-error/10 hover:text-kampmax-error transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {selected && (
                      <span className="h-5 w-5 rounded-full bg-kampmax-blue flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    )}
                  </div>
                </div>

                {editing && (
                  <div className="px-3 pb-3">
                    <AddressForm
                      campuses={campuses}
                      initial={{
                        label: addr.label,
                        address: addr.address,
                        campusId: addr.campusId,
                        contactName: addr.contactName,
                        contactPhone: addr.contactPhone,
                        notes: addr.notes,
                        isDefault: addr.isDefault,
                      }}
                      submitLabel="Update address"
                      onCancel={() => setEditingId(null)}
                      onSubmit={(values) => {
                        onUpdate(addr.id, values);
                        setEditingId(null);
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

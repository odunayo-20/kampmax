"use client";

import { Loader2 } from "lucide-react";

/** A small "are you sure" in place, for money steps on the order pages: what happens, then confirm or go back. */
export function ConfirmStep({
  title,
  text,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div role="alertdialog" aria-label={title} className="space-y-2 rounded-lg border border-kampmax-border bg-kampmax-muted/40 p-3">
      <p className="text-sm font-semibold text-kampmax-text">{title}</p>
      <p className="text-xs text-kampmax-text-secondary">{text}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-9 flex-1 rounded-lg border border-kampmax-border bg-white text-xs font-semibold text-kampmax-text hover:bg-kampmax-muted disabled:opacity-60"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          aria-busy={busy}
          className={
            "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-60 " +
            (danger ? "bg-kampmax-error hover:bg-red-700" : "bg-kampmax-navy hover:bg-kampmax-navy/90")
          }
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

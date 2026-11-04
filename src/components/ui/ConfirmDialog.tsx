"use client";

import { Button } from "@/components/ui";

/**
 * Lightweight, accessible confirm dialog used for destructive or
 * consequential employer actions (publish/close a job). Rendered as an
 * overlay with a backdrop; focuses the cancel button on open.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  pending = false,
  confirmDisabled = false,
  children,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  /** Keeps the confirm button off while the dialog cannot be acted on yet (e.g. a price is loading). */
  confirmDisabled?: boolean;
  /** Extra content under the body, for dialogs that need to show more than a sentence. */
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" aria-hidden onClick={pending ? undefined : onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-kampmax-border bg-white p-6 shadow-xl">
        <h2 className="text-base font-bold text-kampmax-text">{title}</h2>
        <p className="mt-2 text-sm text-kampmax-text-secondary">{body}</p>
        {children}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            size="sm"
            onClick={onConfirm}
            disabled={pending || confirmDisabled}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RotateCcw, ShieldOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmTone = "danger" | "warning" | "default";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  loading?: boolean;
  /**
   * When set, the dialog asks for a written reason and only enables the
   * confirm button once one is entered. The reason is passed to onConfirm.
   */
  reasonLabel?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const TONE_STYLES: Record<ConfirmTone, { iconWrap: string; button: string; Icon: typeof ShieldOff }> = {
  danger: {
    iconWrap: "bg-kampmax-error/10 text-kampmax-error",
    button:
      "bg-kampmax-error text-white hover:bg-red-700 focus-visible:outline-kampmax-error",
    Icon: ShieldOff,
  },
  warning: {
    iconWrap: "bg-kampmax-warning/10 text-amber-600",
    button:
      "bg-amber-500 text-white hover:bg-amber-600 focus-visible:outline-amber-500",
    Icon: AlertTriangle,
  },
  default: {
    iconWrap: "bg-kampmax-blue/10 text-kampmax-blue",
    button:
      "bg-kampmax-navy text-white hover:bg-kampmax-navy-light focus-visible:outline-kampmax-navy",
    Icon: RotateCcw,
  },
};

/**
 * Modal confirmation used before destructive account actions
 * (suspend / deactivate / reset state). Blocks interaction with
 * the page until resolved; Escape is disabled while submitting.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
  reasonLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onCancel]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const styles = TONE_STYLES[tone];
  const ToneIcon = styles.Icon;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <button
        type="button"
        aria-label="Cancel"
        tabIndex={-1}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={() => !loading && onCancel()}
      />
      <div className="relative w-full max-w-md rounded-xl border border-kampmax-border bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3.5">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", styles.iconWrap)}>
            <ToneIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-sm font-semibold text-kampmax-text">
              {title}
            </h2>
            <p id="confirm-dialog-message" className="mt-1.5 text-sm leading-relaxed text-kampmax-text-secondary">
              {message}
            </p>
            {reasonLabel && (
              <div className="mt-3">
                <label
                  htmlFor="confirm-dialog-reason"
                  className="mb-1 block text-xs font-medium text-kampmax-text"
                >
                  {reasonLabel}
                </label>
                <textarea
                  id="confirm-dialog-reason"
                  value={reason}
                  rows={3}
                  maxLength={500}
                  disabled={loading}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-kampmax-border bg-white px-3 py-2 text-sm focus:border-kampmax-blue focus:outline-none focus:ring-1 focus:ring-kampmax-blue"
                />
              </div>
            )}
          </div>
          {!loading && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close dialog"
              className="-mr-1 -mt-1 rounded-md p-1 text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-text"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex h-9 items-center rounded-md border border-kampmax-border bg-white px-3.5 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={loading || (reasonLabel !== undefined && !reason.trim())}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60",
              styles.button
            )}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Convenience pre-configs for the three destructive user actions.
type UserNameProps = Omit<
  ConfirmDialogProps,
  "title" | "message" | "tone" | "confirmLabel"
> & { userName: string };

export function SuspendConfirm(props: UserNameProps) {
  return (
    <ConfirmDialog
      {...props}
      tone="danger"
      title={`Suspend ${props.userName}?`}
      message={`${props.userName} will immediately lose access to their account - orders in progress stay visible but they cannot sign in, buy or sell until reactivated.`}
      confirmLabel="Suspend account"
    />
  );
}

export function DeactivateConfirm(props: UserNameProps) {
  return (
    <ConfirmDialog
      {...props}
      tone="warning"
      title={`Deactivate ${props.userName}?`}
      message={`The account is retired at ${props.userName}'s own request or for dormancy. Data is retained but sign-in and notifications are switched off.`}
      confirmLabel="Deactivate account"
    />
  );
}

export function ResetStateConfirm(props: UserNameProps) {
  return (
    <ConfirmDialog
      {...props}
      tone="default"
      title={`Reset ${props.userName}'s account state?`}
      message={`This restores a clean slate: access is reactivated, open reports against ${props.userName} are dismissed and moderation flags are cleared. This cannot be undone.`}
      confirmLabel="Reset account state"
    />
  );
}

"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

interface EditorDialogProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Small accessible modal: labelled, traps Tab, closes on Escape, returns focus to the opener. */
export function EditorDialog({ title, onClose, children }: EditorDialogProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    // Focus the first field (not the header's close button) so typing can start immediately.
    const first = panel.current?.querySelector<HTMLElement>("input, select, textarea") ?? panel.current?.querySelector<HTMLElement>("button");
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label="Close dialog" tabIndex={-1} className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={panel} className="relative w-full max-w-md rounded-t-xl border border-kampmax-border bg-white p-5 shadow-xl sm:rounded-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold text-kampmax-text">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 -mt-1 rounded-md p-1.5 text-kampmax-text-secondary hover:bg-kampmax-muted">
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const DIALOG_INPUT =
  "w-full rounded-lg border border-kampmax-border bg-white px-3 py-2 text-sm text-kampmax-text placeholder:text-kampmax-text-muted focus:border-kampmax-blue focus:outline-none focus:ring-1 focus:ring-kampmax-blue";
export const DIALOG_PRIMARY =
  "inline-flex h-9 items-center justify-center rounded-md bg-kampmax-navy px-4 text-sm font-medium text-white hover:bg-kampmax-navy-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kampmax-blue disabled:cursor-not-allowed disabled:opacity-60";
export const DIALOG_SECONDARY =
  "inline-flex h-9 items-center justify-center rounded-md border border-kampmax-border bg-white px-4 text-sm font-medium text-kampmax-text hover:bg-kampmax-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue";

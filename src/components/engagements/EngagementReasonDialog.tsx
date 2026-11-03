"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

const MAX_LENGTH = 1000;

/**
 * Asks for a written reason before a consequential engagement step (cancel,
 * request changes, report a problem). The confirm button stays disabled until
 * the text is long enough, so the backend's minimum is never hit by surprise.
 * Mount it only while it is open — that resets the text each time.
 */
export function EngagementReasonDialog({
  title,
  body,
  label,
  placeholder,
  confirmLabel,
  keepLabel = "Go back",
  minLength,
  destructive = false,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  title: string;
  body: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  keepLabel?: string;
  minLength: number;
  destructive?: boolean;
  busy: boolean;
  error: string | null;
  onSubmit: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();
  const ready = trimmed.length >= minLength;

  useEffect(() => {
    fieldRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="engagement-reason-title"
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden onClick={busy ? undefined : onClose} />
      <form
        className="relative w-full max-w-md rounded-2xl border border-kampmax-border bg-white p-5 shadow-xl sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready && !busy) onSubmit(trimmed);
        }}
      >
        <h2 id="engagement-reason-title" className="text-base font-bold text-kampmax-text">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-kampmax-text-secondary">{body}</p>

        <label htmlFor="engagement-reason-field" className="mt-4 block text-sm font-medium text-kampmax-text">
          {label}
        </label>
        <textarea
          id="engagement-reason-field"
          ref={fieldRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={MAX_LENGTH}
          placeholder={placeholder}
          disabled={busy}
          aria-describedby="engagement-reason-hint"
          className="mt-1.5 w-full rounded-lg border border-kampmax-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-kampmax-bg"
        />
        <p id="engagement-reason-hint" className="mt-1 flex justify-between text-xs text-kampmax-text-secondary">
          <span>{ready ? " " : `Write at least ${minLength} characters.`}</span>
          <span>
            {text.length}/{MAX_LENGTH}
          </span>
        </p>

        {error && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-lg border border-error-100 bg-error-50 p-2.5 text-xs text-error-700"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>
            {keepLabel}
          </Button>
          <Button type="submit" variant={destructive ? "destructive" : "primary"} size="sm" disabled={!ready || busy}>
            {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />}
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}

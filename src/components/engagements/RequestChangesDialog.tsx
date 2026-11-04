"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  REVISION_KINDS,
  REVISIONS_SUPPORT_HREF,
  defaultRevisionKind,
  revisionsUsedLabel,
  type RevisionKind,
  type Revisions,
} from "@/lib/revisions";

const MAX_LENGTH = 1000;
const MIN_LENGTH = 5;
const KINDS: RevisionKind[] = ["CHANGES", "FIX", "NEW_SCOPE"];

/**
 * How the client responds to delivered work. They say what they are asking
 * for, because that decides what happens: a change uses one of the limited
 * revisions, a mistake or missing part never does, and extra work is not a
 * revision at all. When the revisions are gone, ordinary changes are closed
 * but nothing else is, and support is one click away. The backend counts and
 * enforces every rule; this only explains them before anything is sent.
 * Mount it only while it is open, so it starts fresh each time.
 */
export function RequestChangesDialog({
  revisions,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  revisions: Revisions;
  busy: boolean;
  error: string | null;
  onSubmit: (kind: RevisionKind, note: string) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<RevisionKind>(defaultRevisionKind(revisions));
  const [text, setText] = useState("");
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();
  const ready = trimmed.length >= MIN_LENGTH;
  const out = revisions.remaining <= 0;
  const info = REVISION_KINDS[kind];

  useEffect(() => {
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
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-changes-title"
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden onClick={busy ? undefined : onClose} />
      <form
        className="relative my-auto w-full max-w-md rounded-2xl border border-kampmax-border bg-white p-5 shadow-xl sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          // Never send a kind the choices above have closed.
          if (ready && !busy && !(kind === "CHANGES" && out)) onSubmit(kind, trimmed);
        }}
      >
        <h2 id="request-changes-title" className="text-base font-bold text-kampmax-text">
          Respond to the delivered work
        </h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          {revisionsUsedLabel(revisions)}. Tell us what kind of request this is, so it&apos;s counted fairly.
        </p>

        <fieldset className="mt-4 space-y-2" disabled={busy}>
          <legend className="sr-only">What are you asking for?</legend>
          {KINDS.map((k) => {
            const closed = k === "CHANGES" && out;
            const choice = REVISION_KINDS[k];
            const id = `request-kind-${k}`;
            return (
              <label
                key={k}
                htmlFor={id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm",
                  kind === k ? "border-primary-500 bg-primary-50/40" : "border-kampmax-border",
                  closed && "cursor-not-allowed bg-kampmax-bg opacity-70"
                )}
              >
                <input
                  id={id}
                  type="radio"
                  name="request-kind"
                  value={k}
                  checked={kind === k}
                  disabled={closed}
                  onChange={() => setKind(k)}
                  className="mt-1 h-4 w-4 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-kampmax-text">{choice.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-kampmax-text-secondary">
                    {choice.help(revisions)}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        {out && (
          <p className="mt-3 rounded-lg border border-accent-100 bg-accent-50 p-2.5 text-xs leading-relaxed text-accent-700">
            All {revisions.allowed} revisions are used, but you are not stuck. You can still report a mistake or
            something missing, approve the work, or open a dispute. Need a hand?{" "}
            <Link href={REVISIONS_SUPPORT_HREF} className="font-medium underline">
              Contact support
            </Link>
            .
          </p>
        )}

        <label htmlFor="request-changes-note" className="mt-4 block text-sm font-medium text-kampmax-text">
          {info.noteLabel}
        </label>
        <textarea
          id="request-changes-note"
          ref={fieldRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={MAX_LENGTH}
          placeholder={info.placeholder}
          disabled={busy}
          aria-describedby="request-changes-hint"
          className="mt-1.5 w-full rounded-lg border border-kampmax-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-kampmax-bg"
        />
        <p id="request-changes-hint" className="mt-1 flex justify-between text-xs text-kampmax-text-secondary">
          <span>{ready ? " " : `Write at least ${MIN_LENGTH} characters.`}</span>
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
            Go back
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={!ready || busy || (kind === "CHANGES" && out)}>
            {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />}
            {busy ? "Working…" : info.action}
          </Button>
        </div>
      </form>
    </div>
  );
}

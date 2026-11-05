"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail, RotateCcw, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  useDeleteContactMessage,
  useSetContactHandled,
} from "@/hooks/admin/use-admin-contact-messages";
import { formatDate, formatTime } from "@/lib/utils";
import type { AdminContactMessage } from "@/types/contact-messages";

/** A reply goes from the admin's own mail app; the subject is filled in, nothing else is sent from here. */
export function replyHref(message: AdminContactMessage): string {
  return `mailto:${message.email}?subject=${encodeURIComponent(`Re: your message to Kampmax (${message.inquiryLabel})`)}`;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-2 py-1 text-sm">
      <dt className="text-kampmax-text-secondary">{label}</dt>
      <dd className="min-w-0 break-words text-kampmax-text">{children}</dd>
    </div>
  );
}

/**
 * One contact form message in full. The text is what a stranger typed, so it
 * is rendered as plain text. Replying opens the admin's mail app; marking it
 * handled starts its keep-for clock, and deleting it is for a deletion request
 * or spam.
 */
export function ContactMessageDialog({
  message,
  onClose,
}: {
  message: AdminContactMessage | null;
  onClose: () => void;
}) {
  const setHandled = useSetContactHandled();
  const remove = useDeleteContactMessage();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = setHandled.isPending || remove.isPending;

  useEffect(() => {
    setConfirmDelete(false);
    setError(null);
  }, [message?.id]);

  useEffect(() => {
    if (!message) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy && !confirmDelete) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [message, busy, confirmDelete, onClose]);

  if (!message) return null;

  const handled = message.status === "HANDLED";
  const received = new Date(message.createdAt);
  const fail = (err: unknown) =>
    setError(err instanceof Error ? err.message : "Something went wrong. Try again.");

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label={`Message from ${message.name}`}
      >
        <button
          type="button"
          aria-label="Close"
          tabIndex={-1}
          className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
          onClick={() => !busy && onClose()}
        />
        <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-kampmax-border bg-white p-5 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-kampmax-text">{message.inquiryLabel}</h2>
              <p className="mt-0.5 text-xs text-kampmax-text-secondary">
                {formatDate(received)} · {formatTime(received)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Close dialog"
              className="rounded-md p-1 text-kampmax-text-secondary hover:bg-kampmax-muted hover:text-kampmax-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <dl className="mt-4 divide-y divide-kampmax-border border-y border-kampmax-border">
            <Detail label="From">{message.name}</Detail>
            <Detail label="Email">
              <a href={`mailto:${message.email}`} className="text-kampmax-blue hover:underline">
                {message.email}
              </a>
              <span className="block text-[11px] text-kampmax-text-secondary">
                Not verified: the sender never proved this address is theirs.
              </span>
            </Detail>
            {message.organization && <Detail label="Organization">{message.organization}</Detail>}
            {message.phone && (
              <Detail label="Phone">
                <a href={`tel:${message.phone}`} className="text-kampmax-blue hover:underline">
                  {message.phone}
                </a>
              </Detail>
            )}
            {handled && (
              <Detail label="Handled">
                {message.handledAt ? formatDate(message.handledAt) : ""}
                {message.handledByName ? ` by ${message.handledByName}` : ""}
              </Detail>
            )}
          </dl>

          <p
            data-testid="contact-message-text"
            className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-kampmax-muted/50 p-3 text-sm text-kampmax-text"
          >
            {message.message}
          </p>

          {!message.emailed && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              The team inbox was never emailed about this one, so it only exists here.
            </p>
          )}

          {error && (
            <p role="alert" className="mt-3 text-xs text-kampmax-error">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-kampmax-error hover:bg-kampmax-error/10 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Delete
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={replyHref(message)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text hover:bg-kampmax-muted/60"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden />
                Reply by email
              </a>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setHandled.mutate(
                    { id: message.id, handled: !handled },
                    { onSuccess: onClose, onError: fail }
                  );
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-navy px-3 text-sm font-medium text-white hover:bg-kampmax-navy-light disabled:opacity-60"
              >
                {setHandled.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : handled ? (
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                )}
                {handled ? "Reopen" : "Mark handled"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this message?"
        message={`This permanently deletes ${message.name}'s message. Use it for a deletion request or spam; to finish with a message, mark it handled instead. This can't be undone.`}
        confirmLabel="Delete message"
        tone="danger"
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setError(null);
          remove.mutate(message.id, {
            onSuccess: onClose,
            onError: (err) => {
              setConfirmDelete(false);
              fail(err);
            },
          });
        }}
      />
    </>
  );
}

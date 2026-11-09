"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import type { AgentDocumentFile } from "@/types/accommodation";

interface DocumentViewerDialogProps {
  open: boolean;
  title: string;
  /** Fetches the private file with the admin's sign-in. Called each time the dialog opens. */
  load: () => Promise<AgentDocumentFile>;
  onClose: () => void;
}

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; url: string; mime: string; filename: string | null };

/**
 * Shows a private identity or ownership document. A browser <img> or <iframe>
 * cannot send the sign-in token, so the file is fetched first and shown from an
 * object URL, which is released again as soon as the dialog closes so the file
 * is not left lying around in the page. Each view is recorded by the backend.
 */
export function DocumentViewerDialog({ open, title, load, onClose }: DocumentViewerDialogProps) {
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setState({ kind: "loading" });
    load()
      .then(({ blob, filename }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ kind: "ready", url: objectUrl, mime: blob.type, filename });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Couldn't open the document.",
        });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // load is a fresh closure each render; the dialog should fetch once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-viewer-title"
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-xl border border-kampmax-border bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-kampmax-border px-4 py-3">
          <div className="min-w-0">
            <h2 id="document-viewer-title" className="truncate text-sm font-semibold text-kampmax-text">
              {title}
            </h2>
            <p className="text-[11px] text-kampmax-text-secondary">
              Private. Viewing is recorded in the audit log.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {state.kind === "ready" && (
              <a
                href={state.url}
                download={state.filename ?? "document"}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-2.5 text-xs font-medium text-kampmax-text hover:bg-kampmax-muted/60"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Download
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close document"
              className="rounded-md p-1.5 text-kampmax-text-secondary hover:bg-kampmax-muted hover:text-kampmax-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-[16rem] flex-1 overflow-auto bg-kampmax-muted/40 p-3">
          {state.kind === "loading" && (
            <div className="flex h-64 items-center justify-center text-sm text-kampmax-text-secondary">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Opening the document…
            </div>
          )}
          {state.kind === "error" && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.message}
            </p>
          )}
          {state.kind === "ready" &&
            (state.mime.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.url}
                alt={title}
                className="mx-auto max-h-[75vh] max-w-full rounded-md bg-white object-contain"
              />
            ) : state.mime === "application/pdf" ? (
              <iframe title={title} src={state.url} className="h-[75vh] w-full rounded-md bg-white" />
            ) : (
              <p className="p-6 text-center text-sm text-kampmax-text-secondary">
                This file type can&apos;t be previewed. Use Download to open it.
              </p>
            ))}
        </div>
      </div>
    </div>
  );
}

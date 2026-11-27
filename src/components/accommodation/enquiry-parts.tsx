"use client";

import { FormEvent, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { describeWhen, MESSAGE_MAX, type Tone, VISIT_NOTE_MAX, visitTimeProblem, visitWindow } from "@/lib/accommodation-enquiry";
import { describeHousingError } from "@/lib/accommodation-text";
import { timeAgo } from "@/lib/utils";

/** Pieces the housing screens share: both sides of an enquiry, the agent's visits, hub and listings. */

const PILL: Record<Tone | "bad", string> = {
  positive: "bg-emerald-50 text-emerald-800",
  attention: "bg-amber-50 text-amber-900",
  info: "bg-blue-50 text-blue-900",
  neutral: "bg-kampmax-muted text-kampmax-text-secondary",
  bad: "bg-red-50 text-red-800",
};

export function Pill({ label, tone }: { label: string; tone: Tone | "bad" }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PILL[tone]}`}>{label}</span>;
}

export function LoadError({ what, error, onRetry }: { what: string; error: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700">
      We couldn&apos;t {what}. {describeHousingError(error)}
      <button type="button" className="ml-2 underline" onClick={onRetry}>Try again</button>
    </div>
  );
}

type Message = { id: string; from: "USER" | "AGENT"; body: string; createdAt: string };

/** The conversation, oldest first, each message saying who sent it and when. */
export function Thread({ messages, me, them }: { messages: Message[] | undefined; me: "USER" | "AGENT"; them: string }) {
  return (
    <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-lg bg-kampmax-bg p-3" aria-live="polite">
      {(messages ?? []).map((m) => (
        <div key={m.id} className={`max-w-[90%] rounded-lg p-3 text-sm text-kampmax-text ${m.from === me ? "ml-auto bg-blue-100" : "bg-white"}`}>
          <p className="whitespace-pre-wrap">{m.body}</p>
          <p className="mt-1 text-right text-[10px] text-kampmax-text-secondary">
            {m.from === me ? "You" : them} · <time dateTime={m.createdAt} title={describeWhen(m.createdAt)}>{timeAgo(m.createdAt)}</time>
          </p>
        </div>
      ))}
      {!messages?.length && <p className="text-xs text-kampmax-text-secondary">No messages yet.</p>}
    </div>
  );
}

/** The reply box. The draft stays until the server takes it, so a failed send loses nothing. */
export function Composer({
  placeholder,
  disabled,
  onSend,
  quickReplies,
}: {
  placeholder: string;
  disabled: boolean;
  onSend: (body: string) => Promise<boolean>;
  quickReplies?: { id: string; label: string; text: string }[];
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const sent = await onSend(body);
    setSending(false);
    if (sent) setText("");
  }

  return (
    <div className="mt-3 space-y-2">
      {quickReplies && !text.trim() && (
        <div className="flex flex-wrap gap-2" aria-label="Quick replies">
          {quickReplies.map((q) => (
            <button key={q.id} type="button" onClick={() => setText(q.text)} className="rounded-full border border-kampmax-border px-3 py-1 text-xs hover:bg-kampmax-bg">
              {q.label}
            </button>
          ))}
        </div>
      )}
      <form className="flex gap-2" onSubmit={(e) => void submit(e)}>
        <input
          aria-label={placeholder}
          maxLength={MESSAGE_MAX}
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          className="min-w-0 flex-1 rounded-md border border-kampmax-border px-3 py-2 text-sm"
          placeholder={placeholder}
        />
        <button type="submit" disabled={disabled || sending || !text.trim()} className="rounded-md bg-kampmax-blue px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}

/** Picking a visit time an hour to 60 days away, read back in words so a misread is obvious, with an optional note. */
export function VisitTimeForm({
  hint,
  noteLabel,
  notePlaceholder,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  hint: string;
  noteLabel: string;
  notePlaceholder: string;
  submitLabel: string;
  pending: boolean;
  /** Resolves to an error to show, or null when it went through. */
  onSubmit: (date: Date, note: string | undefined) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const range = visitWindow();
  const chosen = when ? new Date(when) : null;
  const readBack = chosen && !visitTimeProblem(chosen) ? describeWhen(chosen.toISOString()) : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const date = new Date(when);
    const found = visitTimeProblem(date);
    setProblem(found);
    if (!found) setProblem(await onSubmit(date, note.trim() || undefined));
  }

  return (
    <form className="mt-3 space-y-3" onSubmit={(e) => void submit(e)}>
      <p className="text-xs text-kampmax-text-secondary">{hint}</p>
      <label className="block text-xs text-kampmax-text-secondary">
        Date and time
        <input
          type="datetime-local"
          min={range.min}
          max={range.max}
          value={when}
          onChange={(ev) => { setWhen(ev.target.value); setProblem(null); }}
          className="mt-1 block rounded-md border border-kampmax-border px-2 py-2 text-sm text-kampmax-text"
        />
      </label>
      {readBack && <p className="text-sm text-kampmax-text">{readBack}</p>}
      <label className="block text-xs text-kampmax-text-secondary">
        {noteLabel}
        <textarea
          rows={3}
          maxLength={VISIT_NOTE_MAX}
          value={note}
          onChange={(ev) => setNote(ev.target.value)}
          placeholder={notePlaceholder}
          className="mt-1 block w-full rounded-md border border-kampmax-border px-3 py-2 text-sm text-kampmax-text"
        />
        <span className="mt-0.5 block text-right">{note.length}/{VISIT_NOTE_MAX}</span>
      </label>
      {problem && <p role="alert" className="text-xs text-red-700">{problem}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending || !when} className="rounded-md bg-kampmax-blue px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {pending ? "Sending…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-kampmax-border px-3 py-2 text-xs">Cancel</button>
      </div>
    </form>
  );
}

export type Ask = { title: string; body: string; confirmLabel: string; cancelLabel?: string; destructive?: boolean; run: () => Promise<unknown> };

/** One "are you sure?" dialog per panel: `confirm` opens it, and `dialog` is rendered once. */
export function useAsk(pending: boolean) {
  const [ask, setAsk] = useState<Ask | null>(null);
  const dialog = (
    <ConfirmDialog
      open={!!ask}
      title={ask?.title ?? ""}
      body={ask?.body ?? ""}
      confirmLabel={ask?.confirmLabel ?? ""}
      cancelLabel={ask?.cancelLabel ?? "Keep it"}
      destructive={ask?.destructive ?? true}
      pending={pending}
      onConfirm={() => {
        const current = ask;
        setAsk(null);
        void current?.run();
      }}
      onCancel={() => setAsk(null)}
    />
  );
  return { confirm: setAsk, dialog };
}

/** Runs an action and turns a failure into plain words for the panel's error line. */
export function useRun() {
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<unknown>): Promise<boolean> {
    setError(null);
    try {
      await action();
      return true;
    } catch (reason) {
      setError(describeHousingError(reason));
      return false;
    }
  }
  return { error, run };
}

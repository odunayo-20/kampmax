"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";

interface QuestionFormProps {
  label: string;
  placeholder: string;
  max: number;
  submitLabel: string;
  initial?: string;
  /** What is wrong with the text, or null when it can be sent. */
  problem: (text: string) => string | null;
  onSubmit: (text: string) => Promise<unknown>;
  /** Called after a successful send, and when the person cancels. */
  onDone: (sent: boolean) => void;
}

/** One text box with Cancel and a send button, for asking a question or answering one. Shows the server's reason if it says no. */
export function QuestionForm({ label, placeholder, max, submitLabel, initial = "", problem, onSubmit, onDone }: QuestionFormProps) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const issue = problem(text);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(text);
      onDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not go through. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-kampmax-text">
        {label}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={max * 2}
          placeholder={placeholder}
          className="mt-1 block w-full rounded-lg border border-kampmax-border bg-white p-3 text-sm font-normal text-kampmax-text focus:border-kampmax-blue focus:outline-none"
        />
      </label>
      <div className="flex justify-between text-xs">
        <span role={text.length > 0 && issue ? "alert" : undefined} className="text-kampmax-error">
          {text.length > 0 ? issue : null}
        </span>
        <span className="text-kampmax-text-secondary">
          {text.length} / {max}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-kampmax-error">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => onDone(false)}>
          Cancel
        </Button>
        <Button type="button" disabled={!!issue || busy} onClick={() => void send()}>
          {busy ? "Sending…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

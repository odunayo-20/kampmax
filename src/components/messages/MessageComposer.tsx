"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { AlertCircle, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSendMessage } from "@/hooks/use-messages";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { MESSAGE_MAX_LENGTH } from "@/config/messaging";

interface MessageComposerProps {
  conversationId: string;
}

/**
 * Compose and send a plain-text message.
 *
 * - Enter sends; Shift+Enter inserts a newline. The Send button also submits.
 * - The draft is trimmed, validated and capped at MESSAGE_MAX_LENGTH; the send
 *   button is disabled while the mutation is pending so a message can never be
 *   double-sent.
 * - The input is only cleared AFTER the store/backend confirms success. On
 *   failure the draft is kept, the error maps to a friendly message, and the
 *   same Send action retries exactly once per tap.
 */
export function MessageComposer({ conversationId }: MessageComposerProps) {
  const sendMutation = useSendMessage();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const text = draft.slice(0, MESSAGE_MAX_LENGTH);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [text]);

  function handleSend() {
    if (sendingRef.current || sendMutation.isPending) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    sendingRef.current = true;

    sendMutation.mutate(
      { conversationId, text: trimmed },
      {
        onSuccess: () => setDraft(""),
        onError: (err) => setError(getFriendlyErrorMessage(err)),
        onSettled: () => {
          sendingRef.current = false;
        },
      }
    );
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setDraft(event.target.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter during IME composition confirms the candidate, it must not send.
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    handleSend();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    handleSend();
  }

  const pending = sendingRef.current || sendMutation.isPending;
  const overLimit = text.length >= MESSAGE_MAX_LENGTH;

  return (
    <form onSubmit={handleSubmit} className="border-t border-kampmax-border bg-white px-3 py-2.5 sm:px-4">
      {error && (
        <p role="alert" className="mb-2 flex items-start gap-1.5 text-xs font-medium text-kampmax-error">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" aria-hidden />
          <span>
            {error} Your draft is still here — press Send to try again.
          </span>
        </p>
      )}

      <div className="flex items-end gap-2">
        <label htmlFor="message-input" className="sr-only">
          Message
        </label>
        <textarea
          id="message-input"
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder="Type a message..."
          className={cn(
            "flex-1 resize-none rounded-xl border border-kampmax-border bg-kampmax-bg/40 px-3.5 py-2.5 text-sm",
            "placeholder:text-kampmax-text-secondary/60",
            "focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/30",
            "max-h-32 overflow-y-auto"
          )}
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          aria-label={pending ? "Sending message" : "Send message"}
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
            "bg-kampmax-blue text-white hover:bg-kampmax-blue/90",
            "disabled:opacity-50 disabled:hover:bg-kampmax-blue disabled:cursor-not-allowed"
          )}
        >
          {pending ? (
            <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden />
          ) : (
            <SendHorizontal className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>

      <div className="mt-1 flex items-center justify-between text-[10px] text-kampmax-text-secondary/70">
        <span>Enter to send &middot; Shift+Enter for a new line</span>
        <span className={cn(overLimit && "font-semibold text-kampmax-error")}>
          {text.length}/{MESSAGE_MAX_LENGTH}
        </span>
      </div>
    </form>
  );
}
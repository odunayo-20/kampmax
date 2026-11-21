"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { openCustomerConversation } from "@/services/messages-api";

/**
 * "Message customer" for the store owner: opens the same thread the buyer uses to
 * write to the store (never a separate private chat) and goes to it.
 */
export function MessageCustomerButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function open() {
    setBusy(true);
    setError("");
    try {
      router.push(`/chat/${await openCustomerConversation(customerId)}`);
    } catch {
      setError("Couldn't open the chat. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={open}
        disabled={busy}
        aria-busy={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-kampmax-navy px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-kampmax-navy/90 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
        )}
        Message Customer
      </button>
      {error && (
        <p role="alert" className="text-[11px] text-kampmax-error">
          {error}
        </p>
      )}
    </div>
  );
}

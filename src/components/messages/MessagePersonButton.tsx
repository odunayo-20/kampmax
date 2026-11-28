"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCandidateConversation } from "@/hooks";

/**
 * Opens the one-to-one chat with a person and goes there. `offer`: open the chat with its "Send an offer" form
 * already showing (a freelancer offering more work). One button for every "Message …" on contracts and applicants.
 */
export function MessagePersonButton({
  userId,
  label = "Message",
  offer = false,
  className = "rounded-md border border-kampmax-border px-3 py-1.5 text-sm font-semibold disabled:opacity-50",
}: {
  userId: string;
  label?: string;
  offer?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const openConversation = useCandidateConversation();
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);

  async function go() {
    setOpening(true);
    setFailed(false);
    const id = await openConversation(userId);
    if (!id) {
      setFailed(true);
      setOpening(false);
      return;
    }
    router.push(offer ? `/chat/${id}?offer=1` : `/chat/${id}`);
  }

  return (
    <span className="inline-flex flex-col">
      <button type="button" disabled={opening} onClick={() => void go()} className={className}>
        {opening ? "Opening…" : label}
      </button>
      {failed && <span role="alert" className="mt-1 text-xs text-error-600">We couldn&apos;t open the chat. Try again.</span>}
    </span>
  );
}

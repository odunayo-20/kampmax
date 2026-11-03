"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { useFreelancerAccess } from "@/hooks/use-freelancer-dashboard";
import type { Conversation } from "@/types";
import { SendOfferModal } from "./SendOfferModal";

/**
 * "Send an offer" strip above the composer. Only freelancers see it, and only in
 * a one-to-one person chat (the backend enforces both, this just avoids a dead end).
 */
export function OfferBar({ conversation }: { conversation: Conversation }) {
  const access = useFreelancerAccess();
  const [open, setOpen] = useState(false);

  const canSend =
    access.data?.canUseDashboard === true &&
    conversation.type === "direct" &&
    conversation.participants.length === 2;
  if (!canSend) return null;

  return (
    <>
      <div className="flex justify-end border-t border-kampmax-border bg-white px-3 pt-2 sm:px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-kampmax-border px-3 py-1.5 text-xs font-semibold text-kampmax-text hover:bg-kampmax-muted/50"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden />
          Send an offer
        </button>
      </div>
      {open && <SendOfferModal conversationId={conversation.id} onClose={() => setOpen(false)} />}
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Info, Store, Verified } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Conversation } from "@/types";
import { getConversationPeer } from "./message-utils";

interface ConversationHeaderProps {
  conversation: Conversation;
  infoOpen: boolean;
  onToggleInfo: () => void;
}

export function ConversationHeader({ conversation, infoOpen, onToggleInfo }: ConversationHeaderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const peer = getConversationPeer(user!.id, conversation);

  return (
    <div className="bg-kampmax-navy px-3 py-2.5 flex items-center gap-3 flex-shrink-0 z-10">
      <button
        type="button"
        onClick={() => router.push("/chat")}
        aria-label="Back to conversations"
        className="lg:hidden text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </button>

      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm",
          peer.isVendor ? "bg-kampmax-gold text-kampmax-navy" : "bg-white/10 text-white"
        )}
      >
        {peer.isVendor ? <Store className="h-5 w-5" aria-hidden /> : peer.name.charAt(0)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
          <span className="truncate">{peer.name}</span>
          {false && (
            <Verified className="h-3.5 w-3.5 text-kampmax-gold flex-shrink-0" aria-label="Verified" />
          )}
        </p>
        <p className="text-[11px] text-white/50">{peer.roleLabel}</p>
      </div>

      <button
        type="button"
        onClick={onToggleInfo}
        aria-label={infoOpen ? "Hide conversation info" : "Show conversation info"}
        aria-pressed={infoOpen}
        className="hidden lg:inline-flex text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded p-1"
      >
        <Info className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
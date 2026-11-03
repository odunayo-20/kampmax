"use client";

import { useEffect, useRef, useState, use } from "react";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useStagedService } from "@/hooks/use-staged-service";
import {
  useConversation,
  useMarkConversationAsRead,
} from "@/hooks/use-messages";
import { ConversationHeader } from "@/components/messages/ConversationHeader";
import { ConversationInfoPanel } from "@/components/messages/ConversationInfoPanel";
import { ConversationList } from "@/components/messages/ConversationList";
import { MessageComposer } from "@/components/messages/MessageComposer";
import { MessageThread } from "@/components/messages/MessageThread";
import { OfferBar } from "@/components/messages/OfferBar";

/**
 * Direct-message thread. Desktop = left conversation list + thread (+optional
 * info panel); mobile = thread with a back button.
 *
 * Access is verified before ANY message content is fetched: useConversation
 * resolves only for members and the thread query stays disabled otherwise.
 * A missing or non-member conversation renders the same neutral "unavailable"
 * state, so the existence of private conversations is never revealed.
 */
export default function ChatScreenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = use(params);
  const { service: serviceParam } = use(searchParams);
  const { user } = useAuth();
  const [infoOpen, setInfoOpen] = useState(false);

  const conversationQuery = useConversation(id);
  const markReadMutation = useMarkConversationAsRead();
  const markedConversationRef = useRef<string | null>(null);

  const conversation = conversationQuery.data;
  const isParticipant = !!conversation;

  // The address is untrusted: a service is staged only if it is live and its
  // owner is in this chat (see useStagedService).
  const staged = useStagedService(conversation?.participants ?? [], serviceParam);

  // Mark-as-read: effect, once per conversation open (never per render), and
  // only after membership is confirmed. The store flips incoming read flags
  // and unreadCount, then the sync bridge invalidates the badge/list.
  useEffect(() => {
    if (!conversation || !user) return;
    if (markedConversationRef.current === conversation.id) return;
    markedConversationRef.current = conversation.id;
    markReadMutation.mutate(conversation.id);
  }, [conversation, user, markReadMutation]);

  return (
    <div className="flex h-[calc(100dvh-56px)] lg:h-[calc(100vh-60px)] pb-[64px] lg:pb-0">
      {/* Left: conversation list (desktop) */}
      <div className="hidden lg:block w-[340px] xl:w-[380px] lg:flex-shrink-0 border-r border-kampmax-border bg-white">
        <ConversationList activeConversationId={id} />
      </div>

      {/* Right: thread */}
      <div className="flex flex-1 min-w-0">
        {conversationQuery.isPending ? (
          <div className="flex-1 flex flex-col min-w-0 bg-kampmax-bg">
            <div className="h-[52px] flex-shrink-0" aria-hidden />
            <div className="flex-1 px-4 py-4 space-y-3 animate-pulse">
              {[140, 260, 200, 300, 120, 240].map((width, index) => (
                <div
                  key={index}
                  className={`h-9 rounded-2xl bg-kampmax-muted ${index % 3 === 1 ? "ml-auto" : ""} ${
                    index % 3 === 1 ? "rounded-br-sm" : "rounded-bl-sm"
                  }`}
                  style={{ width }}
                />
              ))}
            </div>
          </div>
        ) : conversationQuery.isError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-kampmax-bg px-6 text-center">
            <MessageCircle className="h-10 w-10 text-kampmax-text-secondary/30" aria-hidden />
            <p className="text-sm font-semibold text-kampmax-text">
              This conversation isn&apos;t available
            </p>
            <p className="text-xs text-kampmax-text-secondary max-w-xs">
              It may have ended or you don&apos;t have access to it.
            </p>
          </div>
        ) : conversation ? (
          <div className="flex flex-1 min-w-0">
            <div className="flex flex-1 flex-col min-w-0 bg-kampmax-bg">
              <ConversationHeader
                conversation={conversation}
                infoOpen={infoOpen}
                onToggleInfo={() => setInfoOpen((open) => !open)}
              />
              <MessageThread conversation={conversation} isParticipant={isParticipant} />
              <OfferBar conversation={conversation} />
              <MessageComposer
                conversationId={conversation.id}
                stagedService={staged.service}
                onClearService={staged.clear}
              />
            </div>
            {infoOpen && <ConversationInfoPanel conversation={conversation} />}
          </div>
        ) : null}
      </div>
    </div>
  );
}
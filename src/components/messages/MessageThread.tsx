"use client";

import { useEffect, useRef } from "react";
import { ChevronUp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useMessages } from "@/hooks/use-messages";
import { Conversation, Message } from "@/types";
import { MessageItem } from "./MessageItem";
import { MessageThreadSkeleton } from "./skeletons";
import { formatConversationDate, THREAD_EMPTY, THREAD_ERROR_TITLE } from "./message-utils";

interface MessageThreadProps {
  conversation: Conversation;
  isParticipant: boolean;
}

/**
 * Article list for one conversation. Newest first page = bottom of the
 * thread; older pages load via `fetchPreviousPage`. Auto-scrolls to the
 * newest message on first load and on new incoming/outgoing messages, but
 * preserves position when older messages are prepended.
 */
export function MessageThread({ conversation, isParticipant }: MessageThreadProps) {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const seenLastIdRef = useRef<string | null>(null);

  const messagesQuery = useMessages(conversation.id, isParticipant);
  const flattened = messagesQuery.data?.flattened ?? [];

  // Safely derive a tail marker only for rendering (data may still be loading).
  const lastMessageId = flattened.length > 0 ? flattened[flattened.length - 1].id : null;

  useEffect(() => {
    if (!lastMessageId) return;
    const container = scrollRef.current;
    const end = endRef.current;
    if (seenLastIdRef.current === null) {
      // First successful render: jump to the newest message.
      container?.scrollTo({ top: container.scrollHeight });
    } else if (seenLastIdRef.current !== lastMessageId) {
      // A new message arrived (sent or received) — follow it smoothly.
      end?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    seenLastIdRef.current = lastMessageId;
  }, [lastMessageId]);

  const groups: Array<{ date: string; items: Message[] }> = [];
  for (const message of flattened) {
    const date = formatConversationDate(message.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.items.push(message);
    else groups.push({ date, items: [message] });
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
        <div className="px-4 py-4 space-y-1.5">
          {messagesQuery.isPending ? (
            <MessageThreadSkeleton />
          ) : messagesQuery.isError ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-kampmax-text">{THREAD_ERROR_TITLE}</p>
              <button
                type="button"
                onClick={() => messagesQuery.refetch()}
                className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold text-white bg-kampmax-blue hover:bg-kampmax-blue/90"
              >
                Try again
              </button>
            </div>
          ) : flattened.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-kampmax-text-secondary">{THREAD_EMPTY}</p>
            </div>
          ) : (
            <>
              {messagesQuery.hasPreviousPage && (
                <div className="py-2 text-center">
                  <button
                    type="button"
                    onClick={() => messagesQuery.fetchPreviousPage()}
                    disabled={messagesQuery.isFetchingPreviousPage}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-kampmax-text-secondary border border-kampmax-border bg-white hover:bg-kampmax-muted/50 disabled:opacity-60"
                  >
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                    {messagesQuery.isFetchingPreviousPage ? "Loading..." : "Load older messages"}
                  </button>
                </div>
              )}

              {groups.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center justify-center my-3">
                    <span className="bg-kampmax-navy/10 text-kampmax-text-secondary text-[11px] font-medium px-3 py-1 rounded-full">
                      {group.date}
                    </span>
                  </div>
                  {group.items.map((message, index) => {
                    const isMine = message.senderId === user!.id;
                    const next = group.items[index + 1];
                    const showTail = !next || next.senderId !== message.senderId;
                    return (
                      <MessageItem
                        key={message.id}
                        message={message}
                        isMine={isMine}
                        showTail={showTail}
                      />
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>
        <div ref={endRef} aria-hidden />
      </div>
    </div>
  );
}
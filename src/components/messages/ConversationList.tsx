"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Inbox, MessageCircle, Search, Store, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  useConversations,
  useDebouncedValue,
  useMarkAllMessagesAsRead,
  useUnreadMessageCount,
} from "@/hooks/use-messages";
import { MESSAGE_SEARCH_DEBOUNCE_MS } from "@/config/messaging";
import { getConversationPeer, getConversationSnippet, formatConversationTime } from "./message-utils";
import { UnreadMessageBadge } from "./UnreadMessageBadge";
import { ConversationListSkeleton } from "./skeletons";

interface ConversationListProps {
  /** Conversation highlighted in the list (thread page left panel). */
  activeConversationId?: string | null;
  /** Overrides default navigation to /chat/:id (used by embedded panels). */
  onConversationSelected?: (id: string) => void;
  className?: string;
}

/**
 * Reusable conversation list with debounced search, pagination, mark-all-read
 * and per-conversation unread badges. Used both as the full `/chat` page and
 * as the left panel of the desktop thread layout.
 */
export function ConversationList({
  activeConversationId,
  onConversationSelected,
  className,
}: ConversationListProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), MESSAGE_SEARCH_DEBOUNCE_MS);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const conversationsQuery = useConversations({ search });
  const unreadQuery = useUnreadMessageCount();
  const markAllMutation = useMarkAllMessagesAsRead();

  const conversations = conversationsQuery.data?.flattened ?? [];
  const totalUnread = unreadQuery.data ?? 0;

  function selectConversation(id: string) {
    if (onConversationSelected) {
      onConversationSelected(id);
    } else {
      router.push(`/chat/${id}`);
    }
  }

  return (
    <div className={cn("flex h-full flex-col bg-white", className)}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-kampmax-border">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-kampmax-text">Messages</h1>
            {totalUnread > 0 && (
              <p className="text-xs text-kampmax-text-secondary mt-0.5">
                {totalUnread} unread message{totalUnread > 1 ? "s" : ""}
              </p>
            )}
          </div>
          {totalUnread > 0 && (
            <button
              type="button"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-kampmax-blue bg-kampmax-blue/10 hover:bg-kampmax-blue/20 disabled:opacity-60"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              Mark all read
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-kampmax-text-secondary"
            aria-hidden
          />
          <label htmlFor="conversation-search" className="sr-only">
            Search conversations
          </label>
          <input
            id="conversation-search"
            ref={searchInputRef}
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-kampmax-border text-sm bg-kampmax-bg/40 focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/30"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                searchInputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-kampmax-text-secondary hover:text-kampmax-text"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0" aria-label="Conversation list">
        {conversationsQuery.isPending ? (
          <ConversationListSkeleton />
        ) : conversationsQuery.isError ? (
          <div className="px-6 py-12 text-center">
            <MessageCircle className="h-10 w-10 text-kampmax-text-secondary/30 mx-auto mb-3" aria-hidden />
            <p className="text-sm font-medium text-kampmax-text">Could not load conversations</p>
            <p className="text-xs text-kampmax-text-secondary mt-1">Please try again.</p>
            <button
              type="button"
              onClick={() => conversationsQuery.refetch()}
              className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold text-white bg-kampmax-blue hover:bg-kampmax-blue/90"
            >
              Retry
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Inbox className="h-10 w-10 text-kampmax-text-secondary/30 mx-auto mb-3" aria-hidden />
            <p className="text-sm font-medium text-kampmax-text">
              {search ? "No conversations found" : "No messages yet"}
            </p>
            <p className="text-xs text-kampmax-text-secondary mt-1">
              {search
                ? "Try a different search term"
                : "Start a conversation from a product page or a seller's store"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-kampmax-border">
            {conversations.map((conversation) => {
              const peer = getConversationPeer(user!.id, conversation);
              const active = conversation.id === activeConversationId;
              const snippet = getConversationSnippet(conversation, user!.id);
              const unread = conversation.unreadCount;

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => selectConversation(conversation.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
                    active
                      ? "bg-kampmax-blue/10"
                      : "hover:bg-kampmax-muted/50 active:bg-kampmax-muted"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm",
                      peer.isVendor ? "bg-kampmax-gold text-kampmax-navy" : "bg-kampmax-navy"
                    )}
                  >
                    {peer.isVendor ? <Store className="h-5 w-5" aria-hidden /> : peer.name.charAt(0)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={cn(
                          "text-sm truncate",
                          unread > 0 ? "font-bold text-kampmax-text" : "font-semibold text-kampmax-text"
                        )}
                      >
                        {peer.name}
                      </span>
                      {peer.isVendor && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-kampmax-gold/10 text-kampmax-gold font-semibold flex-shrink-0">
                          VENDOR
                        </span>
                      )}
                      {conversation.isPinned && (
                        <span className="sr-only">Pinned</span>
                      )}
                      {conversation.isMuted && (
                        <span className="sr-only">Muted</span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-xs truncate",
                        unread > 0 ? "text-kampmax-text font-medium" : "text-kampmax-text-secondary"
                      )}
                    >
                      {snippet}
                    </p>
                  </div>

                  {/* Time + unread */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {conversation.lastMessage && (
                      <span
                        className={cn(
                          "text-[10px]",
                          unread > 0 ? "text-kampmax-blue font-semibold" : "text-kampmax-text-secondary/60"
                        )}
                      >
                        {formatConversationTime(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                    <UnreadMessageBadge
                      count={unread}
                      ariaLabel={`${unread} unread message${unread > 1 ? "s" : ""} from ${peer.name}`}
                    />
                  </div>
                </button>
              );
            })}

            {conversationsQuery.hasNextPage && (
              <div className="p-3 text-center">
                <button
                  type="button"
                  onClick={() => conversationsQuery.fetchNextPage()}
                  disabled={conversationsQuery.isFetchingNextPage}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-kampmax-blue bg-kampmax-blue/10 hover:bg-kampmax-blue/20 disabled:opacity-60"
                >
                  {conversationsQuery.isFetchingNextPage ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
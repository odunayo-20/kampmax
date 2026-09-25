"use client";

import { useEffect, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { MessageListFilters, messageKeys } from "@/lib/query-keys";
import {
  fetchConversation,
  fetchConversations,
  fetchMessagesPage,
  fetchUnreadTotal,
  markConversationReadApi,
  sendMessageApi,
} from "@/services/messages-api";
import { Conversation, Message } from "@/types";
import { CONVERSATIONS_PAGE_SIZE, MESSAGES_PAGE_SIZE } from "@/config/messaging";

/** There is no push channel yet, so open views poll at these cadences. */
const THREAD_POLL_MS = 5_000;
const LIST_POLL_MS = 15_000;

/**
 * Debounced search value so the conversations query key changes at most
 * `delayMs` after the user's last keystroke (no request per keystroke).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export interface ConversationPagePayload {
  items: Conversation[];
  nextCursor: number | null;
  hasMore: boolean;
}

export interface MessagePagePayload {
  items: Message[];
  olderCursor: number | null;
}

function useSessionUserId() {
  const { status, user } = useAuth();
  const userId = user?.id ?? null;
  return { userId, enabled: status === "authenticated" && !!userId };
}

// ────────────────────────────────────────────────────────────────
// Reads
// ────────────────────────────────────────────────────────────────

/** Does this conversation match the inbox search (peer name, store name or last message)? */
function matchesSearch(conversation: Conversation, userId: string, needle: string): boolean {
  if (conversation.lastMessage?.text.toLowerCase().includes(needle)) return true;
  if (conversation.vendorName?.toLowerCase().includes(needle)) return true;
  return conversation.participants.some(
    (id) => id !== userId && (conversation.participantNames?.[id] ?? "").toLowerCase().includes(needle)
  );
}

/**
 * Multi-page conversation list (newest activity first). Search is applied
 * over the loaded pages, so each debounced term is its own cached query.
 */
export function useConversations(
  filters: MessageListFilters = { search: "" },
  options?: { pageSize?: number }
) {
  const { userId, enabled } = useSessionUserId();
  const pageSize = options?.pageSize ?? CONVERSATIONS_PAGE_SIZE;
  const needle = filters.search.trim().toLowerCase();

  return useInfiniteQuery({
    queryKey: messageKeys.conversations(userId ?? "", filters),
    enabled,
    initialPageParam: 1,
    refetchInterval: LIST_POLL_MS,
    queryFn: async ({ pageParam }): Promise<ConversationPagePayload> => {
      const res = await fetchConversations(pageParam, pageSize);
      const items = needle ? res.items.filter((c) => matchesSearch(c, userId!, needle)) : res.items;
      return { items, nextCursor: res.hasMore ? pageParam + 1 : null, hasMore: res.hasMore };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      flattened: data.pages.flatMap((page) => page.items),
    }),
  });
}

/**
 * Single conversation, verified server-side. A missing conversation and one
 * the user doesn't belong to are indistinguishable (both surface as NOT_FOUND)
 * so the existence of private chats is never revealed.
 */
export function useConversation(conversationId: string) {
  const { userId, enabled: authed } = useSessionUserId();

  return useQuery({
    queryKey: messageKeys.conversation(conversationId, userId ?? ""),
    enabled: authed && !!conversationId,
    queryFn: async () => {
      try {
        return await fetchConversation(conversationId);
      } catch {
        throw Object.assign(new Error("Conversation not found"), { code: "NOT_FOUND" });
      }
    },
    retry: false,
  });
}

/**
 * Newest-last message thread. The first page holds the most recent messages;
 * older pages load backwards via `fetchPreviousPage`. Only enabled once the
 * user is confirmed a participant.
 */
export function useMessages(
  conversationId: string,
  isParticipant: boolean,
  options?: { pageSize?: number }
) {
  const { userId, enabled: authed } = useSessionUserId();
  const enabled = authed && !!conversationId && isParticipant;
  const pageSize = options?.pageSize ?? MESSAGES_PAGE_SIZE;

  return useInfiniteQuery<
    MessagePagePayload & { page: number },
    Error,
    { pages: MessagePagePayload[]; pageParams: number[]; flattened: Message[] },
    ReturnType<typeof messageKeys.thread>,
    number
  >({
    queryKey: messageKeys.thread(conversationId, userId ?? ""),
    enabled,
    initialPageParam: 1,
    refetchInterval: THREAD_POLL_MS,
    queryFn: async ({ pageParam }) => {
      const res = await fetchMessagesPage(conversationId, pageParam, pageSize);
      return {
        items: res.items,
        olderCursor: res.hasOlder ? pageParam + 1 : null,
        page: pageParam,
      };
    },
    // Newest-last thread: only older pages are ever requested.
    getNextPageParam: () => null,
    getPreviousPageParam: (firstPage) => firstPage.olderCursor,
    select: (data) => {
      // Server page 1 = newest; keep pages ordered oldest → newest for display.
      const ordered = [...data.pages].sort((a, b) => b.page - a.page);
      return {
        pages: ordered,
        pageParams: data.pageParams,
        flattened: ordered.flatMap((page) => page.items),
      };
    },
  });
}

/** Shared header/badge counter (separate key so bumping it never refetches threads). */
export function useUnreadMessageCount() {
  const { userId, enabled } = useSessionUserId();

  return useQuery({
    queryKey: messageKeys.unreadCount(userId ?? ""),
    enabled,
    refetchInterval: LIST_POLL_MS,
    queryFn: fetchUnreadTotal,
  });
}

// ────────────────────────────────────────────────────────────────
// Mutations
// ────────────────────────────────────────────────────────────────

export interface SendMessageInput {
  conversationId: string;
  text: string;
}

/**
 * Sends a message. The sender comes from the session on the server (never the
 * client). The composer stays disabled while pending and only clears after
 * this resolves, so a failure never loses the draft.
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { userId } = useSessionUserId();

  return useMutation({
    mutationFn: ({ conversationId, text }: SendMessageInput): Promise<Message> =>
      sendMessageApi(conversationId, text),
    onSettled: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: messageKeys.all });
    },
  });
}

/** Marks a conversation read once per open; refreshes badges and the list. */
export function useMarkConversationAsRead() {
  const queryClient = useQueryClient();
  const { userId } = useSessionUserId();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      await markConversationReadApi(conversationId);
      return conversationId;
    },
    onSettled: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: messageKeys.all });
    },
  });
}

/** Marks every unread conversation in the inbox as read. */
export function useMarkAllMessagesAsRead() {
  const queryClient = useQueryClient();
  const { userId } = useSessionUserId();

  return useMutation({
    mutationFn: async () => {
      const { items } = await fetchConversations(1, 100);
      await Promise.all(
        items.filter((c) => c.unreadCount > 0).map((c) => markConversationReadApi(c.id))
      );
    },
    onSettled: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: messageKeys.all });
    },
  });
}

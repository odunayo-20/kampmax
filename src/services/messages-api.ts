import { apiClient, type ApiError } from "@/lib/api-client";
import type { Conversation, Message } from "@/types";

// ============================================================
// MESSAGING — LIVE API LAYER
// ============================================================
//   GET  /conversations                       my conversations (newest activity first)
//   GET  /conversations/:id                   detail (members only)
//   GET  /conversations/:id/messages          newest-first pages
//   POST /conversations                       open a chat (VENDOR → store, DIRECT → user)
//   POST /conversations/:id/messages          { content }
//   POST /conversations/:id/read              mark read
//
// Membership is enforced by the backend: a non-member gets 403/404, which the
// UI treats as a neutral "conversation unavailable".

interface BackendPage<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface BackendParticipant {
  userId: string;
  name: string;
  role: string;
}

interface BackendConversation {
  id: string;
  type: "DIRECT" | "GROUP" | "CAMPUS" | "VENDOR";
  title: string | null;
  vendorId: string | null;
  vendorName: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  createdAt: string;
  participants: BackendParticipant[];
}

interface BackendMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  status: string;
  createdAt: string;
}

async function unwrap<T>(
  request: Promise<{ data: T; error: ApiError | null }>
): Promise<T> {
  const { data, error } = await request;
  if (error || data == null) throw error ?? new Error("Empty response from server");
  return data;
}

// ── Mapping ──────────────────────────────────────────────────

export function mapMessage(m: BackendMessage): Message {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    text: m.status === "DELETED" || m.content == null ? "This message was deleted" : m.content,
    createdAt: m.createdAt,
    read: true,
  };
}

export function mapConversation(c: BackendConversation): Conversation {
  const updatedAt = c.lastMessageAt ?? c.createdAt;
  return {
    id: c.id,
    type: c.type === "VENDOR" ? "vendor_chat" : "direct",
    participants: c.participants.map((p) => p.userId),
    participantNames: Object.fromEntries(c.participants.map((p) => [p.userId, p.name])),
    participantRoles: Object.fromEntries(c.participants.map((p) => [p.userId, p.role])),
    vendorName: c.vendorName ?? undefined,
    vendorId: c.vendorId ?? undefined,
    lastMessage: c.lastMessagePreview
      ? {
          id: `${c.id}-preview`,
          conversationId: c.id,
          senderId: "",
          text: c.lastMessagePreview,
          createdAt: updatedAt,
          read: c.unreadCount === 0,
        }
      : undefined,
    unreadCount: c.unreadCount,
    createdAt: c.createdAt,
    updatedAt,
  };
}

// ── Queries ──────────────────────────────────────────────────

export async function fetchConversations(page = 1, limit = 20) {
  const res = await unwrap(
    apiClient.get<BackendPage<BackendConversation>>(`/conversations?page=${page}&limit=${limit}`)
  );
  return {
    items: res.items.map(mapConversation),
    hasMore: res.meta.page < res.meta.totalPages,
  };
}

export async function fetchConversation(id: string): Promise<Conversation> {
  return mapConversation(await unwrap(apiClient.get<BackendConversation>(`/conversations/${id}`)));
}

/** Newest-first page from the API, returned oldest-first for display. */
export async function fetchMessagesPage(conversationId: string, page: number, limit: number) {
  const res = await unwrap(
    apiClient.get<BackendPage<BackendMessage>>(
      `/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    )
  );
  return {
    items: res.items.map(mapMessage).reverse(),
    hasOlder: res.meta.page < res.meta.totalPages,
  };
}

/** Total unread messages across the inbox. */
export async function fetchUnreadTotal(): Promise<number> {
  const res = await fetchConversations(1, 100);
  return res.items.reduce((sum, c) => sum + c.unreadCount, 0);
}

// ── Commands ─────────────────────────────────────────────────

export async function sendMessageApi(conversationId: string, text: string): Promise<Message> {
  return mapMessage(
    await unwrap(
      apiClient.post<{ content: string }, BackendMessage>(`/conversations/${conversationId}/messages`, {
        content: text,
      })
    )
  );
}

export async function markConversationReadApi(conversationId: string): Promise<void> {
  const { error } = await apiClient.post(`/conversations/${conversationId}/read`);
  if (error) throw error;
}

/** Opens (or reopens) the customer's chat with a store. Returns the conversation id. */
export async function openVendorConversation(vendorId: string): Promise<string> {
  const c = await unwrap(
    apiClient.post<{ type: "VENDOR"; vendorId: string }, BackendConversation>("/conversations", {
      type: "VENDOR",
      vendorId,
    })
  );
  return c.id;
}

/** Opens (or reopens) a one-to-one chat with another user. Returns the conversation id. */
export async function openDirectConversation(peerUserId: string): Promise<string> {
  const c = await unwrap(
    apiClient.post<{ type: "DIRECT"; participantIds: string[] }, BackendConversation>("/conversations", {
      type: "DIRECT",
      participantIds: [peerUserId],
    })
  );
  return c.id;
}

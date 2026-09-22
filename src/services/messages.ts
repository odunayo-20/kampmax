import { apiClient } from "@/lib/api-client";
import { Conversation, Message } from "@/types";
import { getUserById, getVendorByUserId } from "@/services/users";
import {
  getConversationsByUser as _getConversationsByUser,
  getConversationById as _getConversationById,
  getMessagesByConversation as _getMessagesByConversation,
  getOrCreateDirectConversationRecord,
  sendMessageRecord,
  markConversationReadRecord,
  markAllMessagesReadRecord,
} from "@/data/conversations";

function byNewest(a: Conversation, b: Conversation): number {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function byOldest(a: Message, b: Message): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export async function getConversationsApi(userId: string): Promise<Conversation[]> {
  const { data, error } = await apiClient.get<Conversation[]>("/messaging/conversations");
  if (!error && Array.isArray(data)) {
    return data.sort(byNewest);
  }
  return getConversations(userId);
}

export async function getMessagesApi(conversationId: string): Promise<Message[]> {
  const { data, error } = await apiClient.get<Message[]>(`/messaging/conversations/${conversationId}/messages`);
  if (!error && Array.isArray(data)) {
    return data.sort(byOldest);
  }
  return getMessages(conversationId);
}

export async function sendMessageApi(
  conversationId: string,
  senderId: string,
  text: string,
  extra?: Partial<Message>
): Promise<Message> {
  const { data, error } = await apiClient.post<{ text: string; extra?: Partial<Message> }, Message>(
    `/messaging/conversations/${conversationId}/messages`,
    { text, extra }
  );
  if (!error && data && data.id) {
    return data;
  }
  return sendMessage(conversationId, senderId, text, extra);
}

export async function markAsReadApi(conversationId: string, userId: string): Promise<void> {
  await apiClient.post(`/messaging/conversations/${conversationId}/read`);
  markAsRead(conversationId, userId);
}

export function getConversations(userId: string): Conversation[] {
  return _getConversationsByUser(userId).sort(byNewest);
}

/**
 * Authorized single-conversation lookup. Membership is verified first,
 * mirroring the backend rule that a user can only receive conversations they
 * belong to (IDOR/BOLA-safe). A non-existent and an inaccessible conversation
 * are deliberately indistinguishable: both return undefined so the UI can
 * show a neutral "unavailable" state without revealing other users' messages.
 */
export function getConversationForUser(
  id: string,
  userId: string
): Conversation | undefined {
  const conversation = _getConversationById(id);
  if (!conversation) return undefined;
  if (!conversation.participants.includes(userId)) return undefined;
  return conversation;
}

export function getConversationById(id: string): Conversation | undefined {
  return _getConversationById(id);
}

/**
 * Finds or creates a direct conversation between two users (Module 28
 * "Message candidate"). Service layer guards: both users must exist and be
 * distinct — a self-chat is invalid. The backend store owns id generation.
 */
export function getOrCreateDirectConversation(
  userAId: string,
  userBId: string
): { created: boolean; conversation: Conversation } | null {
  if (!userAId || !userBId || userAId === userBId) return null;
  if (!getUserById(userAId) || !getUserById(userBId)) return null;
  return getOrCreateDirectConversationRecord(userAId, userBId);
}

export function getMessages(conversationId: string): Message[] {
  return _getMessagesByConversation(conversationId).sort(byOldest);
}

export function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
  extra?: Partial<Message>
): Message {
  return sendMessageRecord(conversationId, senderId, text, extra);
}

export function markAsRead(conversationId: string, userId: string): void {
  markConversationReadRecord(conversationId, userId);
}

export function markAllAsRead(userId: string): void {
  markAllMessagesReadRecord(userId);
}

export function getTotalUnreadCount(userId: string): number {
  return _getConversationsByUser(userId).reduce((sum, c) => sum + c.unreadCount, 0);
}

export function searchConversations(userId: string, query: string): Conversation[] {
  const q = query.trim().toLowerCase();
  const all = getConversations(userId);
  if (!q) return all;

  return all.filter((c) => {
    if (c.lastMessage?.text.toLowerCase().includes(q)) return true;
    const peerId = c.participants.find((p) => p !== userId);
    if (!peerId) return false;
    const vendor = getVendorByUserId(peerId);
    if (vendor?.storeName.toLowerCase().includes(q)) return true;
    const user = getUserById(peerId);
    return user?.name.toLowerCase().includes(q) ?? false;
  });
}
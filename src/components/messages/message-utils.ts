import { Conversation } from "@/types";

/** What a chat's other side is called when it is a store. Buyers see "seller", never "vendor". */
export const SELLER_TAG = "Seller";

/** What the empty inbox says: nothing found for a search, or no chats yet. The app says the same. */
export function inboxEmpty(searching: boolean): { title: string; text: string } {
  return searching
    ? { title: "No conversations found", text: "Try a different name." }
    : {
        title: "No messages yet",
        text: "Message a seller from a product page, or a freelancer or client from a proposal or contract. Your chats show up here.",
      };
}

export const INBOX_ERROR_TITLE = "Couldn't load your messages";

/** "3 unread messages". */
export const unreadLine = (n: number): string => `${n} unread ${n === 1 ? "message" : "messages"}`;

export interface ConversationPeer {
  id: string;
  name: string;
  isVendor: boolean;
  roleLabel: string;
}

/**
 * Resolves the other participant from API-supplied conversation data. Only
 * public profile data (name / role) is exposed — never email or phone.
 */
export function getConversationPeer(
  userId: string,
  conversation: Conversation
): ConversationPeer {
  const peerId = conversation.participants.find((p) => p !== userId) ?? "";
  const peerRole = conversation.participantRoles?.[peerId];
  const isVendor = conversation.type === "vendor_chat" && peerRole === "VENDOR";
  const name =
    (isVendor ? conversation.vendorName : undefined) ||
    conversation.participantNames?.[peerId] ||
    "Unknown";
  return {
    id: peerId,
    name,
    isVendor,
    roleLabel: isVendor || peerRole === "VENDOR" ? SELLER_TAG : "Customer",
  };
}

export function getConversationSnippet(
  conversation: Conversation,
  currentUserId: string
): string {
  const last = conversation.lastMessage;
  if (!last) return "No messages yet";
  const prefix = last.senderId === currentUserId ? "You: " : "";
  if (last.sharedProduct) return `${prefix}Shared a product`;
  if (last.sharedOrder) return `${prefix}Shared an order`;
  if (last.imageUrl) return `${prefix}[Photo]`;
  const text = last.text || "No messages yet";
  return `${prefix}${text}`;
}

export function formatConversationTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) {
    return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  }
  if (days === 1) return "Yesterday";
  if (days < 7) {
    return d.toLocaleDateString("en-NG", { weekday: "short" });
  }
  return d.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

/** What a chat shows when it has no messages, and when it cannot be loaded. The app says the same. */
export const THREAD_EMPTY = "No messages yet. Say hello.";
export const THREAD_ERROR_TITLE = "Couldn't load this chat";

/** "Today", "Yesterday", else "Friday 20 Nov": the heading above a day's messages. */
export function formatConversationDate(dateStr: string, now = new Date()): string {
  const d = new Date(dateStr);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "short" });
}

export function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  preparing: "Being prepared",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status.toLowerCase()] ?? "Order update";
}
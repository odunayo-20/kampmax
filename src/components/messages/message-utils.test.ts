import { describe, expect, it } from "vitest";
import { getConversationPeer, inboxEmpty, SELLER_TAG, unreadLine } from "./message-utils";
import type { Conversation } from "@/types";

describe("message utils", () => {
  it("calls a store a seller, never a vendor", () => {
    const conversation = {
      id: "c",
      type: "vendor_chat",
      participants: ["me", "v1"],
      participantRoles: { v1: "VENDOR" },
      participantNames: { v1: "Ada Stores" },
      vendorName: "Ada Stores",
    } as unknown as Conversation;
    const peer = getConversationPeer("me", conversation);
    expect(peer.isVendor).toBe(true);
    expect(peer.roleLabel).toBe(SELLER_TAG);
    expect(SELLER_TAG).toBe("Seller");
  });

  it("says why the inbox is empty, and counts unread messages", () => {
    expect(inboxEmpty(true).title).toBe("No conversations found");
    expect(inboxEmpty(false).title).toBe("No messages yet");
    expect(inboxEmpty(false).text).toMatch(/Message a seller from a product page/);
    expect(unreadLine(1)).toBe("1 unread message");
    expect(unreadLine(4)).toBe("4 unread messages");
  });
});

describe("chat thread wording", () => {
  it("heads each day Today, Yesterday or the date, and words the empty and error states like the app", async () => {
    const { formatConversationDate, THREAD_EMPTY, THREAD_ERROR_TITLE } = await import("./message-utils");
    const now = new Date(2026, 10, 26, 15, 0);
    expect(formatConversationDate(new Date(2026, 10, 26, 9).toISOString(), now)).toBe("Today");
    expect(formatConversationDate(new Date(2026, 10, 25, 9).toISOString(), now)).toBe("Yesterday");
    expect(formatConversationDate(new Date(2026, 10, 20, 9).toISOString(), now)).toMatch(/20 Nov/);
    expect(THREAD_EMPTY).toBe("No messages yet. Say hello.");
    expect(THREAD_ERROR_TITLE).toBe("Couldn't load this chat");
  });
});

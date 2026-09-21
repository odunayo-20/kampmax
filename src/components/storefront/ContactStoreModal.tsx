"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, MessageCircle, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/atoms/Button";
import { getOrCreateDirectConversation, sendMessage } from "@/services/messages";
import { getVendorById } from "@/services/users";

interface ContactStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
  storeName: string;
}

/**
 * Customer-facing "Contact Vendor" entry point. This connects to Kampmax's
 * in-app messaging in production — we never expose a vendor's private phone or
 * email. Messages are routed through the platform for moderation and privacy.
 */
export function ContactStoreModal({
  isOpen,
  onClose,
  vendorId,
  storeName,
}: ContactStoreModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSend() {
    if (!message.trim() || sending || !user) return;
    setSending(true);

    try {
      const vendor = getVendorById(vendorId);
      const targetUserId = vendor?.userId || vendorId;
      const result = getOrCreateDirectConversation(user.id, targetUserId);

      if (result?.conversation) {
        sendMessage(result.conversation.id, user.id, message.trim());
        setSending(false);
        setSent(true);
        setTimeout(() => {
          setSent(false);
          setMessage("");
          onClose();
          router.push(`/chat/${result.conversation.id}`);
        }, 1000);
      } else {
        setSending(false);
        onClose();
        router.push("/chat");
      }
    } catch {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-store-title"
    >
      <div className="bg-white w-full max-w-md rounded-xl flex flex-col max-h-[85vh]">
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-kampmax-border">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-kampmax-blue" />
            <h2 id="contact-store-title" className="text-sm font-bold text-kampmax-text">
              Contact {storeName}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-kampmax-text-secondary hover:bg-kampmax-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-kampmax-success/10 flex items-center justify-center mx-auto mb-3">
              <Check className="h-6 w-6 text-kampmax-success" />
            </div>
            <p className="text-sm font-semibold text-kampmax-text">Message Sent</p>
            <p className="text-xs text-kampmax-text-secondary mt-1">
              The vendor will reply in your messages.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <p className="text-xs text-kampmax-text-secondary">
              Your message will be sent securely through Kampmax. The vendor&apos;s
              contact details stay private.
            </p>
            <label
              htmlFor="contact-message"
              className="block text-xs font-medium text-kampmax-text-secondary"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Ask ${storeName} a question...`}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-kampmax-border text-sm focus:outline-none focus:border-kampmax-blue resize-none"
            />
            <Button
              variant="primary"
              className="w-full"
              onClick={handleSend}
              disabled={!message.trim() || sending}
            >
              {sending ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Send Message"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

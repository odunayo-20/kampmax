"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Check, Send, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { requestQuote } from "@/services/service-marketplace";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import {
  LOCATION_OPTIONS,
  type ServiceMarketplaceFilters,
} from "./constants";

interface RequestQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  serviceName: string;
  providerId: string;
  providerDisplayName: string;
}

/**
 * Request-quote flow: the customer describes what they need, and the request is
 * sent to the provider as a message in their chat, where they reply with a quote.
 * There is NO negotiation, payment, or booking here.
 */
export function RequestQuoteModal({
  isOpen,
  onClose,
  serviceId,
  serviceName,
  providerId,
  providerDisplayName,
}: RequestQuoteModalProps) {
  const [requirements, setRequirements] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { status } = useAuth();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit() {
    if (sending) return;
    setError(null);
    setSending(true);
    try {
      const res = await requestQuote({
        serviceId,
        providerId,
        requirements: requirements.trim(),
        preferredDate: preferredDate || undefined,
        location: LOCATION_OPTIONS.find((o) => o.value === location)?.label || undefined,
        message: message.trim() || undefined,
      });
      setConversationId(res.conversationId);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-quote-title"
    >
      <div className="bg-white w-full max-w-lg rounded-xl flex flex-col max-h-[85vh]">
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary-600" />
            <h2 id="request-quote-title" className="text-sm font-bold text-neutral-900">
              Request a quote
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {conversationId ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-3">
              <Check className="h-6 w-6 text-success-600" />
            </div>
            <p className="text-sm font-semibold text-neutral-900">Request sent</p>
            <p className="text-xs text-neutral-500 mt-1">
              {providerDisplayName} will reply with a quote in your conversation.
            </p>
            <Link
              href={`/chat/${conversationId}`}
              className="mt-4 inline-flex rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Open conversation
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <p className="text-xs text-neutral-500">
              Tell {providerDisplayName} what you need for <strong>{serviceName}</strong>. They&apos;ll
              respond with a personalised quote.
            </p>

            {error && (
              <p className="text-xs text-error-600 bg-error-50 border border-error-200 rounded-lg p-2.5 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}

            <div>
              <label
                htmlFor="quote-requirements"
                className="block text-xs font-medium text-neutral-600 mb-1.5"
              >
                What do you need? <span className="text-error-500">*</span>
              </label>
              <textarea
                id="quote-requirements"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="e.g. I need my lecture presentation printed and spiral bound, 40 pages, colour, before Friday."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:border-primary-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="quote-date"
                  className="block text-xs font-medium text-neutral-600 mb-1.5"
                >
                  Preferred date (optional)
                </label>
                <input
                  id="quote-date"
                  type="date"
                  value={preferredDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label
                  htmlFor="quote-location"
                  className="block text-xs font-medium text-neutral-600 mb-1.5"
                >
                  Where?
                </label>
                <select
                  id="quote-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value as ServiceMarketplaceFilters["locationType"])}
                  className="w-full h-10 px-3 rounded-lg border border-neutral-200 text-sm bg-white focus:outline-none focus:border-primary-500"
                >
                  <option value="">Not specified</option>
                  {LOCATION_OPTIONS.filter((o) => o.value !== "").map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="quote-message"
                className="block text-xs font-medium text-neutral-600 mb-1.5"
              >
                Anything else? (optional)
              </label>
              <textarea
                id="quote-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Budget range, deadlines, contact details..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:border-primary-500 resize-none"
              />
            </div>

            <button
              onClick={() => void handleSubmit()}
              disabled={!requirements.trim() || sending}
              className={cn(
                "w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-colors",
                requirements.trim() && !sending
                  ? "bg-primary-600 hover:bg-primary-700"
                  : "bg-neutral-300 cursor-not-allowed"
              )}
            >
              {sending ? "Sending…" : "Send request"}
            </button>
            {status !== "authenticated" && (
              <p className="text-[11px] text-neutral-500 text-center">
                You need to{" "}
                <Link href="/login" className="font-semibold text-primary-600 hover:underline">
                  sign in
                </Link>{" "}
                to send a request.
              </p>
            )}
            <p className="text-[11px] text-neutral-400 text-center">
              The provider replies with a quote in your chat. No payment is taken here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
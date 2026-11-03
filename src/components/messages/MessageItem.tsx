import { Package } from "lucide-react";
import { Message } from "@/types";
import { cn, formatNaira } from "@/lib/utils";
import { parseOfferId } from "@/services/offers-api";
import { splitServiceMarker } from "@/services/service-share";
import { MessageText } from "./MessageText";
import { MessageStatus } from "./MessageStatus";
import { OfferCard } from "./OfferCard";
import { ServiceCard } from "./ServiceCard";
import { formatMessageTime, getOrderStatusLabel } from "./message-utils";

interface MessageItemProps {
  message: Message;
  isMine: boolean;
  /** Restarts rounded corners when the following message has a different sender. */
  showTail: boolean;
}

/**
 * A single message bubble. All content is plain text (no raw HTML); seeded
 * shared-product/order cards render read-only with a placeholder icon and NO
 * navigation — the backend must supply a verified reference+URL before any
 * link is added (backend gap). `img` previews render in a loading="lazy" img
 * only for stored image URLs the backend actually serves; there is no
 * client-side upload path today.
 */
export function MessageItem({ message, isMine, showTail }: MessageItemProps) {
  const offerId = parseOfferId(message.text);
  // A message is an offer card OR text with a shared service, never both.
  const shared = offerId ? null : splitServiceMarker(message.text);
  const serviceId = shared?.serviceId ?? null;
  const bodyText = shared ? shared.body : message.text;
  const hasCard = !!message.sharedProduct || !!message.sharedOrder || !!offerId || !!serviceId;
  // Offer cards keep their own light panel on both sides of the thread.
  const onLight = !isMine || !!offerId;
  const bubbleBase = "relative max-w-[78%] px-3.5 py-2 text-sm shadow-sm";
  const bubbleShape = isMine
    ? cn("rounded-2xl", showTail ? "rounded-br-md" : "rounded-br-sm")
    : cn("rounded-2xl", showTail ? "rounded-bl-md" : "rounded-bl-sm");
  const bubbleColor = onLight
    ? "bg-white text-kampmax-text border border-kampmax-border"
    : "bg-kampmax-blue text-white";

  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div className={cn(bubbleBase, bubbleShape, bubbleColor, hasCard && "max-w-[85%] sm:max-w-[70%]")}>
        {message.sharedProduct ? (
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-kampmax-muted flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-kampmax-text-secondary" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-kampmax-text-secondary">
                Shared product
              </p>
              <p className="font-semibold truncate">{message.sharedProduct.title}</p>
              <p className="text-xs text-kampmax-text-secondary">
                {formatNaira(message.sharedProduct.price)} &middot; {message.sharedProduct.condition}
              </p>
            </div>
          </div>
        ) : message.sharedOrder ? (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <span className="block w-11 h-11 rounded-lg bg-kampmax-muted" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-kampmax-text-secondary">
                Order update
              </p>
              <p className="font-semibold truncate">{message.sharedOrder.id}</p>
              <p className="text-xs text-kampmax-text-secondary">
                {getOrderStatusLabel(message.sharedOrder.status)} &middot; {formatNaira(message.sharedOrder.total)}
              </p>
            </div>
          </div>
        ) : offerId ? (
          <OfferCard offerId={offerId} />
        ) : (
          <>
            {bodyText && <MessageText text={bodyText} />}
            {serviceId && (
              <div className={bodyText ? "mt-2" : undefined}>
                <ServiceCard serviceId={serviceId} />
              </div>
            )}
            {message.imageUrl && (
              <img
                src={message.imageUrl}
                alt="Shared image"
                loading="lazy"
                className="mt-1.5 rounded-xl max-h-64 w-full object-cover"
              />
            )}
          </>
        )}

        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px] leading-none",
            onLight ? "text-kampmax-text-secondary/70" : "text-white/70"
          )}
        >
          <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
          <MessageStatus read={message.read} isMine={isMine && !offerId} />
        </div>
      </div>
    </div>
  );
}
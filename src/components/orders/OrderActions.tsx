"use client";

import { MessageCircle, RotateCcw, Star, Truck, XCircle } from "lucide-react";
import Link from "next/link";
import { Order } from "@/types";
import { cn } from "@/lib/utils";

interface OrderActionsProps {
  order: Order;
  onCancel: () => void;
  onReorder: () => void;
  onReview: () => void;
  onContactVendor: () => void;
  onTrack?: () => void;
  isReviewed?: boolean;
}

export function OrderActions({
  order,
  onCancel,
  onReorder,
  onReview,
  onContactVendor,
  onTrack,
  isReviewed = false,
}: OrderActionsProps) {
  const isActive =
    order.status !== "delivered" && order.status !== "cancelled";
  const canCancel = order.status === "placed" || order.status === "confirmed";
  const isDelivered = order.status === "delivered";
  const singleProduct = order.items.length === 1 ? order.items[0].product : null;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Track Package button */}
      {isActive && (
        <Link
          href={`/orders/${order.id}/track`}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            "bg-kampmax-navy text-white hover:bg-kampmax-navy/90"
          )}
        >
          <Truck className="w-3.5 h-3.5 text-white" />
          Track Live
        </Link>
      )}

      {/* Contact vendor — always available */}
      <button
        onClick={onContactVendor}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
          "border-kampmax-border bg-white text-kampmax-text hover:bg-kampmax-muted"
        )}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Contact Vendor
      </button>

      {/* Cancel — only for placed/confirmed */}
      {canCancel && (
        <button
          onClick={onCancel}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
            "border-kampmax-error/20 bg-white text-kampmax-error hover:bg-kampmax-error/10"
          )}
        >
          <XCircle className="w-3.5 h-3.5" />
          Cancel Order
        </button>
      )}

      {/* Reorder — delivered or cancelled */}
      {!isActive && (
        <button
          onClick={onReorder}
          title="Add items back to cart and proceed to checkout"
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
            "border-kampmax-navy bg-kampmax-navy text-white hover:bg-kampmax-navy/90"
          )}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reorder (Checkout)
        </button>
      )}

      {/* Direct link to product details if single item */}
      {!isActive && singleProduct && (
        <Link
          href={`/marketplace/${singleProduct.id}`}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
            "border-kampmax-border bg-white text-kampmax-text hover:bg-kampmax-muted"
          )}
        >
          View Product
        </Link>
      )}

      {/* Review — delivered only */}
      {isDelivered && (
        <button
          onClick={onReview}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
            isReviewed
              ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
              : "border-kampmax-gold/30 bg-white text-kampmax-gold hover:bg-kampmax-gold/10"
          )}
        >
          <Star className={cn("w-3.5 h-3.5", isReviewed && "fill-current")} />
          {isReviewed ? "Reviewed" : "Review"}
        </button>
      )}
    </div>
  );
}


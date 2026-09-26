"use client";

import Link from "next/link";
import {
  Package,
  Truck,
  Store,
  MapPin,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Order } from "@/types";
import { formatNaira, formatDate, getOrderProgress, cn } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/atoms/Badge";

interface OrderCardProps {
  order: Order;
  vendorName?: string;
  className?: string;
}

const DELIVERY_ICONS: Record<string, typeof Package> = {
  campus_pickup: Store,
  meetup: MapPin,
  delivery: Truck,
};

export function OrderCard({ order, vendorName, className }: OrderCardProps) {
  const firstItem = order.items[0];
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const moreCount = Math.max(order.items.length - 1, 0);
  const progress = getOrderProgress(order.status);
  const isCancelled = order.status === "cancelled";
  const isActive = !isCancelled && order.status !== "delivered";
  const DeliveryIcon = DELIVERY_ICONS[order.deliveryMethod] || Package;

  return (
    <Link
      href={`/orders/${order.id}`}
      className={cn(
        "block p-4 bg-white rounded-xl border border-kampmax-border hover:shadow-md transition-all duration-200",
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-kampmax-text">
            #{order.id}
          </span>
          <OrderStatusBadge status={order.status} />
        </div>
        <span className="text-xs text-kampmax-text-secondary">
          {formatDate(new Date(order.createdAt))}
        </span>
      </div>

      {/* Items preview */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 bg-kampmax-muted rounded-lg flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-kampmax-text-secondary/60" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-kampmax-text line-clamp-1">
            {firstItem?.product.title ?? "Order items"}
          </p>
          {firstItem && (
            <p className="text-xs text-kampmax-text-secondary">
              {itemCount} {itemCount === 1 ? "item" : "items"}
              {moreCount > 0 && ` (+${moreCount} more)`}
            </p>
          )}
        </div>
      </div>

      {/* Vendor + delivery */}
      <div className="flex items-center gap-3 mb-3 text-xs text-kampmax-text-secondary">
        {vendorName && (
          <span className="font-medium text-kampmax-text">{vendorName}</span>
        )}
        <span className="w-1 h-1 bg-kampmax-text-secondary/40 rounded-full" />
        <span className="flex items-center gap-1">
          <DeliveryIcon className="w-3 h-3" />
          {order.deliveryMethod === "campus_pickup"
            ? "Pickup"
            : order.deliveryMethod === "delivery"
              ? "Delivery"
              : "Meetup"}
        </span>
      </div>

      {/* Progress bar (active orders only) */}
      {isActive && (
        <div className="mb-3">
          <div className="w-full h-1.5 bg-kampmax-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-kampmax-blue rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-kampmax-navy">
          {formatNaira(order.total)}
        </span>
        <div className="flex items-center gap-1 text-xs text-kampmax-blue font-medium">
          View details
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
}

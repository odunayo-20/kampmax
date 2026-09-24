"use client";

import { Package, ChevronRight } from "lucide-react";
import { formatNaira, timeAgo } from "@/lib/utils";
import { FulfillmentBadge, PaymentBadge, DeliveryMethodTag, ParentOrderTag } from "./OrderBadges";
import type { VendorOrder } from "@/types/vendor-orders";

interface OrdersGridProps {
  orders: VendorOrder[];
  onView: (order: VendorOrder) => void;
}

export function OrdersGrid({ orders, onView }: OrdersGridProps) {
  return (
    <div className="space-y-2">
      {orders.map((order) => {
        const multiVendor = order.parentOrderId !== order.id;
        return (
          <button
            key={order.id}
            type="button"
            onClick={() => onView(order)}
            className="w-full rounded-xl border border-kampmax-border bg-white p-4 text-left transition-colors hover:bg-kampmax-muted/50"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-kampmax-text">{order.orderNumber ?? order.id}</span>
                {multiVendor && <ParentOrderTag label="Multi-vendor order" />}
              </div>
              <FulfillmentBadge status={order.fulfillmentStatus} />
            </div>

            <p className="text-sm font-medium text-kampmax-text">{order.customer.displayName}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-kampmax-text-secondary">
              <Package className="h-3.5 w-3.5 text-kampmax-blue" aria-hidden />
              <span className="truncate">{order.items.map((i) => `${i.quantity}× ${i.title}`).join(", ")}</span>
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-sm font-bold tabular-nums text-kampmax-text">
                {formatNaira(order.totals.customerTotal)}
              </span>
              <PaymentBadge status={order.paymentStatus} />
              <DeliveryMethodTag method={order.deliveryMethod} />
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-kampmax-text-secondary">
                {timeAgo(order.createdAt)}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
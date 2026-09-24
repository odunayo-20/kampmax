"use client";

import { Package, ExternalLink } from "lucide-react";
import { formatNaira, formatDate } from "@/lib/utils";
import { FulfillmentBadge, PaymentBadge, DeliveryMethodTag } from "./OrderBadges";
import type { VendorOrder } from "@/types/vendor-orders";

interface OrdersTableProps {
  orders: VendorOrder[];
  onView: (order: VendorOrder) => void;
}

export function OrdersTable({ orders, onView }: OrdersTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-kampmax-border bg-white">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead>
          <tr className="border-b border-kampmax-border text-xs uppercase tracking-wider text-kampmax-text-secondary">
            <th className="px-4 py-3 font-semibold">Order</th>
            <th className="px-4 py-3 font-semibold">Buyer</th>
            <th className="px-4 py-3 font-semibold">Items</th>
            <th className="px-4 py-3 font-semibold">Total</th>
            <th className="px-4 py-3 font-semibold">Fulfillment</th>
            <th className="px-4 py-3 font-semibold">Payment</th>
            <th className="px-4 py-3 font-semibold">Method</th>
            <th className="px-4 py-3 font-semibold">Placed</th>
            <th className="px-4 py-3" aria-label="Actions" />
          </tr>
        </thead>
        <tbody className="divide-y divide-kampmax-border">
          {orders.map((order) => (
            <tr key={order.id} className="transition-colors hover:bg-kampmax-muted/40">
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-kampmax-text">{order.orderNumber ?? order.id}</span>
                  <span className="text-[11px] text-kampmax-text-secondary">
                    Parent {order.parentOrderId}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-kampmax-text">{order.customer.displayName}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 text-kampmax-text-secondary">
                  <Package className="h-3.5 w-3.5 text-kampmax-blue" aria-hidden />
                  <span className="max-w-[200px] truncate">
                    {order.items.map((i) => `${i.quantity}× ${i.title}`).join(", ")}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 font-semibold tabular-nums text-kampmax-text">
                {formatNaira(order.totals.customerTotal)}
              </td>
              <td className="px-4 py-3">
                <FulfillmentBadge status={order.fulfillmentStatus} />
              </td>
              <td className="px-4 py-3">
                <PaymentBadge status={order.paymentStatus} />
              </td>
              <td className="px-4 py-3">
                <DeliveryMethodTag method={order.deliveryMethod} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-kampmax-text-secondary">
                {formatDate(order.createdAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onView(order)}
                  aria-label={`Open order ${order.id}`}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-kampmax-blue transition-colors hover:bg-kampmax-blue/5"
                >
                  View
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
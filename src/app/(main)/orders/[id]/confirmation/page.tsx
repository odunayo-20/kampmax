"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Printer,
  Package,
  MapPin,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  FileText,
} from "lucide-react";
import { getOrderById, fetchOrderById } from "@/services/orders";
import type { Order } from "@/types";
import { formatDate, formatNaira } from "@/lib/utils";
import { CampusPickupPinCard } from "@/components/orders/CampusPickupPinCard";
import { OrderStatusBadge } from "@/components/atoms/Badge";
import { Logo } from "@/components/ui/Logo";

export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(() => getOrderById(id) || null);
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    if (!order) {
      fetchOrderById(id)
        .then((res) => {
          if (res?.data) setOrder(res.data);
        })
        .finally(() => setLoading(false));
    }
  }, [id, order]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12">
        <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
          <Package className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-kampmax-text">Order Not Found</h1>
        <p className="mt-1 text-xs text-kampmax-text-secondary">
          We couldn't locate an order with ID <span className="font-mono">{id}</span>.
        </p>
        <Link
          href="/orders"
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-kampmax-navy px-4 py-2 text-xs font-semibold text-white"
        >
          View My Orders
        </Link>
      </div>
    );
  }

  const isPickup = order.deliveryMethod === "campus_pickup";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Top Brand Bar */}
      <div className="flex items-center justify-between">
        <Logo size="sm" href="/home" />
        <span className="text-xs font-semibold text-kampmax-text-secondary">Official Order Confirmation</span>
      </div>

      {/* Printable Area Wrapper */}
      <div className="space-y-6">
        {/* Banner */}
        <div className="rounded-2xl bg-emerald-600 p-6 text-white text-center shadow-md">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs">
            <CheckCircle2 className="h-9 w-9 text-white" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold">Order Confirmed!</h1>
          <p className="mt-1 text-xs text-emerald-100 sm:text-sm">
            Thank you for your order. We've generated a digital receipt and notified the vendor.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-mono font-medium text-white">
            Order Reference: #{order.id}
          </div>
        </div>

        {/* Campus Pickup PIN Card if applicable */}
        {isPickup && (
          <div className="print:block">
            <CampusPickupPinCard order={order} />
          </div>
        )}

        {/* Order & Payment Summary Card */}
        <div className="rounded-2xl border border-kampmax-border bg-white p-5 shadow-xs sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-kampmax-border pb-4 gap-2">
            <div>
              <p className="text-xs text-kampmax-text-secondary">Order Placed On</p>
              <p className="text-sm font-bold text-kampmax-text">{formatDate(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-kampmax-text-secondary">Payment Method</p>
              <p className="text-sm font-bold capitalize text-kampmax-text">
                {order.paymentMethod.replace("_", " ")}
              </p>
            </div>
            <div>
              <p className="text-xs text-kampmax-text-secondary">Status</p>
              <OrderStatusBadge status={order.status} />
            </div>
          </div>

          {/* Delivery Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-kampmax-muted/40 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-kampmax-text">
                <MapPin className="h-4 w-4 text-kampmax-navy" aria-hidden />
                <span>{isPickup ? "Pickup Location" : "Delivery Address"}</span>
              </div>
              <p className="mt-1.5 text-xs font-semibold text-kampmax-text">
                {isPickup ? order.pickupLocation || "Campus Hub" : order.deliveryAddress || "Address Provided"}
              </p>
            </div>

            <div className="rounded-xl bg-kampmax-muted/40 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-kampmax-text">
                <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
                <span>Kampmax Buyer Protection</span>
              </div>
              <p className="mt-1.5 text-xs text-kampmax-text-secondary">
                Payment is held safely in escrow until you confirm order receipt & condition.
              </p>
            </div>
          </div>
        </div>

        {/* Items Breakdown Receipt Card */}
        <div className="rounded-2xl border border-kampmax-border bg-white p-5 shadow-xs sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-kampmax-border pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-kampmax-navy" aria-hidden />
              <h2 className="text-sm font-bold text-kampmax-text sm:text-base">Order Receipt & Items</h2>
            </div>
            <span className="text-xs text-kampmax-text-secondary">
              {order.items.length} Item{order.items.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="divide-y divide-kampmax-border">
            {order.items.map((item, idx) => {
              const prod = item.product;
              const subtotal = prod.price * item.quantity;
              const imgSrc = prod.images && prod.images.length > 0 ? prod.images[0] : "/placeholder-product.png";

              return (
                <div key={idx} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 border border-kampmax-border">
                      <img
                        src={imgSrc}
                        alt={prod.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-kampmax-text">{prod.title}</p>
                      <p className="text-[11px] text-kampmax-text-secondary">
                        Qty: {item.quantity} × {formatNaira(prod.price)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-kampmax-text">{formatNaira(subtotal)}</p>
                </div>
              );
            })}
          </div>

          {/* Pricing Totals */}
          <div className="border-t border-kampmax-border pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-kampmax-text-secondary">
              <span>Items Subtotal</span>
              <span>{formatNaira(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-kampmax-text-secondary">
              <span>Delivery Fee</span>
              <span>{formatNaira(order.deliveryFee)}</span>
            </div>
            {order.platformFee > 0 && (
              <div className="flex justify-between text-kampmax-text-secondary">
                <span>Platform / Service Fee</span>
                <span>{formatNaira(order.platformFee)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-kampmax-border pt-2 text-sm font-bold text-kampmax-text">
              <span>Total Paid</span>
              <span className="text-kampmax-navy">{formatNaira(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons (Hidden on Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-kampmax-border bg-white px-4 py-2.5 text-xs font-semibold text-kampmax-text shadow-xs hover:bg-kampmax-muted transition"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Print Receipt
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 rounded-xl border border-kampmax-border bg-white px-4 py-2.5 text-xs font-semibold text-kampmax-text hover:bg-kampmax-muted transition"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden />
            Continue Shopping
          </Link>
          <Link
            href={`/orders/${order.id}/track`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-kampmax-navy px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-kampmax-navy/90 transition"
          >
            Track Order
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

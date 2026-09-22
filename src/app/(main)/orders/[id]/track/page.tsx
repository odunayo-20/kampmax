"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ShieldCheck,
  ChevronRight,
  Loader2,
  Navigation,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs, BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { OrderStatusBadge } from "@/components/atoms/Badge";
import { CampusPickupPinCard } from "@/components/orders/CampusPickupPinCard";
import { getOrderById, fetchOrderById } from "@/services/orders";
import { getVendorById } from "@/services/users";
import { Order, PICKUP_LOCATION_LABELS, PickupLocation } from "@/types";
import { formatDate } from "@/lib/utils";

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(() => getOrderById(id) || null);
  const [isLoading, setIsLoading] = useState(!order);

  useEffect(() => {
    let mounted = true;
    fetchOrderById(id).then(({ data }) => {
      if (mounted) {
        if (data) setOrder(data);
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-kampmax-blue mb-3" />
          <p className="text-sm text-kampmax-text-secondary">Loading live tracking details…</p>
        </div>
      </PageContainer>
    );
  }

  if (!order) {
    return (
      <PageContainer>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-kampmax-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-kampmax-text" />
          </button>
          <h1 className="text-xl font-bold text-kampmax-text">Tracking Not Found</h1>
        </div>
        <div className="text-center py-12 bg-white rounded-2xl border border-kampmax-border p-6">
          <p className="text-sm text-kampmax-text-secondary mb-4">
            Could not locate tracking information for Order #{id}.
          </p>
          <Link
            href="/orders"
            className="inline-flex items-center justify-center px-4 py-2 bg-kampmax-navy text-white text-xs font-semibold rounded-lg"
          >
            Return to My Orders
          </Link>
        </div>
      </PageContainer>
    );
  }

  const vendor = getVendorById(order.vendorId);

  const steps = [
    {
      key: "pending",
      title: "Order Placed",
      desc: `Order received on ${formatDate(new Date(order.createdAt))}`,
      isDone: true,
    },
    {
      key: "confirmed",
      title: "Vendor Confirmed",
      desc: "Vendor accepted your order and is preparing items",
      isDone: ["confirmed", "processing", "ready_for_pickup", "out_for_delivery", "delivered"].includes(order.status),
    },
    {
      key: "processing",
      title: "Packing & Quality Check",
      desc: "Items verified and packaged securely",
      isDone: ["processing", "ready_for_pickup", "out_for_delivery", "delivered"].includes(order.status),
    },
    {
      key: "in_transit",
      title: order.deliveryMethod === "campus_pickup" ? "Ready for Campus Pickup" : "In Transit / Out for Delivery",
      desc: order.deliveryMethod === "campus_pickup"
        ? `Available at ${order.pickupLocation ? PICKUP_LOCATION_LABELS[order.pickupLocation as PickupLocation] || order.pickupLocation : "Pickup Station"}`
        : `Rider assigned — delivery address: ${order.deliveryAddress || "Campus location"}`,
      isDone: ["ready_for_pickup", "out_for_delivery", "delivered"].includes(order.status),
    },
    {
      key: "delivered",
      title: "Delivered & Verified",
      desc: "Package handed over safely. Escrow release eligible.",
      isDone: order.status === "delivered",
    },
  ];

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Orders", href: "/orders" },
    { label: `#${order.id}`, href: `/orders/${order.id}` },
    { label: "Live Tracking" },
  ];

  return (
    <PageContainer>
      <div className="space-y-4 max-w-3xl mx-auto">
        <Breadcrumbs items={breadcrumbs} />

        {/* Top Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-kampmax-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-kampmax-text" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-kampmax-text">Live Package Tracker</h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-xs text-kampmax-text-secondary">
              Tracking Order #{order.id}
            </p>
          </div>
          <Link
            href={`/orders/${order.id}`}
            className="text-xs font-semibold text-kampmax-blue hover:underline"
          >
            View Details
          </Link>
        </div>

        {/* Live Status Header Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-kampmax-navy to-slate-800 text-white shadow-md space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-kampmax-gold bg-kampmax-gold/10 px-2 py-0.5 rounded-full">
                Live Status
              </span>
              <h2 className="text-lg font-bold text-white mt-1">
                {order.status === "delivered"
                  ? "Package Delivered!"
                  : order.status === "ready_for_pickup"
                  ? "Ready for Pickup!"
                  : order.status === "out_for_delivery"
                  ? "Out for Delivery"
                  : "Order Processing"}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {order.estimatedDelivery
                  ? `Est. arrival: ${order.estimatedDelivery}`
                  : "Updating estimated delivery window..."}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Truck className="w-5 h-5" />
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {order.deliveryMethod === "campus_pickup"
                  ? "Campus Pickup Point"
                  : "Standard Campus Delivery"}
              </span>
            </span>
            <span className="text-white font-medium">
              {order.items.length} {order.items.length === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        {/* Pickup Verification PIN / QR Card if applicable */}
        {order.deliveryMethod === "campus_pickup" && order.status !== "cancelled" && (
          <CampusPickupPinCard order={order} />
        )}

        {/* Courier / Rider Contact Card */}
        {order.deliveryMethod === "delivery" && (
          <div className="bg-white rounded-2xl border border-kampmax-border p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs">
                KEX
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-kampmax-text">Kampmax Express Courier</h4>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.5 rounded">Verified Rider</span>
                </div>
                <p className="text-[11px] text-kampmax-text-secondary">Rider ID: #KEX-8492 • On-Campus Delivery</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="tel:+2348000000000"
                className="p-2 rounded-xl bg-kampmax-muted hover:bg-kampmax-border text-kampmax-navy transition-colors"
                title="Call Courier"
              >
                <Phone className="w-4 h-4" />
              </a>
              <button
                onClick={() => router.push(`/chat?orderId=${order.id}`)}
                className="p-2 rounded-xl bg-kampmax-navy text-white hover:bg-kampmax-navy/90 transition-colors"
                title="Message Courier"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Detailed Vertical Progress Steps */}
        <div className="bg-white rounded-2xl border border-kampmax-border p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-kampmax-text-secondary">
            Tracking Steps
          </h3>

          <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {steps.map((step, idx) => (
              <div key={idx} className="relative flex items-start gap-3">
                <div
                  className={`absolute -left-[23px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 transition-colors ${
                    step.isDone
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white border-slate-300 text-slate-400"
                  }`}
                >
                  {step.isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${step.isDone ? "text-kampmax-text" : "text-kampmax-text-secondary"}`}>
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-kampmax-text-secondary mt-0.5">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vendor Information Card */}
        {vendor && (
          <div className="bg-white rounded-2xl border border-kampmax-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-kampmax-muted flex items-center justify-center font-bold text-xs text-kampmax-navy">
                {vendor.storeName?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-kampmax-text">{vendor.storeName}</h4>
                <p className="text-[11px] text-kampmax-text-secondary">Fulfilled & Dispatched by Vendor</p>
              </div>
            </div>
            <Link
              href={`/chat?orderId=${order.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-kampmax-navy bg-kampmax-muted hover:bg-kampmax-border px-3 py-1.5 rounded-lg transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Chat Vendor
            </Link>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Package,
  Store,
  Truck,
  MapPinned,
  MessageCircle,
  AlertTriangle,
  LifeBuoy,
  Loader2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs, BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/atoms/Button";
import { OrderStatusBadge } from "@/components/atoms/Badge";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { OrderItems } from "@/components/orders/OrderItems";
import { OrderFees } from "@/components/orders/OrderFees";
import { OrderActions } from "@/components/orders/OrderActions";
import { CampusPickupPinCard } from "@/components/orders/CampusPickupPinCard";
import { OrderProgressStepper } from "@/components/orders/OrderProgressStepper";
import { getOrderById, fetchOrderById, cancelOrderApi } from "@/services/orders";
import { getVendorById } from "@/services/users";
import { getOrCreateDirectConversation } from "@/services/messages";
import { useAuth } from "@/lib/auth-context";
import { PICKUP_LOCATION_LABELS, PickupLocation, Order } from "@/types";
import { formatDate } from "@/lib/utils";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(() => getOrderById(id) || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelled, setIsCancelled] = useState(false);

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

  const vendor = order ? getVendorById(order.vendorId) : undefined;

  if (isLoading && !order) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-kampmax-blue mb-3" />
          <p className="text-sm text-kampmax-text-secondary">Loading order details…</p>
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
          <h1 className="text-xl font-bold text-kampmax-text">Order Not Found</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-kampmax-muted flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-kampmax-text-secondary/40" />
          </div>
          <h2 className="text-base font-semibold text-kampmax-text mb-1">
            Order not found
          </h2>
          <p className="text-sm text-kampmax-text-secondary max-w-xs mb-5">
            Order #{id} doesn&apos;t exist or may have been removed.
          </p>
          <Button
            onClick={() => router.push("/orders")}
            className="bg-kampmax-navy text-white hover:bg-kampmax-navy/90"
          >
            View All Orders
          </Button>
        </div>
      </PageContainer>
    );
  }

  const displayOrder = isCancelled
    ? { ...order, status: "cancelled" as const, cancelReason }
    : order;

  const DELIVERY_ICONS: Record<string, typeof Package> = {
    campus_pickup: Store,
    meetup: MapPinned,
    delivery: Truck,
  };
  const DeliveryIcon = DELIVERY_ICONS[order.deliveryMethod] || Package;

  function handleCancel() {
    setShowCancelModal(true);
  }

  async function confirmCancel() {
    setIsCancelling(true);
    await cancelOrderApi(order!.id);
    setIsCancelled(true);
    setShowCancelModal(false);
    setIsCancelling(false);
  }

  function handleReorder() {
    router.push("/marketplace");
  }

  function handleReview() {
    if (vendor) {
      router.push(`/store/${vendor.slug || vendor.id}#reviews`);
    } else {
      router.push("/marketplace");
    }
  }

  function handleContactVendor() {
    if (!order) return;
    const currentUserId = user?.id || "u1";
    const vendorUserId = vendor?.userId || vendor?.id || order.vendorId;
    const result = getOrCreateDirectConversation(currentUserId, vendorUserId);

    const params = new URLSearchParams();
    params.set("orderId", order.id);
    params.set("orderTotal", String(order.total));
    if (order.items[0]?.product?.title) {
      params.set("productTitle", order.items[0].product.title);
    }

    if (result && result.conversation) {
      router.push(`/chat/${result.conversation.id}?${params.toString()}`);
    } else {
      router.push(`/chat?${params.toString()}`);
    }
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Orders", href: "/orders" },
    { label: `#${order.id}` },
  ];

  return (
    <PageContainer>
      <div className="space-y-4">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbs} />

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-kampmax-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-kampmax-text" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-kampmax-text">
                #{order.id}
              </h1>
              <OrderStatusBadge
                status={isCancelled ? "cancelled" : order.status}
              />
            </div>
            <p className="text-xs text-kampmax-text-secondary mt-0.5">
              Placed {formatDate(new Date(order.createdAt))}
            </p>
          </div>
          <Link
            href={`/support/new?order=${order.id}&category=marketplace&subject=Help%20with%20order%20${order.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-kampmax-blue hover:underline shrink-0"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            Need help with this order?
          </Link>
        </div>

        {/* Order Progress Stepper */}
        <OrderProgressStepper status={displayOrder.status} />

        {/* Campus Pickup PIN & QR Verification Card */}
        {displayOrder.status !== "cancelled" && displayOrder.status !== "delivered" && (
          <CampusPickupPinCard order={displayOrder} />
        )}

        {/* Estimated delivery banner */}
        {order.status !== "delivered" &&
          order.status !== "cancelled" &&
          order.estimatedDelivery && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-kampmax-blue/5 border border-kampmax-blue/20">
              <Clock className="w-4 h-4 text-kampmax-blue shrink-0" />
              <span className="text-xs text-kampmax-blue font-medium">
                Estimated delivery: {order.estimatedDelivery}
              </span>
            </div>
          )}

        {/* Cancelled notice */}
        {(isCancelled || order.status === "cancelled") && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-kampmax-error/5 border border-kampmax-error/20">
            <AlertTriangle className="w-4 h-4 text-kampmax-error shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-kampmax-error font-medium">
                This order has been cancelled
              </p>
              {(cancelReason || order.cancelReason) && (
                <p className="text-[11px] text-kampmax-error/80 mt-0.5">
                  Reason: {cancelReason || order.cancelReason}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Order Items */}
        <OrderItems items={order.items} />

        {/* Delivery / Pickup Info */}
        <div className="bg-white rounded-xl border border-kampmax-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <DeliveryIcon className="w-4 h-4 text-kampmax-navy" />
            <span className="text-xs font-semibold text-kampmax-text uppercase tracking-wide">
              {order.deliveryMethod === "campus_pickup"
                ? "Pickup Information"
                : order.deliveryMethod === "meetup"
                ? "Meetup Details"
                : "Delivery Details"}
            </span>
          </div>

          <div className="text-xs space-y-1 text-kampmax-text">
            {order.deliveryAddress && (
              <p className="flex items-center gap-1.5 text-kampmax-text-secondary">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{order.deliveryAddress}</span>
              </p>
            )}
            {order.pickupLocation && (
              <p className="text-kampmax-text-secondary">
                Pickup point:{" "}
                <span className="font-medium text-kampmax-text">
                  {PICKUP_LOCATION_LABELS[order.pickupLocation as PickupLocation] ||
                    order.pickupLocation}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Vendor Card */}
        {vendor && (
          <div className="bg-white rounded-xl border border-kampmax-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-kampmax-muted flex items-center justify-center font-bold text-xs text-kampmax-navy">
                  {vendor.storeName?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-kampmax-text">
                    {vendor.storeName}
                  </h4>
                  <p className="text-[11px] text-kampmax-text-secondary">
                    {vendor.rating ? `★ ${vendor.rating}` : "Verified Vendor"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleContactVendor}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-kampmax-navy bg-kampmax-muted hover:bg-kampmax-border rounded-lg transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Chat
              </button>
            </div>
          </div>
        )}

        {/* Timeline */}
        <OrderTimeline
          timeline={displayOrder.timeline}
          currentStatus={displayOrder.status}
        />

        {/* Fees */}
        <OrderFees
          subtotal={displayOrder.subtotal}
          platformFee={displayOrder.platformFee}
          deliveryFee={displayOrder.deliveryFee}
          discountAmount={displayOrder.discountAmount}
          total={displayOrder.total}
          paymentMethod={displayOrder.paymentMethod}
          paymentStatus={displayOrder.paymentStatus}
        />

        {/* Actions */}
        <OrderActions
          order={displayOrder}
          onCancel={handleCancel}
          onReorder={handleReorder}
          onReview={handleReview}
          onContactVendor={handleContactVendor}
        />

        {/* Back button */}
        <Button
          onClick={() => router.push("/orders")}
          variant="outline"
          className="w-full border-kampmax-border"
        >
          Back to Orders
        </Button>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCancelModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-kampmax-text">
              Cancel Order
            </h3>
            <p className="text-sm text-kampmax-text-secondary">
              Are you sure you want to cancel order #{order.id}? This action
              cannot be undone.
            </p>
            <div>
              <label className="text-xs font-medium text-kampmax-text-secondary mb-1 block">
                Reason for cancellation
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-kampmax-border rounded-lg bg-white focus:outline-none focus:border-kampmax-blue"
              >
                <option value="">Select a reason</option>
                <option value="Changed my mind">Changed my mind</option>
                <option value="Found a better deal">Found a better deal</option>
                <option value="Item no longer needed">Item no longer needed</option>
                <option value="Item no longer available">Item no longer available</option>
                <option value="Duplicate order">Duplicate order</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="flex-1 h-10 text-sm font-medium border border-kampmax-border rounded-lg hover:bg-kampmax-muted transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={confirmCancel}
                disabled={!cancelReason || isCancelling}
                className="flex-1 h-10 text-sm font-medium bg-kampmax-error text-white rounded-lg hover:bg-kampmax-error/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-1.5"
              >
                {isCancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Cancel Order</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

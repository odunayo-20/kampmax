"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldAlert,
  CheckCircle,
  XCircle,
  MessageCircle,
  AlertTriangle,
  Loader2,
  FileText,
  DollarSign,
  Send,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs, BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { getOrderById, fetchOrderById } from "@/services/orders";
import { Order } from "@/types";
import { formatDate, formatNaira } from "@/lib/utils";

export default function VendorDisputePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(() => getOrderById(id) || null);
  const [isLoading, setIsLoading] = useState(!order);
  const [actionDone, setActionDone] = useState<"refunded" | "rejected" | null>(null);
  const [vendorResponse, setVendorResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          <p className="text-sm text-kampmax-text-secondary">Loading dispute details…</p>
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
          <h1 className="text-xl font-bold text-kampmax-text">Dispute Not Found</h1>
        </div>
      </PageContainer>
    );
  }

  const handleApproveRefund = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setActionDone("refunded");
    }, 600);
  };

  const handleRejectDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorResponse.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setActionDone("rejected");
    }, 600);
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Vendor Portal", href: "/vendor/dashboard" },
    { label: "Orders", href: "/vendor/orders" },
    { label: `#${order.id}`, href: `/vendor/orders/${order.id}` },
    { label: "Dispute Response" },
  ];

  return (
    <PageContainer>
      <div className="space-y-4 max-w-3xl mx-auto">
        <Breadcrumbs items={breadcrumbs} />

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-kampmax-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-kampmax-text" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-kampmax-text">Customer Dispute Claim</h1>
              <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                Action Required
              </span>
            </div>
            <p className="text-xs text-kampmax-text-secondary">Order #{order.id}</p>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
          <div className="flex items-center gap-2 font-bold text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Escrow Payment On Hold ({formatNaira(order.total)})</span>
          </div>
          <p className="text-[11px] text-amber-700">
            The customer filed a claim regarding this order. Resolving disputes quickly boosts your store trust rating.
          </p>
        </div>

        {actionDone === "refunded" ? (
          <div className="p-6 bg-white rounded-2xl border border-emerald-200 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-base font-bold text-kampmax-text">Refund Approved</h3>
            <p className="text-xs text-kampmax-text-secondary max-w-md mx-auto">
              You have accepted the customer claim. A full refund of {formatNaira(order.total)} has been returned to the customer wallet from escrow.
            </p>
            <button
              onClick={() => router.push(`/vendor/orders/${order.id}`)}
              className="px-4 py-2 bg-kampmax-navy text-white text-xs font-semibold rounded-xl"
            >
              Return to Order Detail
            </button>
          </div>
        ) : actionDone === "rejected" ? (
          <div className="p-6 bg-white rounded-2xl border border-blue-200 text-center space-y-3">
            <ShieldAlert className="w-12 h-12 text-blue-600 mx-auto" />
            <h3 className="text-base font-bold text-kampmax-text">Response Submitted to Kampmax Support</h3>
            <p className="text-xs text-kampmax-text-secondary max-w-md mx-auto">
              Your explanation and proof have been logged. Kampmax Trust & Safety will review both sides within 12 hours.
            </p>
            <button
              onClick={() => router.push(`/vendor/orders/${order.id}`)}
              className="px-4 py-2 bg-kampmax-navy text-white text-xs font-semibold rounded-xl"
            >
              Return to Order Detail
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Customer Claim Summary */}
            <div className="bg-white rounded-2xl border border-kampmax-border p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-kampmax-text-secondary">
                Customer Claim Details
              </h3>
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between font-semibold text-kampmax-text">
                  <span>Claimed Issue: Item Damaged / Defective</span>
                  <span className="text-rose-600">Requested: {formatNaira(order.total)}</span>
                </div>
                <p className="text-slate-600 italic">
                  &quot;The item arrived with damage on the side box. Requesting a full refund or replacement.&quot;
                </p>
              </div>
            </div>

            {/* Vendor Decision Panel */}
            <div className="bg-white rounded-2xl border border-kampmax-border p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-kampmax-text-secondary">
                Choose Action
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleApproveRefund}
                  disabled={isSubmitting}
                  className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/60 text-left transition-colors space-y-1"
                >
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Approve Full Refund</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Immediately return {formatNaira(order.total)} from escrow back to customer.
                  </p>
                </button>

                <Link
                  href={`/chat?orderId=${order.id}`}
                  className="p-4 rounded-xl border border-blue-300 bg-blue-50/50 hover:bg-blue-100/60 text-left transition-colors space-y-1 block"
                >
                  <div className="flex items-center gap-2 text-blue-800 font-bold text-xs">
                    <MessageCircle className="w-4 h-4 text-blue-600" />
                    <span>Message Customer</span>
                  </div>
                  <p className="text-[11px] text-blue-700">
                    Negotiate a partial refund or replacement item directly in chat.
                  </p>
                </Link>
              </div>

              {/* Contest / Reject Claim Form */}
              <form onSubmit={handleRejectDispute} className="pt-4 border-t border-kampmax-border space-y-3">
                <h4 className="text-xs font-bold text-kampmax-text">Contest Claim (Escrow Arbitration)</h4>
                <textarea
                  rows={3}
                  value={vendorResponse}
                  onChange={(e) => setVendorResponse(e.target.value)}
                  placeholder="Provide proof of fulfillment, delivery receipt details, or item condition photo proof..."
                  className="w-full p-3 text-xs border border-kampmax-border rounded-xl bg-white focus:outline-none focus:border-kampmax-blue"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !vendorResponse.trim()}
                  className="w-full h-10 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Proof to Kampmax Support</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

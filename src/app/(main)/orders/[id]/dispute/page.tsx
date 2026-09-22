"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  Upload,
  MessageCircle,
  FileText,
  CheckCircle,
  Clock,
  ShieldCheck,
  Send,
  Loader2,
  Package,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs, BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { RefundStatusCard } from "@/components/orders/RefundStatusCard";
import { getOrderById, fetchOrderById } from "@/services/orders";
import { getVendorById } from "@/services/users";
import { Order } from "@/types";
import { formatDate, formatNaira } from "@/lib/utils";

export default function CustomerDisputePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(() => getOrderById(id) || null);
  const [isLoading, setIsLoading] = useState(!order);

  // Form state for filing dispute if not filed yet
  const [reason, setReason] = useState("item_damaged");
  const [statement, setStatement] = useState("");
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dispute state
  const [isFiled, setIsFiled] = useState(false);
  const [disputeStatus, setDisputeStatus] = useState<"pending" | "vendor_responded" | "approved" | "rejected">("pending");

  useEffect(() => {
    let mounted = true;
    fetchOrderById(id).then(({ data }) => {
      if (mounted) {
        if (data) {
          setOrder(data);
          setRefundAmount(data.total);
        }
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
          <p className="text-sm text-kampmax-text-secondary">Loading order dispute portal…</p>
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
      </PageContainer>
    );
  }

  const vendor = getVendorById(order.vendorId);

  const handleSubmitDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsFiled(true);
    }, 600);
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Orders", href: "/orders" },
    { label: `#${order.id}`, href: `/orders/${order.id}` },
    { label: "Dispute & Return Portal" },
  ];

  return (
    <PageContainer>
      <div className="space-y-4 max-w-3xl mx-auto">
        <Breadcrumbs items={breadcrumbs} />

        {/* Top bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-kampmax-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-kampmax-text" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-kampmax-text">Resolution & Return Portal</h1>
            <p className="text-xs text-kampmax-text-secondary">Order #{order.id}</p>
          </div>
        </div>

        {/* Escrow Shield Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center gap-3 shadow-sm">
          <div className="p-2.5 rounded-xl bg-white/10 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Kampmax Escrow Protection Active
            </h3>
            <p className="text-xs text-blue-100 mt-0.5">
              Funds are locked in Kampmax Escrow until this dispute is resolved. Neither party is charged extra fees.
            </p>
          </div>
        </div>

        {isFiled ? (
          /* Active Dispute View */
          <div className="space-y-4">
            <RefundStatusCard
              status={disputeStatus === "approved" ? "approved" : "pending"}
              amount={refundAmount}
              reason={reason.replace("_", " ").toUpperCase()}
              payoutMethod="kampmax_wallet"
              dateRequested={formatDate(new Date())}
            />

            {/* Timeline of Dispute Resolution */}
            <div className="bg-white rounded-2xl border border-kampmax-border p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-kampmax-text-secondary">
                Dispute Progress
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-kampmax-text">Dispute Filed & Escrow Frozen</h4>
                    <p className="text-[11px] text-kampmax-text-secondary">
                      You submitted: &quot;{statement}&quot;. Vendor notification sent.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                  <ShieldAlert className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-kampmax-text">Vendor Review (Window: 24h)</h4>
                    <p className="text-[11px] text-kampmax-text-secondary">
                      Vendor can accept the refund or provide proof. If no response in 24 hours, dispute auto-resolves in your favor.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor & Chat Action */}
            <div className="bg-white rounded-2xl border border-kampmax-border p-4 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-kampmax-text">Need direct resolution?</h4>
                <p className="text-[11px] text-kampmax-text-secondary">
                  Chat directly with seller to negotiate replacement or partial refund.
                </p>
              </div>
              <Link
                href={`/chat?orderId=${order.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-kampmax-navy text-white text-xs font-semibold rounded-lg hover:bg-kampmax-navy/90 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Open Chat
              </Link>
            </div>
          </div>
        ) : (
          /* File New Dispute Form */
          <form onSubmit={handleSubmitDispute} className="bg-white rounded-2xl border border-kampmax-border p-5 space-y-4">
            <h2 className="text-sm font-bold text-kampmax-text">File an Issue / Request Refund</h2>

            {/* Select Reason */}
            <div>
              <label className="text-xs font-medium text-kampmax-text block mb-1">
                Primary Issue Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-10 px-3 text-xs border border-kampmax-border rounded-xl bg-white focus:outline-none focus:border-kampmax-blue"
              >
                <option value="item_damaged">Item arrived damaged or defective</option>
                <option value="item_not_as_described">Item not as described / Wrong specs</option>
                <option value="missing_items">Missing items / incomplete order</option>
                <option value="never_received">Order not delivered / delayed</option>
                <option value="other">Other issue</option>
              </select>
            </div>

            {/* Refund Amount */}
            <div>
              <label className="text-xs font-medium text-kampmax-text block mb-1">
                Requested Refund Amount (₦)
              </label>
              <input
                type="number"
                max={order.total}
                value={refundAmount}
                onChange={(e) => setRefundAmount(Number(e.target.value))}
                className="w-full h-10 px-3 text-xs border border-kampmax-border rounded-xl bg-white focus:outline-none focus:border-kampmax-blue font-semibold"
              />
              <p className="text-[11px] text-kampmax-text-secondary mt-1">
                Max available for refund: {formatNaira(order.total)}
              </p>
            </div>

            {/* Explanation Statement */}
            <div>
              <label className="text-xs font-medium text-kampmax-text block mb-1">
                Detailed Explanation
              </label>
              <textarea
                rows={4}
                required
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="Describe what was wrong with your item or delivery..."
                className="w-full p-3 text-xs border border-kampmax-border rounded-xl bg-white focus:outline-none focus:border-kampmax-blue"
              />
            </div>

            {/* File Upload Mock */}
            <div>
              <label className="text-xs font-medium text-kampmax-text block mb-1">
                Attach Evidence (Photos / Receipt)
              </label>
              <div className="border-2 border-dashed border-kampmax-border rounded-xl p-4 text-center hover:bg-slate-50 cursor-pointer transition-colors">
                <Upload className="w-5 h-5 mx-auto text-kampmax-text-secondary mb-1" />
                <span className="text-xs font-medium text-kampmax-navy block">Click to upload photo evidence</span>
                <span className="text-[10px] text-kampmax-text-secondary">PNG, JPG, max 5MB</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !statement.trim()}
              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>Submit Dispute & Freeze Escrow</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </PageContainer>
  );
}

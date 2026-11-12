"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Clock, Loader2, MessageCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs, BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { OpenDisputeModal } from "@/components/orders/OpenDisputeModal";
import { HelpAndDisputeCard } from "@/components/trust/HelpAndDisputeCard";
import { fetchOrderById, openOrderDisputeApi } from "@/services/orders";
import { Order } from "@/types";
import { formatDate, formatNaira } from "@/lib/utils";

/**
 * Report a problem with an order. Everything on this page comes from the server:
 * the dispute is filed with POST /orders/:id/dispute, and the status shown is
 * whatever the server holds. Nothing is simulated.
 */
export default function CustomerDisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [order, setOrder] = useState<Order | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchOrderById(id)
      .then(({ data, error }) => {
        if (!mounted) return;
        if (data) {
          setOrder(data);
          setLoadState("ready");
        } else {
          setLoadState(error?.status === 404 ? "missing" : "error");
        }
      })
      .catch(() => mounted && setLoadState("error"));
    return () => {
      mounted = false;
    };
  }, [id]);

  async function fileDispute(reason: string, statement: string): Promise<{ ok: boolean; message?: string }> {
    const { data, error } = await openOrderDisputeApi(order!.backendId ?? order!.id, reason, statement);
    if (error || !data) {
      return { ok: false, message: error?.message || "We couldn't file your dispute. Nothing was changed." };
    }
    setOrder(data);
    return { ok: true };
  }

  if (loadState === "loading") {
    return (
      <PageContainer>
        <div role="status" className="flex flex-col items-center justify-center py-24 text-center">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-kampmax-blue" aria-hidden />
          <p className="text-sm text-kampmax-text-secondary">Loading your order…</p>
        </div>
      </PageContainer>
    );
  }

  if (loadState !== "ready" || !order) {
    return (
      <PageContainer>
        <div role="alert" className="mx-auto max-w-md space-y-3 py-16 text-center">
          <h1 className="text-xl font-bold text-kampmax-text">
            {loadState === "missing" ? "We couldn't find that order" : "We couldn't load your order"}
          </h1>
          <p className="text-sm text-kampmax-text-secondary">
            {loadState === "missing"
              ? "It may belong to a different account."
              : "Check your connection and try again. Nothing has been changed."}
          </p>
          <Link href="/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to my orders
          </Link>
        </div>
      </PageContainer>
    );
  }

  const dispute = order.dispute;
  const unpaid = order.status === "placed";
  const cancelled = order.status === "cancelled";
  const canReport = !dispute && !order.settled && !unpaid && !cancelled;

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Orders", href: "/orders" },
    { label: `#${order.id}`, href: `/orders/${order.id}` },
    { label: "Report a problem" },
  ];

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl space-y-4">
        <Breadcrumbs items={breadcrumbs} />

        <header>
          <h1 className="text-xl font-bold text-kampmax-text">Report a problem</h1>
          <p className="mt-0.5 text-xs text-kampmax-text-secondary">
            Order #{order.id} · {formatNaira(order.total)} · placed {formatDate(new Date(order.createdAt))}
          </p>
        </header>

        {dispute ? (
          <section role="status" className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
              {dispute.resolvedAt ? "Your dispute has been reviewed" : "Your dispute is open"}
            </h2>
            <dl className="space-y-1 text-xs">
              <div>
                <dt className="inline font-semibold">Opened: </dt>
                <dd className="inline">{formatDate(new Date(dispute.openedAt))}</dd>
              </div>
              {dispute.reason && (
                <div>
                  <dt className="inline font-semibold">Your report: </dt>
                  <dd className="inline">{dispute.reason}</dd>
                </div>
              )}
              {dispute.resolvedAt && (
                <div>
                  <dt className="inline font-semibold">Outcome: </dt>
                  <dd className="inline">{dispute.resolution || "Closed by Kampmax Trust & Safety"}</dd>
                </div>
              )}
            </dl>
            {!dispute.resolvedAt && (
              <p className="flex items-start gap-2 text-xs">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                The vendor will not be paid while we review. You will be notified of the outcome. A refund goes
                back to your wallet if your claim is upheld.
              </p>
            )}
          </section>
        ) : canReport ? (
          <section className="space-y-3 rounded-2xl border border-kampmax-border bg-white p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-kampmax-text">
              <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden /> Before you report
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-xs text-kampmax-text-secondary">
              <li>Try messaging the vendor first. Most problems are sorted in one reply.</li>
              <li>If you report, the vendor&apos;s payout is put on hold while Kampmax Trust &amp; Safety decides.</li>
              <li>If your claim is upheld, the refund goes to your Kampmax wallet.</li>
            </ul>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-error-600 px-4 py-2 text-xs font-bold text-white hover:bg-error-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-600 focus-visible:ring-offset-2"
            >
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> Report a problem with this order
            </button>
          </section>
        ) : (
          <section role="status" className="space-y-1 rounded-2xl border border-kampmax-border bg-white p-4 text-xs text-kampmax-text-secondary">
            <p className="font-semibold text-kampmax-text">
              {cancelled
                ? "This order was cancelled, so there is nothing to dispute."
                : unpaid
                  ? "This order has not been paid yet. You can cancel it from the order page."
                  : "The vendor has already been paid for this order."}
            </p>
            {order.settled && (
              <p>If something is still wrong, contact support and we will look into it.</p>
            )}
          </section>
        )}

        <HelpAndDisputeCard
          context="order"
          reference={order.id}
          showDispute={false}
          icon={<MessageCircle className="h-4 w-4" aria-hidden />}
        />
      </div>

      <OpenDisputeModal
        order={order}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmitDispute={fileDispute}
      />
    </PageContainer>
  );
}

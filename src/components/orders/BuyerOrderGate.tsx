"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { fetchOrderById } from "@/services/orders";
import type { Order } from "@/types";

type LoadState = "loading" | "ready" | "missing" | "error";

/** The buyer's own order from the server, with a setter for the order a later call returns. */
export function useBuyerOrder(id: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

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

  return { order, setOrder, loadState };
}

/**
 * Shows loading, "not found" and "couldn't load" for a buyer's order page, and
 * the page itself once the order is in.
 */
export function BuyerOrderGate({
  loadState,
  order,
  children,
}: {
  loadState: LoadState;
  order: Order | null;
  children: (order: Order) => ReactNode;
}) {
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

  return <>{children(order)}</>;
}

"use client";

import { useRouter } from "next/navigation";
import {
  CircleDashed,
  CheckCircle2,
  Loader,
  PackageCheck,
  Truck,
  XCircle,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { cn, formatNaira } from "@/lib/utils";
import { useVendorRecentOrders } from "@/hooks/use-vendor-dashboard";

const STATUS: Record<string, { label: string; icon: typeof Loader; cls: string }> = {
  pending: { label: "Pending", icon: CircleDashed, cls: "bg-neutral-100 text-neutral-700" },
  paid: { label: "Paid", icon: CheckCircle2, cls: "bg-success-50 text-success-700" },
  processing: { label: "Processing", icon: Loader, cls: "bg-info-50 text-info-700" },
  ready_for_pickup: { label: "Ready for Pickup", icon: PackageCheck, cls: "bg-warning-50 text-warning-700" },
  shipped: { label: "Shipped", icon: Truck, cls: "bg-primary-50 text-primary-700" },
  delivered: { label: "Delivered", icon: CheckCircle2, cls: "bg-success-50 text-success-700" },
  cancelled: { label: "Cancelled", icon: XCircle, cls: "bg-error-50 text-error-700" },
  refunded: { label: "Refunded", icon: RotateCcw, cls: "bg-neutral-100 text-neutral-700" },
  disputed: { label: "Disputed", icon: AlertTriangle, cls: "bg-error-50 text-error-700" },
};

export function VendorRecentOrders() {
  const router = useRouter();
  const { data: orders = [], isPending, isError } = useVendorRecentOrders();

  return (
    <div className="rounded-xl border border-kampmax-border bg-white">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-kampmax-text">Recent Orders</h3>
        <button
          type="button"
          onClick={() => router.push("/vendor/orders")}
          className="text-xs font-medium text-primary-600 hover:underline"
        >
          View all
        </button>
      </div>
      {isPending ? (
        <div className="space-y-2 px-4 pb-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      ) : isError ? (
        <p className="px-4 pb-4 text-sm text-error-700">Couldn&apos;t load your orders.</p>
      ) : orders.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-kampmax-text-secondary">
          You haven't received any orders yet.
        </p>
      ) : (
        <ul className="divide-y divide-kampmax-border">
          {orders.map((o) => {
            const s = STATUS[o.status] ?? STATUS.pending;
            const Icon = s.icon;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => router.push(o.href)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-kampmax-text">{o.id}</span>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", s.cls)}>
                        <Icon className="h-3 w-3" aria-hidden /> {s.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-kampmax-text-secondary">
                      {o.customerName} · {formatRelative(o.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-kampmax-text">
                    {formatNaira(o.amount)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

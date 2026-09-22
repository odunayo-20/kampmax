"use client";

import Link from "next/link";
import { ArrowLeft, MapPin, MessageSquare, Phone, Star } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDate, formatNaira } from "@/lib/utils";
import type { VendorCustomerDetails } from "@/types/vendor-customers";
import { customerSegmentLabel, customerSegmentVariant } from "./customers-meta";

interface CustomerDetailHeaderProps {
  details: VendorCustomerDetails;
}

export function CustomerDetailHeader({ details }: CustomerDetailHeaderProps) {
  const customer = details.customer;
  const earliest = details.orders[details.orders.length - 1];
  const reviewCount = details.reviews.length;
  const reviewAverage =
    reviewCount > 0
      ? Math.round((details.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10) / 10
      : 0;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Link
          href="/vendor/customers"
          className="inline-flex items-center gap-1 text-xs font-medium text-kampmax-text-secondary hover:text-kampmax-blue"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to customers
        </Link>
        <Link
          href={`/vendor/messages?buyerId=${encodeURIComponent(customer.buyerId)}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-kampmax-navy px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-kampmax-navy/90"
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
          Message Customer
        </Link>
      </div>

      <div className="rounded-xl border border-kampmax-border bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-kampmax-navy text-lg font-bold text-white">
              {customer.displayName.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-kampmax-text">{customer.displayName}</h1>
                <StatusBadge variant={customerSegmentVariant(customer.segment)} label={customerSegmentLabel(customer.segment)} />
              </div>
              <p className="text-sm text-kampmax-text-secondary">{customer.buyerId}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-kampmax-text-secondary">
            {customer.campusLabel && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-kampmax-muted/50 px-2.5 py-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {customer.campusLabel}
              </span>
            )}
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="inline-flex items-center gap-1 rounded-lg bg-kampmax-muted/50 px-2.5 py-1.5 hover:text-kampmax-blue"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {customer.phone}
              </a>
            )}
            <span className="inline-flex items-center gap-1 rounded-lg bg-kampmax-muted/50 px-2.5 py-1.5">
              <Star className="h-3.5 w-3.5 text-kampmax-gold" aria-hidden />
              {reviewCount > 0
                ? `${reviewAverage.toFixed(1)} · ${reviewCount} review${reviewCount === 1 ? "" : "s"}`
                : "No reviews yet"}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <HeaderStat label="Orders" value={String(customer.totalOrders)} />
          <HeaderStat label="Completed" value={String(customer.completedOrders)} />
          <HeaderStat label="In progress" value={String(customer.openOrders)} />
          <HeaderStat label="Total spent" value={formatNaira(customer.totalSpent)} />
          <HeaderStat label="First order" value={earliest ? formatDate(earliest.createdAt) : "—"} />
        </div>
      </div>
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-kampmax-muted/50 px-2 py-2 text-center">
      <p className="truncate text-sm font-bold text-kampmax-text">{value}</p>
      <p className="text-[10px] text-kampmax-text-secondary">{label}</p>
    </div>
  );
}
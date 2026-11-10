"use client";

import { useRouter } from "next/navigation";
import {
  CircleDashed,
  CheckCircle2,
  Clock,
  Loader,
  PackageCheck,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { cn, formatNaira } from "@/lib/utils";
import { useAccommodationEnquiries } from "@/hooks/use-accommodation";
import type { AccommodationEnquiryStatus } from "@/types/accommodation";

const STATUS: Record<AccommodationEnquiryStatus, { label: string; icon: typeof Loader; cls: string }> = {
  NEW: { label: "New Lead", icon: CircleDashed, cls: "bg-neutral-100 text-neutral-700" },
  CONTACTED: { label: "Contacted", icon: CheckCircle2, cls: "bg-info-50 text-info-700" },
  INSPECTION_SCHEDULED: { label: "Inspection Scheduled", icon: Clock, cls: "bg-warning-50 text-warning-700" },
  VISITED: { label: "Inspected", icon: PackageCheck, cls: "bg-primary-50 text-primary-700" },
  NEGOTIATING: { label: "Negotiating", icon: Loader, cls: "bg-purple-50 text-purple-700" },
  CLOSED: { label: "Closed", icon: CheckCircle2, cls: "bg-success-50 text-success-700" },
  CANCELLED: { label: "Cancelled", icon: XCircle, cls: "bg-error-50 text-error-700" },
  NOT_INTERESTED: { label: "Not Interested", icon: XCircle, cls: "bg-error-50 text-error-700" },
  UNRESPONSIVE: { label: "Unresponsive", icon: AlertTriangle, cls: "bg-neutral-100 text-neutral-700" },
};

export function AgentRecentInquiries() {
  const router = useRouter();
  const { data: enquiries, isPending, isError } = useAccommodationEnquiries("AGENT", 1);
  const items = enquiries?.items ?? [];

  return (
    <div className="rounded-xl border border-kampmax-border bg-white">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-kampmax-text">Recent Inquiries & Leads</h3>
        <button
          type="button"
          onClick={() => router.push("/agent/enquiries")}
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
        <p className="px-4 pb-4 text-sm text-error-700">Couldn&apos;t load your inquiries.</p>
      ) : items.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-kampmax-text-secondary">
          You haven&apos;t received any accommodation inquiries yet.
        </p>
      ) : (
        <ul className="divide-y divide-kampmax-border">
          {items.slice(0, 6).map((inquiry) => {
            const s = STATUS[inquiry.status] ?? STATUS.NEW;
            const Icon = s.icon;
            const inquiryCode = `INQ-${inquiry.id.slice(0, 14).toUpperCase()}`;

            return (
              <li key={inquiry.id}>
                <button
                  type="button"
                  onClick={() => router.push("/agent/enquiries")}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-kampmax-text">{inquiryCode}</span>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", s.cls)}>
                        <Icon className="h-3 w-3" aria-hidden /> {s.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-kampmax-text-secondary">
                      {inquiry.counterpart} · {inquiry.listingTitle || "Room Listing"} · {formatRelative(inquiry.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-kampmax-text">
                    ₦250,000
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
  if (!iso) return "recently";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}


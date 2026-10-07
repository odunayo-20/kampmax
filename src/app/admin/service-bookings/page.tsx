"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { apiClient } from "@/lib/api-client";
import { formatNaira } from "@/lib/utils";
import { formatBookingDate, formatBookingTime } from "@/services/booking";
import type { ServiceBooking } from "@/types/booking";

// Bookings where the customer reported a problem. The payment stays held until
// someone here pays the provider or refunds the customer.

const KEY = ["admin", "service-bookings", "disputed"] as const;

async function fetchDisputed(): Promise<ServiceBooking[]> {
  const { data, error } = await apiClient.get<{ items: ServiceBooking[] }>("/admin/service-bookings/disputed?limit=50");
  if (error || !data) throw error ?? new Error("Could not load disputed bookings.");
  return data.items;
}

async function resolve(input: { id: string; outcome: "release" | "refund"; note: string }) {
  const { error } = await apiClient.post(`/admin/service-bookings/${input.id}/resolve`, {
    outcome: input.outcome,
    note: input.note,
  });
  if (error) throw error;
}

export default function AdminServiceBookingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: KEY, queryFn: fetchDisputed, retry: false });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: resolve,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  return (
    <div>
      <AdminPageHeader
        title="Booking disputes"
        description="Customers who reported a problem. The money stays held until you pay the provider or refund the customer."
        actions={
          <Link href="/admin/service-providers" className="text-xs font-semibold text-kampmax-blue hover:underline">
            Service providers
          </Link>
        }
      />

      {query.isPending ? (
        <LoadingSkeleton />
      ) : query.isError ? (
        <ErrorState
          message={query.error instanceof Error ? query.error.message : "Could not load disputed bookings."}
          onRetry={() => void query.refetch()}
        />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No disputed bookings"
          message="When a customer reports a problem with a finished booking, it appears here."
        />
      ) : (
        <div className="space-y-4">
          {query.data.map((b) => {
            const note = notes[b.id] ?? "";
            const canSubmit = note.trim().length >= 3 && !mutation.isPending;
            return (
              <article key={b.id} className="rounded-xl border border-kampmax-border bg-white p-4">
                <header className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-kampmax-text">{b.serviceName}</h2>
                    <p className="text-xs text-kampmax-text-secondary">
                      {b.bookingReference} · {b.provider?.displayName ?? "Provider"} for {b.customer.name} ·{" "}
                      {formatBookingDate(b.startAt)} {formatBookingTime(b.startAt)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-kampmax-text">{formatNaira(b.price.amount)} held</p>
                </header>

                {b.fulfillment.problem && (
                  <div className="mt-3 rounded-lg bg-warning-50 p-3 text-xs text-warning-900">
                    <p className="font-semibold">{b.fulfillment.problem.category.replace(/_/g, " ")}</p>
                    <p className="mt-1">{b.fulfillment.problem.description}</p>
                  </div>
                )}

                <label className="mt-3 block text-xs font-medium text-kampmax-text-secondary" htmlFor={`note-${b.id}`}>
                  Decision note (sent to both people)
                </label>
                <textarea
                  id={`note-${b.id}`}
                  value={note}
                  onChange={(e) => setNotes((n) => ({ ...n, [b.id]: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-kampmax-border px-3 py-2 text-sm"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={() => mutation.mutate({ id: b.id, outcome: "release", note })}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Pay the provider
                  </button>
                  <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={() => mutation.mutate({ id: b.id, outcome: "refund", note })}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Refund the customer
                  </button>
                </div>
              </article>
            );
          })}
          {mutation.isError && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
              {mutation.error instanceof Error ? mutation.error.message : "Could not resolve that booking."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

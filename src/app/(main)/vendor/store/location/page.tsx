"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EntityLocationSettings } from "@/components/maps/EntityLocationSettings";
import { fetchVendorProfile } from "@/services/vendor-dashboard-api";
import { useAuth } from "@/lib/auth-context";

export default function VendorLocationPage() {
  const router = useRouter();
  const { status, user } = useAuth();
  const vendor = useQuery({
    queryKey: ["vendors", "me", user?.id ?? ""],
    enabled: status === "authenticated" && !!user?.id,
    staleTime: 60_000,
    queryFn: fetchVendorProfile,
  });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-kampmax-muted"
        >
          <ArrowLeft className="h-5 w-5 text-kampmax-text" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-kampmax-text">Store location</h1>
          <p className="text-sm text-kampmax-text-secondary">Choose where your store is and how precisely it appears to others.</p>
        </div>
      </div>

      {vendor.isLoading ? (
        <p role="status" className="py-6 text-center text-sm text-kampmax-text-secondary">
          Loading your store…
        </p>
      ) : vendor.isError || !vendor.data ? (
        <p role="alert" className="py-6 text-center text-sm text-kampmax-text">
          Couldn&apos;t load your store. Please try again.
        </p>
      ) : (
        <div className="rounded-xl border border-kampmax-border bg-white p-4">
          <EntityLocationSettings entityType="VENDOR" entityId={vendor.data.id} noun="your store" />
        </div>
      )}
    </div>
  );
}

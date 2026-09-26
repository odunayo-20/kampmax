"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanLine } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PageContainer } from "@/components/layout/PageContainer";
import { PickupScanner } from "@/components/orders/PickupScanner";

/**
 * Pickup scanner for vendors, pickup agents and admins. Access is enforced by
 * the backend (orders.pickup.scan, plus per-order ownership for vendors);
 * anyone else simply gets "Invalid pickup code" for every scan.
 */
export default function ScanPage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?next=/scan");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <PageContainer narrow>
        <div className="flex items-center justify-center gap-3 py-24 text-kampmax-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Checking your session…</span>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer narrow>
      <div className="space-y-5 py-4">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-kampmax-blue/10">
            <ScanLine className="h-6 w-6 text-kampmax-blue" />
          </div>
          <h1 className="text-xl font-bold text-kampmax-text">Pickup scanner</h1>
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            Scan the customer&apos;s pickup QR code to hand over their order.
          </p>
        </div>
        <PickupScanner />
      </div>
    </PageContainer>
  );
}

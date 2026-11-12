import { redirect } from "next/navigation";

/**
 * This used to be a "respond to dispute" screen whose Approve refund / Reject
 * buttons only changed local state, so a vendor could believe they had refunded
 * a customer when nothing had happened. Disputes are decided by Kampmax Trust &
 * Safety; the order page shows the vendor the real state.
 */
export default async function VendorDisputeRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/vendor/orders/${id}`);
}

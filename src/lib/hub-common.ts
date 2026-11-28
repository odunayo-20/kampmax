/**
 * Rules every dashboard shares (freelancer, service provider), as the mobile app's lib/hub-common does. Pure.
 */

/** "Received ₦12,000 · Payment for Logo design", from the newest completed wallet entry; null when there is none. */
export function latestPaymentLine(entries: { status: string; direction: string; amount: number; description: string }[], formatMoney: (n: number) => string): string | null {
  const hit = entries.find((t) => t.status === "completed");
  if (!hit) return null;
  const verb = hit.direction === "credit" ? "Received" : "Paid out";
  return [`${verb} ${formatMoney(hit.amount)}`, hit.description?.trim()].filter(Boolean).join(" · ");
}

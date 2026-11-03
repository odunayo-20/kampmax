// ============================================================
// WALLET CLEARING — PRESENTATION HELPER
// ============================================================
// Earnings from a contract arrive in the wallet at once but "clear" for a few
// days before they can be withdrawn or spent. The backend owns the rule and the
// dates; this only words them.

import { formatNaira } from "@/lib/utils";

export interface Clearing {
  amount: number;
  /** ISO time the amount becomes available. */
  releaseAt: string;
}

/** "today", "tomorrow" or "on 6 Nov", measured in the viewer's own calendar days. */
function whenText(releaseAt: string, now: Date): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const release = new Date(releaseAt);
  const days = Math.round((day(release) - day(now)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `on ${release.toLocaleDateString("en-NG", { day: "numeric", month: "short" })}`;
}

/**
 * One line for a wallet with earnings still clearing, or null when nothing is.
 * Says how much is clearing and when the soonest part becomes available, e.g.
 * "₦300 clearing · ₦100 available tomorrow".
 */
export function describeClearing(held: number, clearing: Clearing[] = [], now: Date = new Date()): string | null {
  if (!(held > 0)) return null;
  const next = [...clearing].sort((a, b) => a.releaseAt.localeCompare(b.releaseAt))[0];
  const base = `${formatNaira(held)} clearing`;
  return next ? `${base} · ${formatNaira(next.amount)} available ${whenText(next.releaseAt, now)}` : base;
}

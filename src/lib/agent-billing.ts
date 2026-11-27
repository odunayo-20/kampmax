/**
 * Paying for accommodation listings: packages, what a listing's subscription means, when it can be renewed, and the
 * only checkout links the page will open. The mobile app's lib/agent-billing.ts says the same things. Pure rules.
 */

import type { AccommodationPackage } from "@/types/accommodation";
import type { ListingTone } from "./agent-listings";

export const BILLING_TERMS =
  "I have read the billing terms: my listing is published for the package period after Kampmax approves it, a rejected listing is refunded, and I can turn off automatic renewal at any time.";

export const AUTO_RENEW_TEXT = "Renew automatically each period. I can turn this off whenever I want.";

export const PAYSTACK_NOTE = "You pay on Paystack's secure page. Kampmax never sees your card details.";

/**
 * The only checkout address the page will open: https, no sign-in details inside it, and a real host. Anything else
 * (a javascript: or http: address, or one with a user name in it) is refused. Returns the cleaned address or null.
 */
export function safeCheckoutUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text || text.length > 2000) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (!url.hostname || !url.hostname.includes(".")) return null;
  return url.toString();
}

export function durationText(days: number): string {
  if (days === 30) return "30 days";
  if (days % 30 === 0 && days > 30) return `${days / 30} months`;
  return days === 1 ? "1 day" : `${days} days`;
}

export function packageLabel(p: Pick<AccommodationPackage, "name" | "price" | "durationDays">, format: (n: number) => string): string {
  return p.price > 0 ? `${p.name} · ${format(p.price)} for ${durationText(p.durationDays)}` : `${p.name} · Free for ${durationText(p.durationDays)}`;
}

/** The packages the agent may choose from: switched-on only, cheapest first. */
export function choosablePackages(list: AccommodationPackage[]): AccommodationPackage[] {
  return list.filter((p) => p.isActive).sort((a, b) => a.price - b.price);
}

type Sub = { status: string; autoRenew: boolean; endsAt: string | null };

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" }) : "");

export function subscriptionView(s: Sub): { label: string; tone: ListingTone; text: string } {
  const ends = day(s.endsAt);
  switch (s.status) {
    case "PENDING_PAYMENT":
      return { label: "Waiting for payment", tone: "attention", text: "The payment has not gone through yet." };
    case "PENDING_APPROVAL":
      return { label: "Waiting for approval", tone: "info", text: "Paid. The period starts when the team approves the listing." };
    case "ACTIVE":
      return s.autoRenew
        ? { label: "Active", tone: "positive", text: ends ? `Renews automatically on ${ends}.` : "Renews automatically." }
        : { label: "Active", tone: "positive", text: ends ? `Runs until ${ends}. It will not renew by itself.` : "It will not renew by itself." };
    case "RENEWAL_PENDING":
      return { label: "Renewing", tone: "info", text: "A renewal payment is being processed." };
    case "PAST_DUE":
      return { label: "Payment failed", tone: "bad", text: "The last renewal payment failed. Renew now to keep the listing up." };
    case "SUSPENDED":
      return { label: "Suspended", tone: "bad", text: "Renewal payments failed three times, so the listing is hidden. Renew to bring it back." };
    case "EXPIRED":
      return { label: "Expired", tone: "attention", text: "The period has ended. Renew to show the listing again." };
    case "CANCELLED":
      return { label: "Cancelled", tone: "neutral", text: "This subscription has ended." };
    default:
      return { label: s.status, tone: "neutral", text: "" };
  }
}

export const EARLY_RENEWAL_DAYS = 7;
const DAY_MS = 86_400_000;

/** A lapsed subscription can always be renewed; an active one only in its last week. */
export function canRenewNow(s: Pick<Sub, "status" | "endsAt">, now: Date = new Date()): boolean {
  if (["PAST_DUE", "SUSPENDED", "EXPIRED"].includes(s.status)) return true;
  if (s.status !== "ACTIVE" || !s.endsAt) return false;
  const ends = new Date(s.endsAt).getTime();
  return Number.isFinite(ends) && ends - now.getTime() <= EARLY_RENEWAL_DAYS * DAY_MS;
}

/** Turning auto-renew off is always possible while it is on; turning it on needs an active subscription. */
export function renewalAction(s: Pick<Sub, "status" | "autoRenew">): "turn-off" | "turn-on" | null {
  if (s.autoRenew) return "turn-off";
  return s.status === "ACTIVE" ? "turn-on" : null;
}

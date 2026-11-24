/**
 * Account safety: where you are signed in, what stands in the way of closing an account, and what the app
 * says about your data. Pure rules, the same as the mobile app's, so both say the same thing.
 */

import { timeAgo } from "@/lib/utils";

export interface Session {
  id: string;
  /** "Chrome on Windows", "Kampmax app on Android". */
  device: string;
  /** The network with its last part hidden, or null. */
  place: string | null;
  signedInAt: string;
  expiresAt: string;
  /** The sign-in on this device. */
  current: boolean;
}

export type BlockerCode = "money" | "buying" | "selling" | "contracts" | "bookings" | "listings";

export interface ClosureBlocker {
  code: BlockerCode;
  message: string;
}

/** This device first, then the most recent. */
export function orderSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => Number(b.current) - Number(a.current) || Date.parse(b.signedInAt) - Date.parse(a.signedInAt));
}

/** "Signed in 3d ago · 102.89.•.•", for the line under the device name. */
export function sessionLine(session: Session): string {
  const when = session.current ? "This device" : `Signed in ${timeAgo(session.signedInAt)}`;
  return session.place ? `${when} · ${session.place}` : when;
}

/** How many other devices "sign out the others" would reach. */
export const otherSessions = (sessions: Session[]): number => sessions.filter((s) => !s.current).length;

/** Where a person goes to clear each blocker. */
export const BLOCKER_FIX: Record<BlockerCode, { label: string; href: string }> = {
  money: { label: "Open wallet", href: "/profile/wallet" },
  buying: { label: "See my orders", href: "/orders" },
  selling: { label: "See store orders", href: "/vendor/orders" },
  contracts: { label: "See my contracts", href: "/freelancer/contracts" },
  bookings: { label: "See my bookings", href: "/customer/bookings" },
  listings: { label: "See billing", href: "/agent/billing" },
};

export const canClose = (blockers: ClosureBlocker[], password: string): boolean => blockers.length === 0 && password.length > 0;

/** What to tell someone whose attempt to close the account failed. */
export function closeFailure(error: { status?: number } | null | undefined): string {
  if (error?.status === 400) return "That password is not right.";
  if (error?.status === 409) return "Something is still open on your account. Check the list above, then try again.";
  if (error?.status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  return "Could not close your account. Please try again.";
}

/** What the account loses. Shown before the password is asked, so the choice is made with open eyes. */
export const CLOSE_LOSSES: string[] = [
  "You are signed out on every device and cannot sign back in.",
  "Your store, if you have one, stops taking orders.",
  "Your saved items, addresses, messages and notifications are no longer reachable.",
  "Records of past orders, payments and contracts are kept, because the people you dealt with still need them.",
];

export interface PrivacyBlock {
  title: string;
  /** Plain statements. Each one is true of the app today. */
  lines: string[];
}

/**
 * Who sees what. These match what the server sends: a public profile has name, username, photo, bio, faculty,
 * department, level and the date you joined, and nothing else; delivery details go to the seller of that order only.
 */
export const PRIVACY_BLOCKS: PrivacyBlock[] = [
  {
    title: "Anyone on Kampmax can see",
    lines: ["Your name, username and photo", "Your bio, faculty, department and level", "When you joined", "Posts, reviews and listings you publish"],
  },
  {
    title: "Never shown to other people",
    lines: ["Your email address and password", "Your matric number and date of birth", "Your wallet balance and bank details", "Your saved addresses"],
  },
  {
    title: "Shared only when you act",
    lines: [
      "The seller of an order gets the name, phone number and address you give at checkout, to deliver it",
      "A seller, freelancer or agent you message sees your name and photo in that chat",
      "Your location is used only to sort what is near you. You can remove it any time",
    ],
  },
];

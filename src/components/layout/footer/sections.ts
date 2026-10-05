import type { UserRole } from "@/types";
import {
  KAMPMAX_ROLE_PATHS,
  roleHrefFor,
  type KampmaxRoleId,
} from "./role-paths";

/**
 * Footer navigation configuration.
 *
 * Every `href` below is a route that actually exists in the app (verified by
 * route audit). Links that have no real page yet are omitted instead of being
 * faked — dead links are never rendered.
 */

export interface FooterLink {
  label: string;
  href: string;
  /** Optional one-line pitch rendered under the label (Join Kampmax column). */
  description?: string;
}

export interface FooterSection {
  id: string;
  title: string;
  links: FooterLink[];
  /** Visually emphasised column (Join Kampmax). */
  highlight?: boolean;
}

const RESERVED: KampmaxRoleId[] = [
  "customer",
  "vendor",
  "freelancer",
  "service_provider",
  "employer",
];

function joinLinks(signedIn: boolean): FooterLink[] {
  return RESERVED.map((id) => {
    const path = KAMPMAX_ROLE_PATHS[id];
    return {
      label: path.joinLabel,
      href: roleHrefFor(id, signedIn),
      description: path.description,
    };
  });
}

/**
 * Static footer sections with guest-only "Join Kampmax" links.
 * Prefer `getFooterSections(signedIn)` at render time for auth-aware hrefs.
 */
export const footerSections: FooterSection[] = [
  {
    id: "explore",
    title: "Explore",
    links: [
      { label: "Home", href: "/home" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "Jobs", href: "/jobs" },
      { label: "Services", href: "/services" },
      { label: "Community", href: "/community" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    id: "join",
    title: "Join Kampmax",
    highlight: true,
    links: RESERVED.map((id) => {
      const path = KAMPMAX_ROLE_PATHS[id];
      return {
        label: path.joinLabel,
        href: path.guestHref,
        description: path.description,
      };
    }),
  },
  {
    id: "support",
    title: "Support",
    links: [
      { label: "Support Requests", href: "/support" },
      { label: "Open a Request", href: "/support/new" },
      { label: "Help Center", href: "/profile/help" },
      { label: "Contact Support", href: "/profile/help" },
    ],
  },
  {
    id: "company",
    title: "Company",
    links: [
      { label: "Terms & Conditions", href: "/profile/help" },
      { label: "Privacy Policy", href: "/profile/help" },
      { label: "Refund Policy", href: "/profile/help" },
      { label: "Cookie Policy", href: "/profile/help" },
    ],
  },
];

/**
 * Footer sections with the "Join Kampmax" links resolved for the current
 * session: guests are sent to the guest onboarding/registration entry,
 * signed-in members to their existing dashboard/profile area.
 */
export function getFooterSections(signedIn: boolean): FooterSection[] {
  return footerSections.map((section) =>
    section.id === "join"
      ? { ...section, links: joinLinks(signedIn) }
      : section
  );
}

export type FooterRole = UserRole | "freelancer" | "employer" | "ambassador";

/**
 * Contextual quick links surfaced for the current user, based on role.
 * Only routes that exist are used. Freelancer/employer entries are reserved
 * for the future ecosystem (the current auth contract can only issue
 * `student`, `vendor` and `admin`).
 */
const CONTEXTUAL_LINKS: Record<FooterRole, FooterLink[]> = {
  student: [
    { label: "My Orders", href: "/orders" },
    { label: "Wishlist", href: "/profile/wishlist" },
    { label: "My Account", href: "/profile" },
  ],
  vendor: [
    { label: "Vendor Dashboard", href: "/vendor" },
    { label: "Products", href: "/vendor/products" },
    { label: "Orders", href: "/vendor/orders" },
    { label: "Wallet", href: "/vendor/wallet" },
  ],
  admin: [],
  freelancer: [
    { label: "Dashboard", href: "/freelancer/dashboard" },
    { label: "Saved Jobs", href: "/freelancer/saved-jobs" },
    { label: "Earnings", href: "/freelancer/earnings" },
  ],
  employer: [
    { label: "Post Job", href: "/employer/jobs/create" },
    { label: "Manage Jobs", href: "/employer/jobs" },
    { label: "Applications", href: "/employer/applications" },
  ],
  ambassador: [],
};

export function getContextualLinks(role: FooterRole): FooterLink[] {
  return CONTEXTUAL_LINKS[role];
}
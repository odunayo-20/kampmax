import {
  BriefcaseBusiness,
  ShoppingBag,
  Store,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Kampmax role pathways — single source of truth for the "Join Kampmax"
 * messaging (footer, homepage role CTA, signup role step, public footer).
 *
 * Only routes that actually exist are referenced. Guests and existing
 * members get different destinations:
 *   - `guestHref`  -> the existing guest-accessible onboarding/registration
 *                     pathway for that role.
 *   - `memberHref` -> the existing dashboard/profile area for members who
 *                     already hold the profile (role dashboards enforce their
 *                     own access gates; client state never authorizes them).
 *
 * The backend auth contract exposes `UserRole = "student" | "vendor" | "admin"`
 * only; freelancer / service-provider / employer are profile-activation
 * onboards under one account. This file does NOT claim roles the backend
 * cannot issue.
 */

export type KampmaxRoleId =
  | "customer"
  | "vendor"
  | "freelancer"
  | "service_provider"
  | "employer";

export interface KampmaxRolePath {
  id: KampmaxRoleId;
  icon: LucideIcon;
  /** Short noun for cards / nav. */
  title: string;
  /** One-line pitch for the signup role step. */
  description: string;
  /** Label used in the footer "Join Kampmax" column. */
  joinLabel: string;
  /** Public, guest-accessible entry point. */
  guestHref: string;
  /** Signed-in destination (existing dashboard / profile). */
  memberHref: string;
}

export const KAMPMAX_ROLE_PATHS: Record<KampmaxRoleId, KampmaxRolePath> = {
  customer: {
    id: "customer",
    icon: ShoppingBag,
    title: "Customer",
    description: "Shop, discover services and connect with businesses.",
    joinLabel: "Join as a Customer",
    guestHref: "/register",
    memberHref: "/profile",
  },
  vendor: {
    id: "vendor",
    icon: Store,
    title: "Vendor",
    description: "Sell products and manage your store.",
    joinLabel: "Become a Vendor",
    guestHref: "/onboarding/vendor",
    memberHref: "/vendor",
  },
  freelancer: {
    id: "freelancer",
    icon: BriefcaseBusiness,
    title: "Freelancer",
    description: "Offer your skills and find freelance opportunities.",
    joinLabel: "Become a Freelancer",
    guestHref: "/onboarding/freelancer",
    memberHref: "/freelancer/dashboard",
  },
  service_provider: {
    id: "service_provider",
    icon: Wrench,
    title: "Service Provider",
    description: "Offer professional services to customers.",
    joinLabel: "Become a Service Provider",
    guestHref: "/onboarding/service-provider",
    memberHref: "/service-provider",
  },
  employer: {
    id: "employer",
    icon: Users,
    title: "Employer / Client",
    description: "Hire freelancers and service providers.",
    joinLabel: "Hire on Kampmax",
    guestHref: "/onboarding/employer",
    memberHref: "/employer/dashboard",
  },
};

/** Auth-aware destination for a role pathway. */
export function roleHrefFor(
  id: KampmaxRoleId,
  signedIn: boolean
): string {
  const path = KAMPMAX_ROLE_PATHS[id];
  return signedIn ? path.memberHref : path.guestHref;
}

export interface RoleCard {
  title: string;
  tagline: string;
  cta: string;
  icon: LucideIcon;
  href: (signedIn: boolean) => string;
}

/** Homepage "More than a marketplace" role grid (compact, no chrome). */
export const HOMEPAGE_ROLE_CARDS: RoleCard[] = [
  {
    title: "Shop",
    tagline: "Buy products from vendors.",
    cta: "Start Shopping",
    icon: ShoppingBag,
    href: () => "/marketplace",
  },
  {
    title: "Sell",
    tagline: "Open your store and sell on Kampmax.",
    cta: "Become a Vendor",
    icon: Store,
    href: (signedIn) => roleHrefFor("vendor", signedIn),
  },
  {
    title: "Freelance",
    tagline: "Offer your skills and find work.",
    cta: "Become a Freelancer",
    icon: BriefcaseBusiness,
    href: (signedIn) => roleHrefFor("freelancer", signedIn),
  },
  {
    title: "Services",
    tagline: "Offer professional services.",
    cta: "Become a Service Provider",
    icon: Wrench,
    href: (signedIn) => roleHrefFor("service_provider", signedIn),
  },
  {
    title: "Hire",
    tagline: "Find people for your jobs and projects.",
    cta: "Hire on Kampmax",
    icon: Users,
    href: (signedIn) => roleHrefFor("employer", signedIn),
  },
];
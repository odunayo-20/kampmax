import { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  Briefcase,
  CalendarCheck,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Package,
  PieChart,
  Receipt,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  ShieldAlert,
  ShoppingBag,
  Star,
  Store,
  Tags,
  Users,
  Wallet,
  Landmark,
  Send,
  Handshake,
  Boxes,
  ClipboardList,
  Fingerprint,
  Headphones,
  Wrench,
} from "lucide-react";
import { AdminNavItemKey, canSeeSection } from "./permissions";
import { AdminRole } from "@/types/admin";

export interface AdminNavItem {
  key: AdminNavItemKey;
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { key: "dashboard", href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { key: "reports", href: "/admin/reports", label: "Analytics", icon: BarChart3 },
    ],
  },
{
      id: "people",
      label: "People",
      items: [
        { key: "users", href: "/admin/users", label: "Users", icon: Users },
        { key: "vendors", href: "/admin/vendors", label: "Vendors", icon: Store },
        { key: "freelancers", href: "/admin/freelancers", label: "Freelancers", icon: Briefcase },
        { key: "serviceProviders", href: "/admin/service-providers", label: "Service providers", icon: Wrench },
        { key: "employers", href: "/admin/employers", label: "Employers", icon: Handshake },
        { key: "verifications", href: "/admin/verifications", label: "Verifications", icon: BadgeCheck },
        { key: "campuses", href: "/admin/campuses", label: "Campuses", icon: Building2 },
      ],
    },
  {
    id: "hiring",
    label: "Hiring",
    items: [
      { key: "jobs", href: "/admin/jobs", label: "Jobs", icon: ClipboardList },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      { key: "products", href: "/admin/products", label: "Products", icon: Package },
      { key: "marketplace", href: "/admin/marketplace", label: "Marketplace", icon: Boxes },
      { key: "categories", href: "/admin/categories", label: "Categories", icon: Tags },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      { key: "orders", href: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { key: "transactions", href: "/admin/transactions", label: "Transactions", icon: Receipt },
      { key: "promotions", href: "/admin/promotions", label: "Promotions", icon: Megaphone },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { key: "finance", href: "/admin/finance", label: "Finance", icon: PieChart },
      { key: "payouts", href: "/admin/payouts", label: "Payouts", icon: Send },
      { key: "wallet", href: "/admin/wallet", label: "Wallets", icon: Wallet },
      { key: "withdrawals", href: "/admin/withdrawals", label: "Withdrawals", icon: Landmark },
    ],
  },
  {
    id: "moderation",
    label: "Moderation",
    items: [
      { key: "campusFeed", href: "/admin/campus", label: "Campus Feed", icon: GraduationCap },
      { key: "eventOrganizers", href: "/admin/event-organizers", label: "Event Organizers", icon: CalendarCheck },
      { key: "reviews", href: "/admin/reviews", label: "Reviews", icon: Star },
      { key: "safety", href: "/admin/safety", label: "Trust & Safety", icon: ShieldAlert },
      { key: "disputes", href: "/admin/disputes", label: "Disputes", icon: Scale },
      { key: "support", href: "/admin/support", label: "Support", icon: Headphones },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { key: "notifications", href: "/admin/notifications", label: "Notifications", icon: Bell },
      { key: "permissions", href: "/admin/permissions", label: "Roles & Permissions", icon: ShieldCheck },
      { key: "settings", href: "/admin/settings", label: "Settings", icon: Settings },
      { key: "security", href: "/admin/security", label: "Security Center", icon: Fingerprint },
      { key: "auditLogs", href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
    ],
  },
];

/** Flat list of nav items visible to a role. */
export function getNavForRole(role: AdminRole): AdminNavGroup[] {
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSeeSection(role, item.key)),
  })).filter((group) => group.items.length > 0);
}

// ------------------------------------------------------------
// BREADCRUMBS
// ------------------------------------------------------------

const LABELS: Record<string, string> = Object.fromEntries([
  ...ADMIN_NAV_GROUPS.flatMap((g) =>
    g.items.map((i) => [i.href.replace("/admin", "") || "/", i.label] as const)
  ),
]);

export function breadcrumbLabel(segment: string, index: number): string {
  if (index === 0) return "Admin";
  if (index === 1) {
    return LABELS[`/${segment}`] ?? titleCase(segment);
  }
  // Detail routes (/orders/KMP-2437 etc.)
  return segment.includes("-") ? segment.toUpperCase() : titleCase(segment);
}

export function isDetailSegment(segment: string): boolean {
    return /^(KMP-|usr-|vnd-|prd-|dsp-|rpt-|rev-|pst-|wdr-|prm-|fl-|freelancer|p\d+|opp_|r\d+|prv_|vrf-|tkt-)/i.test(segment);
}

function titleCase(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingCart,
  Users,
  Star,
  Megaphone,
  BarChart3,
  Wallet,
  UsersRound,
  Settings,
  Home,
  Lock,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VendorPermissions } from "@/types/vendor-dashboard";
import { VendorStatusBadge } from "./VendorStatusBadge";
import { useUnreadMessageCount } from "@/hooks/use-messages";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Store;
  /** Permission key gate (presentation only). */
  permission?: keyof VendorPermissions;
  /** Future module — placeholder, not yet implemented. */
  placeholder?: boolean;
  badge?: string;
}

type NavSection = { title?: string; items: NavItem[] };

interface VendorSidebarProps {
  storeName: string;
  permissions: VendorPermissions;
  status: "approved" | "suspended";
}

export function VendorSidebar({ storeName, permissions, status }: VendorSidebarProps) {
  const pathname = usePathname();
  const unreadMessagesQuery = useUnreadMessageCount();
  const unreadMessages = unreadMessagesQuery.data ?? 0;

  const sections: NavSection[] = [
    {
      items: [
        { href: "/vendor", label: "Overview", icon: LayoutDashboard },
        { href: "/vendor/store", label: "Store", icon: Store, permission: "canManageStore" },
      ],
    },
    {
      title: "Selling",
      items: [
        { href: "/vendor/products", label: "Products", icon: Package, permission: "canManageProducts" },
        { href: "/vendor/orders", label: "Orders", icon: ShoppingCart, permission: "canManageOrders", badge: "3" },
        { href: "/vendor/customers", label: "Customers", icon: Users, permission: "canManageCustomers" },
        { href: "/vendor/reviews", label: "Reviews", icon: Star, permission: "canManageReviews" },
      ],
    },
    {
      title: "Growth",
      items: [
        { href: "/vendor/promotions", label: "Promotions", icon: Megaphone, permission: "canManagePromotions" },
        { href: "/vendor/analytics", label: "Analytics", icon: BarChart3, permission: "canViewAnalytics", placeholder: true },
        { href: "/vendor/wallet", label: "Wallet", icon: Wallet, placeholder: true },
        { href: "/vendor/earnings", label: "Earnings", icon: Wallet, placeholder: true },
      ],
    },
    {
      title: "Account",
      items: [
        { href: "/vendor/verification", label: "Verification & KYC", icon: ShieldCheck },
        { href: "/vendor/staff", label: "Staff", icon: UsersRound, permission: "canManageStaff", placeholder: true },
        { href: "/vendor/financials", label: "Financials", icon: Wallet, permission: "canViewFinancials" },
        {
          href: "/chat",
          label: "Messages",
          icon: MessageSquare,
          badge: unreadMessages > 0 ? (unreadMessages > 9 ? "9+" : String(unreadMessages)) : undefined,
        },
        { href: "/vendor/store/settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  return (
    <div className="flex h-full flex-col bg-kampmax-navy">
      {/* Brand + return to marketplace */}
      <div className="px-4 pt-5 pb-2">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white"
        >
          <Home className="h-4 w-4" aria-hidden />
          Back to Kampmax
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-kampmax-gold text-kampmax-navy font-bold">
            {storeName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{storeName}</p>
            <VendorStatusBadge
              status={status === "approved" ? "APPROVED" : "SUSPENDED"}
              className="mt-0.5 bg-white/10 text-white ring-white/20"
            />
          </div>
        </div>
      </div>

      <nav aria-label="Vendor dashboard" className="flex-1 overflow-y-auto px-3 py-3">
        {sections.map((section, si) => (
          <div key={si} className="mb-4">
            {section.title && (
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const permitted = item.permission ? permissions[item.permission] : true;
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-disabled={!permitted}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-white/10 text-white"
                          : "text-white/70 hover:bg-white/5 hover:text-white",
                        !permitted && "pointer-events-none opacity-50"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.placeholder && <Lock className="h-3.5 w-3.5 text-white/40" aria-label="Coming soon" />}
                      {item.badge && (
                        <span className="rounded-full bg-kampmax-gold px-1.5 py-0.5 text-[10px] font-bold text-kampmax-navy">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <Link
          href="/marketplace"
          className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
        >
          <Store className="h-4 w-4 shrink-0" aria-hidden />
          Return to Marketplace
        </Link>
      </nav>
    </div>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/vendor") return pathname === "/vendor";
  if (["/vendor/store", "/vendor/store/settings"].includes(href)) {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Store, GraduationCap, MessageCircle, Briefcase, Wrench,
  MapPin, Search, ShoppingCart, ChevronDown
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/ui";
import { NotificationBell } from "@/components/notifications";
import { UnreadMessageBadge } from "@/components/messages/UnreadMessageBadge";
import { useUnreadMessageCount } from "@/hooks/use-messages";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/marketplace", icon: Store, label: "Market" },
  { href: "/services", icon: Wrench, label: "Services" },
  { href: "/jobs", icon: Briefcase, label: "Jobs" },
  { href: "/community", icon: GraduationCap, label: "Community" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
];

export function DesktopNavigation() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { selectedCampus } = useApp();
  const { user } = useAuth();
  const unreadMessagesQuery = useUnreadMessageCount();
  const unreadMessages = unreadMessagesQuery.data ?? 0;

  function isActive(href: string): boolean {
    if (href === "/home") return pathname === "/home";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="hidden lg:block sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-kampmax-border">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between h-[60px] px-6">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link href="/home" className="flex items-center gap-1.5 mr-4">
            <span className="text-xl font-bold text-kampmax-navy tracking-tight">
              Kampmax
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "text-primary-600 bg-primary-50 font-semibold"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                  )}
                >
                  <span className="relative">
                    <link.icon className={cn("h-4 w-4", active && "stroke-[2.5px]")} />
                    {link.href === "/chat" && (
                      <UnreadMessageBadge
                        count={unreadMessages}
                        className="absolute -top-2 -right-2 min-w-[15px] h-[15px] text-[9px]"
                      />
                    )}
                  </span>
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Campus + Actions + Profile */}
          <div className="flex items-center gap-2">
          <Link
            href="/search"
            aria-label="Search"
            className={cn(
              "h-9 w-9 flex items-center justify-center rounded-md transition-colors",
              "hover:bg-neutral-100 text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
              isActive("/search") && "bg-primary-50 text-primary-600"
            )}
          >
            <Search className="h-[18px] w-[18px]" />
          </Link>

          <div className="flex items-center gap-1.5 text-sm text-neutral-600 mr-2 px-2.5 py-1.5 rounded-md bg-neutral-50 border border-neutral-200">
            <MapPin className="h-3.5 w-3.5 text-primary-600" />
            <span className="font-semibold text-neutral-900">{selectedCampus.abbreviation}</span>
            <ChevronDown className="h-3 w-3 text-neutral-500" />
          </div>

          <NotificationBell
            variant="dropdown"
            active={isActive("/notifications")}
          />

          <Link
            href="/cart"
            className={cn(
              "relative h-9 w-9 flex items-center justify-center rounded-md transition-colors",
              "hover:bg-neutral-100 text-neutral-600",
              isActive("/cart") && "bg-primary-50 text-primary-600"
            )}
          >
            <ShoppingCart className="h-[18px] w-[18px]" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-primary-600 text-white text-[9px] font-bold rounded-full px-1">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Link>

          <div className="w-px h-6 bg-neutral-200 mx-1" />

          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-2 pl-2 pr-3 py-1 rounded-md transition-colors",
              "hover:bg-neutral-100",
              isActive("/profile") && "bg-primary-50"
            )}
          >
            <Avatar
              name={user?.name || "User"}
              size="sm"
              className="h-8 w-8 text-xs"
            />
            <span className="text-sm font-medium text-neutral-900 max-w-[120px] truncate">
              {user?.name || "Profile"}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

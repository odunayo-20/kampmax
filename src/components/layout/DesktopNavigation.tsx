"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  CreditCard,
  MapPin,
  Search,
  ShoppingCart,
  ChevronDown,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/ui";
import { NotificationBell } from "@/components/notifications";
import { UnreadMessageBadge } from "@/components/messages/UnreadMessageBadge";
import { useUnreadMessageCount } from "@/hooks/use-messages";
import { DESKTOP_NAV_LINKS } from "@/config/navigation";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

export function DesktopNavigation() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { selectedCampus } = useApp();
  const { user } = useAuth();
  const unreadMessagesQuery = useUnreadMessageCount();
  const unreadMessages = unreadMessagesQuery.data ?? 0;

  function isActive(href: string): boolean {
    if (href === "/home") return pathname === "/home" || pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="hidden lg:block sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-200/90 shadow-2xs">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between h-[60px] px-6">
        {/* Left: Brand Logo + 4 Core Primary Navigation Links */}
        <div className="flex items-center gap-8">
          <div className="mr-2">
            <Logo size="md" href="/home" />
          </div>

          <nav aria-label="Desktop Navigation" className="flex items-center gap-1.5">
            {DESKTOP_NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150",
                    active
                      ? "text-primary-700 bg-primary-50/90 font-bold shadow-2xs"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-transform duration-150",
                      active ? "stroke-[2.5px] text-primary-600 scale-105" : "text-neutral-500"
                    )}
                  />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Actions, Wallet, Campus & Profile */}
        <div className="flex items-center gap-2">
          {/* Universal Search */}
          <Link
            href="/search"
            aria-label="Search Kampmax"
            className={cn(
              "h-9 w-9 flex items-center justify-center rounded-xl transition-colors",
              "hover:bg-neutral-100 text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
              isActive("/search") && "bg-primary-50 text-primary-600"
            )}
          >
            <Search className="h-[18px] w-[18px]" />
          </Link>

          {/* Kampmax Pay Contextual Wallet Entry Point */}
          <Link
            href="/pay"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all mr-1",
              isActive("/pay")
                ? "bg-primary-600 text-white shadow-xs"
                : "bg-primary-50/90 text-primary-700 hover:bg-primary-100 border border-primary-200/70"
            )}
            title="Kampmax Pay Wallet"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Pay</span>
          </Link>

          {/* Campus Selector */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-600 px-2.5 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200">
            <MapPin className="h-3.5 w-3.5 text-primary-600" />
            <span className="font-semibold text-neutral-900">{selectedCampus.abbreviation}</span>
            <ChevronDown className="h-3 w-3 text-neutral-500" />
          </div>

          {/* Chat / Messages with unread badge */}
          <Link
            href="/chat"
            aria-label="Messages"
            className={cn(
              "relative h-9 w-9 flex items-center justify-center rounded-xl transition-colors",
              "hover:bg-neutral-100 text-neutral-600",
              isActive("/chat") && "bg-primary-50 text-primary-600"
            )}
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            <UnreadMessageBadge
              count={unreadMessages}
              className="absolute -top-1 -right-1 min-w-[16px] h-4 text-[9px]"
            />
          </Link>

          {/* Notifications Dropdown Bell */}
          <NotificationBell
            variant="dropdown"
            active={isActive("/notifications")}
          />

          {/* Shopping Cart */}
          <Link
            href="/cart"
            aria-label="Cart"
            className={cn(
              "relative h-9 w-9 flex items-center justify-center rounded-xl transition-colors",
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

          {/* User Profile */}
          <Link
            href="/profile"
            aria-label="User Profile"
            className={cn(
              "flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl transition-colors",
              "hover:bg-neutral-100",
              isActive("/profile") && "bg-primary-50"
            )}
          >
            <Avatar
              name={user?.name || "Daniel"}
              size="sm"
              className="h-7 w-7 text-[11px]"
            />
            <span className="text-xs font-semibold text-neutral-900 max-w-[110px] truncate">
              {user?.name || "Profile"}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

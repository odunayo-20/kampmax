import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Heart,
  Store,
  Bookmark,
  MapPin,
  Coins,
  Award,
  Star,
  Bell,
  User,
  Settings,
  Users,
  LifeBuoy,
} from "lucide-react";

export interface AccountNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Only enabled when the backend feature is active. */
  enabled?: boolean;
}

interface AccountNavGroup {
  title: string;
  items: AccountNavItem[];
}

/**
 * Single source of truth for account navigation (desktop sidebar + mobile
 * sheet both render from this). Existing routes are reused where they already
 * exist (orders, wishlist, addresses, notifications, profile, settings) so we
 * never duplicate them. Routes point at the same user account — never a new
 * login.
 */
export const ACCOUNT_NAV_GROUPS: AccountNavGroup[] = [
  {
    title: "Account",
    items: [
      { label: "Overview", href: "/account", icon: LayoutDashboard },
      { label: "Orders", href: "/orders", icon: Package },
      { label: "Wishlist", href: "/profile/wishlist", icon: Heart },
      { label: "Stores I Follow", href: "/profile/following", icon: Store },
      { label: "Saved for Later", href: "/account/saved", icon: Bookmark },
    ],
  },
  {
    title: "Keep & Grow",
    items: [
      { label: "Addresses", href: "/profile/addresses", icon: MapPin },
      { label: "Kampmax Coin", href: "/account/coin", icon: Coins },
      { label: "Rewards", href: "/account/rewards", icon: Award },
      { label: "My Reviews", href: "/account/reviews", icon: Star },
      { label: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
  {
    title: "Manage",
    items: [
      { label: "Profile", href: "/profile/edit", icon: User },
      { label: "Settings", href: "/profile/settings", icon: Settings },
      { label: "Help & Support", href: "/support", icon: LifeBuoy },
    ],
  },
];

/** "My Kampmax Profiles" is clearly separated (multi-profile center). */
export const ACCOUNT_PROFILES_ITEM: AccountNavItem = {
  label: "My Kampmax Profiles",
  href: "/account/profiles",
  icon: Users,
};

import {
  Home,
  Compass,
  Ticket,
  Users,
  Menu,
  Store,
  Wrench,
  Briefcase,
  GraduationCap,
  MapPin,
  Package,
  Bookmark,
  ShoppingCart,
  CreditCard,
  User,
  Bell,
  HelpCircle,
  MessageCircle,
  LucideIcon,
} from "lucide-react";

export interface NavItemConfig {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  badge?: string;
  accent?: boolean;
  activeMatch?: (pathname: string) => boolean;
}

export interface NavSectionConfig {
  id: string;
  title: string;
  description?: string;
  items: NavItemConfig[];
}

/**
 * Primary 5-Tab Mobile Bottom Navigation.
 * NOTE: Kampmax Pay is intentionally excluded to preserve clean hierarchy.
 */
export const BOTTOM_NAV_ITEMS: NavItemConfig[] = [
  {
    id: "home",
    label: "Home",
    href: "/home",
    icon: Home,
    activeMatch: (pathname: string) => pathname === "/home" || pathname === "/",
  },
  {
    id: "explore",
    label: "Explore",
    href: "/explore",
    icon: Compass,
    activeMatch: (pathname: string) => pathname === "/explore" || pathname.startsWith("/explore/"),
  },
  {
    id: "events",
    label: "Events",
    href: "/events",
    icon: Ticket,
    activeMatch: (pathname: string) => pathname === "/events" || pathname.startsWith("/events/"),
  },
  {
    id: "community",
    label: "Community",
    href: "/community",
    icon: Users,
    activeMatch: (pathname: string) => pathname === "/community" || pathname.startsWith("/community/"),
  },
  {
    id: "more",
    label: "More",
    href: "/more",
    icon: Menu,
    activeMatch: (pathname: string) => pathname === "/more" || pathname.startsWith("/more/"),
  },
];

/**
 * Categorized Navigation Hub for the "More" screen.
 */
export const MORE_MENU_SECTIONS: NavSectionConfig[] = [
  {
    id: "discover",
    title: "DISCOVER",
    description: "Explore opportunities and campus marketplace verticals",
    items: [
      {
        id: "categories",
        label: "Categories Directory",
        href: "/categories",
        icon: Menu,
        description: "Browse all product, service & gig departments",
      },
      {
        id: "marketplace",
        label: "Marketplace",
        href: "/marketplace",
        icon: Store,
        description: "Campus buy & sell, gadgets, fashion & textbooks",
      },
      {
        id: "services",
        label: "Services & Gigs",
        href: "/services",
        icon: Wrench,
        description: "Hire student and campus service pros",
      },
      {
        id: "jobs",
        label: "Jobs & Internships",
        href: "/jobs",
        icon: Briefcase,
        description: "Part-time campus jobs, gigs & internships",
      },
      {
        id: "courses",
        label: "Courses & Skills",
        href: "/explore?tab=courses",
        icon: GraduationCap,
        description: "Campus skill programs & certifications",
      },
      {
        id: "nearby",
        label: "Nearby Discovery",
        href: "/nearby",
        icon: MapPin,
        description: "Interactive campus map, food & verified spots",
      },
    ],
  },
  {
    id: "my-kampmax",
    title: "MY KAMPMAX",
    description: "Track your activity and saved items",
    items: [
      {
        id: "orders",
        label: "My Orders",
        href: "/orders",
        icon: Package,
        description: "Track purchases and order history",
      },
      {
        id: "tickets",
        label: "My Tickets & Passes",
        href: "/events",
        icon: Ticket,
        description: "Access your digital event passes & QR codes",
      },
      {
        id: "saved",
        label: "Saved Items",
        href: "/customer/saved",
        icon: Bookmark,
        description: "Saved products, services & bookmarks",
      },
      {
        id: "cart",
        label: "Cart",
        href: "/cart",
        icon: ShoppingCart,
        description: "Items ready for campus checkout",
      },
    ],
  },
  {
    id: "finance",
    title: "FINANCE",
    description: "Protected campus wallet and financial transactions",
    items: [
      {
        id: "pay",
        label: "Kampmax Pay",
        href: "/pay",
        icon: CreditCard,
        description: "Wallet balance, instant transfers & virtual cards",
        badge: "Escrow Protected",
        accent: true,
      },
    ],
  },
  {
    id: "partner",
    title: "EARN & PARTNER ON CAMPUS",
    description: "Monetize skills, sell products or hire campus talent",
    items: [
      {
        id: "become-vendor",
        label: "Open a Vendor Store",
        href: "/onboarding/vendor",
        icon: Store,
        description: "Sell products to students across hostels & faculties",
        badge: "Sell",
      },
      {
        id: "become-provider",
        label: "Register as a Service Pro",
        href: "/onboarding/service-provider",
        icon: Wrench,
        description: "Offer laundry, styling, repairs, photography & tutoring",
        badge: "Offer Services",
      },
      {
        id: "become-freelancer",
        label: "Freelance & Offer Gigs",
        href: "/onboarding/freelancer",
        icon: Briefcase,
        description: "Apply for campus tech, design & writing projects",
        badge: "Freelance",
      },
      {
        id: "hire-talent",
        label: "Hire Campus Talent",
        href: "/onboarding/employer",
        icon: Users,
        description: "Post jobs, gigs and internships for student pros",
        badge: "Hire",
      },
    ],
  },
  {
    id: "account",
    title: "ACCOUNT & SUPPORT",
    description: "Profile settings and student support desk",
    items: [
      {
        id: "profile",
        label: "Profile & Identity",
        href: "/profile",
        icon: User,
        description: "Personal info, campus ID and verification",
      },
      {
        id: "notifications",
        label: "Notifications",
        href: "/notifications",
        icon: Bell,
        description: "Order alerts, campus events & announcements",
      },
      {
        id: "support",
        label: "Help & Support",
        href: "/support",
        icon: HelpCircle,
        description: "Campus support desk, disputes & FAQs",
      },
    ],
  },
];

/**
 * Desktop Header Navigation Links (4 core primary destinations)
 */
export const DESKTOP_NAV_LINKS: NavItemConfig[] = [
  { id: "home", href: "/home", icon: Home, label: "Home" },
  { id: "explore", href: "/explore", icon: Compass, label: "Explore" },
  { id: "events", href: "/events", icon: Ticket, label: "Events" },
  { id: "community", href: "/community", icon: Users, label: "Community" },
];

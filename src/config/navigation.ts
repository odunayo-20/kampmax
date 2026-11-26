import {
  Home,
  Compass,
  Newspaper,
  Ticket,
  Users,
  Menu,
  Store,
  Wrench,
  Laptop,
  Briefcase,
  MapPin,
  Building2,
  Package,
  Bookmark,
  ShoppingCart,
  CreditCard,
  User,
  Bell,
  HelpCircle,
  MessageCircle,
  CalendarCheck,
  Star,
  FileText,
  Send,
  FileSignature,
  UserCog,
  Receipt,
  MapPinned,
  LocateFixed,
  Settings,
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
        id: "freelancer-services",
        label: "Freelancer Services",
        href: "/freelancers/services",
        icon: Laptop,
        description: "Design, development, writing & more from campus freelancers",
        activeMatch: (pathname: string) => pathname.startsWith("/freelancers"),
      },
      {
        id: "jobs",
        label: "Jobs & Internships",
        href: "/jobs",
        icon: Briefcase,
        description: "Part-time campus jobs, gigs & internships",
      },
      {
        id: "nearby",
        label: "Nearby Discovery",
        href: "/nearby",
        icon: MapPin,
        description: "Interactive campus map, food & verified spots",
      },
      {
        id: "accommodation",
        label: "Student Accommodation",
        href: "/accommodation",
        icon: Building2,
        description: "Find verified rooms and student housing",
      },
      {
        id: "blog",
        label: "Blog",
        href: "/blog",
        icon: Newspaper,
        description: "Guides, opportunities & stories for students and vendors",
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
        href: "/tickets",
        icon: Ticket,
        description: "Access your digital event passes & QR codes",
      },
      {
        id: "saved",
        label: "Saved Items",
        href: "/profile/wishlist",
        icon: Bookmark,
        description: "Saved products, services & bookmarks",
      },
      {
        id: "followed-stores",
        label: "Stores I Follow",
        href: "/profile/following",
        icon: Store,
        description: "New items and offers from stores you follow",
      },
      {
        id: "saved-accommodation",
        label: "Saved Accommodation",
        href: "/accommodation/saved",
        icon: Bookmark,
        description: "Rooms and apartments you saved",
      },
      {
        id: "accommodation-enquiries",
        label: "Accommodation Enquiries",
        href: "/accommodation/my-enquiries",
        icon: MessageCircle,
        description: "Messages and inspection requests with agents",
      },
      {
        id: "cart",
        label: "Cart",
        href: "/cart",
        icon: ShoppingCart,
        description: "Items ready for campus checkout",
      },
      {
        id: "bookings",
        label: "My Bookings",
        href: "/customer/bookings",
        icon: CalendarCheck,
        description: "Appointments with service providers",
      },
      {
        id: "messages",
        label: "Messages",
        href: "/chat",
        icon: MessageCircle,
        description: "Chats with sellers, clients and freelancers",
      },
      {
        id: "my-reviews",
        label: "My Reviews",
        href: "/profile/reviews",
        icon: Star,
        description: "Feedback you have left, to edit or remove",
      },
    ],
  },
  {
    id: "work",
    title: "WORK & HIRING",
    description: "What you applied for, proposed and agreed to",
    items: [
      {
        id: "cvs",
        label: "My CVs",
        href: "/profile/cvs",
        icon: FileText,
        description: "The CVs you apply with, kept private",
      },
      {
        id: "applications",
        label: "My Applications",
        href: "/profile/applications",
        icon: Send,
        description: "Vacancies and internships, and how each is going",
      },
      {
        id: "proposals",
        label: "My Proposals",
        href: "/freelancer/proposals",
        icon: FileText,
        description: "Gigs you bid on",
      },
      {
        id: "contracts",
        label: "My Contracts",
        href: "/freelancer/contracts",
        icon: FileSignature,
        description: "Accepted work, payments and delivery",
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
        description: "Balance, top-ups and history",
        badge: "Escrow Protected",
        accent: true,
      },
      {
        id: "bank-accounts",
        label: "Bank Accounts & Payouts",
        href: "/profile/payment-methods",
        icon: Building2,
        description: "Where withdrawals are sent",
      },
      {
        id: "transaction-history",
        label: "Transaction History",
        href: "/profile/wallet",
        icon: Receipt,
        description: "Every credit and debit",
      },
    ],
  },
  {
    id: "partner",
    title: "EARN & PARTNER ON CAMPUS",
    description: "Monetize skills, sell products or hire campus talent",
    items: [
      {
        id: "profiles",
        label: "Your Profiles",
        href: "/account/profiles",
        icon: UserCog,
        description: "Everything your account can do, in one place",
        accent: true,
      },
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
      {
        id: "accommodation-agent",
        label: "List Accommodation",
        href: "/onboarding/agent",
        icon: Building2,
        description: "Apply as an agent and manage property listings",
        badge: "List",
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
        id: "addresses",
        label: "Saved Addresses",
        href: "/profile/addresses",
        icon: MapPinned,
        description: "Where you get things delivered",
      },
      {
        id: "my-location",
        label: "My Location",
        href: "/profile/location",
        icon: LocateFixed,
        description: "Used to show what is near you",
      },
      {
        id: "notifications",
        label: "Notifications",
        href: "/notifications",
        icon: Bell,
        description: "Order alerts, campus events & announcements",
      },
      {
        id: "settings",
        label: "Settings",
        href: "/profile/settings",
        icon: Settings,
        description: "Notifications, password and payments",
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
 * Desktop Header Navigation Links (core destinations, plus More for the full menu)
 */
export const DESKTOP_NAV_LINKS: NavItemConfig[] = [
  { id: "home", href: "/home", icon: Home, label: "Home" },
  { id: "explore", href: "/explore", icon: Compass, label: "Explore" },
  { id: "events", href: "/events", icon: Ticket, label: "Events" },
  { id: "community", href: "/community", icon: Users, label: "Community" },
  { id: "more", href: "/more", icon: Menu, label: "More" },
];

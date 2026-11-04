import {
  BellRing,
  BriefcaseBusiness,
  Coins,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  type LucideIcon,
} from "lucide-react";
import type { SettingsSectionKey } from "@/types/admin";

export interface SettingsSectionDef {
  key: SettingsSectionKey;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
  {
    key: "general",
    label: "General",
    description: "Platform identity and support contact details.",
    icon: Settings,
  },
  {
    key: "marketplace",
    label: "Marketplace",
    description: "Commission, approvals and cancellation rules.",
    icon: Store,
  },
  {
    key: "orders",
    label: "Orders",
    description: "Delivery, pickup stations and order timeouts.",
    icon: ShoppingBag,
  },
  {
    key: "financial",
    label: "Financial",
    description: "Fees, withdrawal limits and payout schedule.",
    icon: Coins,
  },
  {
    key: "postings",
    label: "Posting fees",
    description: "What employers pay to publish vacancies and internships.",
    icon: BriefcaseBusiness,
  },
  {
    key: "loyalty",
    label: "Loyalty",
    description: "Points earning, redemption caps and expiry.",
    icon: Coins,
  },
  {
    key: "notifications",
    label: "Notifications",
    description: "Which platform events alert the admin team.",
    icon: BellRing,
  },
  {
    key: "security",
    label: "Security",
    description: "Sessions, two-factor and password policy.",
    icon: ShieldCheck,
  },
];

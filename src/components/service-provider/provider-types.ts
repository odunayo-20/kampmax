import { Building2, User, Users } from "lucide-react";
import type { ServiceProviderType } from "@/types/service-provider";

/**
 * The ways a provider can operate. One list for the first onboarding step and for
 * the start page, so the two never describe a type differently.
 */
export const PROVIDER_TYPES: {
  value: ServiceProviderType;
  label: string;
  description: string;
  icon: typeof User;
}[] = [
  {
    value: "individual",
    label: "Individual",
    description: "One person provides the service. Perfect for freelancers and solo professionals.",
    icon: User,
  },
  {
    value: "business",
    label: "Business",
    description: "A registered/local business provides the service. May require CAC registration.",
    icon: Building2,
  },
  {
    value: "team_agency",
    label: "Team / Agency",
    description: "Multiple people provide services under one provider profile. Good for agencies.",
    icon: Users,
  },
];

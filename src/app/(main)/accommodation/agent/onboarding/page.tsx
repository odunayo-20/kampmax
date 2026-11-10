import type { Metadata } from "next";
import { AccommodationAgentOnboarding } from "@/components/accommodation/AccommodationAgentOnboarding";

export const metadata: Metadata = {
  title: "Accommodation Agent Onboarding | Kampmax",
};

export default function AccommodationAgentOnboardingPage() {
  return <AccommodationAgentOnboarding />;
}

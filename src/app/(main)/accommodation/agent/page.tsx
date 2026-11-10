import type { Metadata } from "next";
import { AccommodationAgentDashboard } from "@/components/accommodation/AccommodationAgentDashboard";

export const metadata: Metadata = {
  title: "Accommodation Agent Workspace | Kampmax",
};

export default function AccommodationAgentPage() {
  return <AccommodationAgentDashboard />;
}

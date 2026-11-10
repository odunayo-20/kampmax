import { AccommodationAgentPortalShell } from "@/components/accommodation/AccommodationAgentPortalShell";

export default function AccommodationAgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccommodationAgentPortalShell>{children}</AccommodationAgentPortalShell>;
}

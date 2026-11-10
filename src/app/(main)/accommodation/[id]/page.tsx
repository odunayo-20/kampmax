import type { Metadata } from "next";
import { AccommodationListingDetail } from "@/components/accommodation/AccommodationListingDetail";

export const metadata: Metadata = {
  title: "Accommodation Listing | Kampmax",
};

export default async function AccommodationListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AccommodationListingDetail id={id} />;
}

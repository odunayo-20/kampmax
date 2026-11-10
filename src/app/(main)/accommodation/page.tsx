import type { Metadata } from "next";
import { AccommodationBrowser } from "@/components/accommodation/AccommodationBrowser";

export const metadata: Metadata = {
  title: "Student Accommodation | Kampmax",
  description: "Find available student rooms and apartments listed by approved agents.",
};

export default function AccommodationPage() {
  return <AccommodationBrowser />;
}

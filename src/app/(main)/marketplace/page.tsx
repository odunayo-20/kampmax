import type { Metadata } from "next";
import { MarketplaceBrowser } from "@/components/marketplace/MarketplaceBrowser";

export const metadata: Metadata = {
  title: "Marketplace | Kampmax",
  description:
    "Buy and sell on campus: textbooks, gadgets, fashion and more from students and campus stores near you.",
};

export default function MarketplacePage() {
  return <MarketplaceBrowser />;
}

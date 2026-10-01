import { Suspense } from "react";
import { NearbyExplorer } from "@/components/nearby/NearbyExplorer";

export const metadata = { title: "Nearby | Kampmax" };

export default function NearbyPage() {
  return (
    <Suspense fallback={null}>
      <NearbyExplorer />
    </Suspense>
  );
}

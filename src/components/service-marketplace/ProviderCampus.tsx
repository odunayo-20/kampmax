"use client";

import { MapPin } from "lucide-react";
import { useCampusLabel } from "@/hooks/use-campus-options";

/**
 * The campus a provider mainly serves, as its short name (e.g. RUGIPO). Shows
 * nothing until the name is known, or when the provider hasn't chosen a campus.
 */
export function ProviderCampus({ campusId }: { campusId?: string | null }) {
  const label = useCampusLabel(campusId);
  if (!label) return null;

  return (
    <span className="inline-flex items-center gap-1">
      <MapPin className="w-3 h-3 text-neutral-400" aria-hidden />
      {label}
    </span>
  );
}

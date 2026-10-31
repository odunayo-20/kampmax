"use client";

import { useCampusOptions } from "@/hooks/use-campus-options";

/** Campus names for a list of campus ids; `fallback` when none are set (or none match). */
export function CampusNames({ ids, fallback }: { ids: readonly (string | undefined)[]; fallback: string }) {
  const { campuses } = useCampusOptions();
  const names = ids
    .filter((id): id is string => Boolean(id))
    .map((id) => campuses.find((c) => c.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  return <>{names.length > 0 ? names.join(", ") : fallback}</>;
}

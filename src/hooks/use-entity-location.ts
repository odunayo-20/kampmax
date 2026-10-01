"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { locationKeys, nearbyKeys } from "@/lib/query-keys";
import {
  deleteEntityLocation,
  fetchEntityLocation,
  saveEntityLocation,
  updateEntityVisibility,
  type EntityType,
  type LocationVisibility,
} from "@/services/entity-location-api";
import type { PickedLocation } from "@/lib/maps/types";

export function useEntityLocation(type: EntityType, id: string | undefined) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: locationKeys.entity(user?.id ?? "", type, id ?? ""),
    enabled: status === "authenticated" && !!user?.id && !!id,
    staleTime: 60_000,
    queryFn: () => fetchEntityLocation(type, id as string),
  });
}

function useInvalidating<V, R>(fn: (v: V) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
      queryClient.invalidateQueries({ queryKey: nearbyKeys.all });
    },
  });
}

export const useSaveEntityLocation = (type: EntityType, id: string) =>
  useInvalidating((v: { location: PickedLocation; visibility: LocationVisibility; campusId?: string | null }) =>
    saveEntityLocation(type, id, v.location, v.visibility, v.campusId),
  );

export const useUpdateEntityVisibility = (type: EntityType, id: string) =>
  useInvalidating((visibility: LocationVisibility) => updateEntityVisibility(type, id, visibility));

export const useDeleteEntityLocation = (type: EntityType, id: string) =>
  useInvalidating(() => deleteEntityLocation(type, id));

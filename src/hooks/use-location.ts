"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { locationKeys, nearbyKeys } from "@/lib/query-keys";
import { deleteMyLocation, fetchMyLocation, saveMyLocation } from "@/services/location-api";

export function useMyLocation() {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: locationKeys.profile(user?.id ?? ""),
    enabled: status === "authenticated" && !!user?.id,
    staleTime: 60_000,
    queryFn: fetchMyLocation,
  });
}

export function useSaveMyLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveMyLocation,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
      queryClient.invalidateQueries({ queryKey: nearbyKeys.all });
    },
  });
}

export function useDeleteMyLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMyLocation,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
      queryClient.invalidateQueries({ queryKey: nearbyKeys.all });
    },
  });
}

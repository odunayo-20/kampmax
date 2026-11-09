"use client";

// ============================================================
// ADMIN CAMPUS PLACES HOOKS
// ============================================================
//
// Every change refreshes the whole campus-places tree so the tab counts stay
// right (approving moves a place from Pending to Live).
// ============================================================

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import { campusPlacesService } from "@/services/admin";
import type { CampusPlacePatch, CampusPlacesQuery } from "@/services/admin/campus-places.service";
import type { CampusPlaceInput } from "@/types/campus-places";

export function useAdminCampusPlaces(query: CampusPlacesQuery) {
  return useQuery({
    queryKey: adminKeys.campusPlaces.list(query),
    queryFn: () => campusPlacesService.list(query),
    placeholderData: keepPreviousData,
  });
}

function useRefreshPlaces() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminKeys.campusPlaces.all });
}

export function useCreateCampusPlace() {
  const refresh = useRefreshPlaces();
  return useMutation({
    mutationFn: (input: CampusPlaceInput) => campusPlacesService.create(input),
    onSuccess: () => void refresh(),
  });
}

export function useUpdateCampusPlace() {
  const refresh = useRefreshPlaces();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CampusPlacePatch }) =>
      campusPlacesService.update(id, patch),
    onSuccess: () => void refresh(),
  });
}

export function useApproveCampusPlace() {
  const refresh = useRefreshPlaces();
  return useMutation({
    mutationFn: (id: string) => campusPlacesService.approve(id),
    onSuccess: () => void refresh(),
  });
}

export function useRejectCampusPlace() {
  const refresh = useRefreshPlaces();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      campusPlacesService.reject(id, reason),
    onSuccess: () => void refresh(),
  });
}

export function useDeleteCampusPlace() {
  const refresh = useRefreshPlaces();
  return useMutation({
    mutationFn: (id: string) => campusPlacesService.remove(id),
    onSuccess: () => void refresh(),
  });
}

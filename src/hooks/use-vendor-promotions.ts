"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { vendorPromotionKeys } from "@/lib/query-keys";
import {
  activateVendorPromotionApi,
  cancelVendorPromotionApi,
  createVendorPromotionApi,
  duplicateVendorPromotionApi,
  fetchVendorPromotion,
  fetchVendorPromotionCounts,
  fetchVendorPromotionFormContext,
  fetchVendorPromotionRedemptions,
  fetchVendorPromotions,
  pauseVendorPromotionApi,
  resumeVendorPromotionApi,
  updateVendorPromotionApi,
} from "@/services/vendor-promotions-api";
import type { VendorPromotionInput, VendorPromotionQuery } from "@/types/vendor-promotions";

const STALE_MS = 15_000;

function useAuthenticated() {
  return useAuth().status === "authenticated";
}

export function useVendorPromotions(query: VendorPromotionQuery) {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorPromotionKeys.list(query),
    queryFn: () => fetchVendorPromotions(query),
    enabled,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useVendorPromotionCounts() {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorPromotionKeys.counts(),
    queryFn: fetchVendorPromotionCounts,
    enabled,
    staleTime: STALE_MS,
  });
}

export function useVendorPromotion(id: string) {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorPromotionKeys.detail(id),
    queryFn: () => fetchVendorPromotion(id),
    enabled,
    staleTime: STALE_MS,
  });
}

export function useVendorPromotionRedemptions(id: string) {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorPromotionKeys.redemptions(id),
    queryFn: () => fetchVendorPromotionRedemptions(id),
    enabled,
    staleTime: STALE_MS,
  });
}

export function useVendorPromotionFormContext() {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorPromotionKeys.formContext(),
    queryFn: fetchVendorPromotionFormContext,
    enabled,
    staleTime: 60_000,
  });
}

/** Each command returns the app's `VendorPromotionResult`; success refreshes all promotion queries. */
function useInvalidatingMutation<TVars>(
  fn: (vars: TVars) => ReturnType<typeof createVendorPromotionApi>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      if (result.ok) queryClient.invalidateQueries({ queryKey: vendorPromotionKeys.all });
    },
  });
}

export const useCreatePromotion = () =>
  useInvalidatingMutation((input: VendorPromotionInput) => createVendorPromotionApi(input));

export const useUpdatePromotion = (id: string) =>
  useInvalidatingMutation((input: VendorPromotionInput) => updateVendorPromotionApi(id, input));

export const useActivatePromotion = () =>
  useInvalidatingMutation((id: string) => activateVendorPromotionApi(id));

export const usePausePromotion = () =>
  useInvalidatingMutation((id: string) => pauseVendorPromotionApi(id));

export const useResumePromotion = () =>
  useInvalidatingMutation((id: string) => resumeVendorPromotionApi(id));

export const useCancelPromotion = () =>
  useInvalidatingMutation((id: string) => cancelVendorPromotionApi(id));

export const useDuplicatePromotion = () =>
  useInvalidatingMutation((id: string) => duplicateVendorPromotionApi(id));

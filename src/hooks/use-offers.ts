"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { messageKeys, offerKeys } from "@/lib/query-keys";
import {
  acceptOfferApi,
  createOfferApi,
  declineOfferApi,
  fetchOffer,
  withdrawOfferApi,
  type CreateOfferInput,
} from "@/services/offers-api";

/** One offer, read with the viewer's own session (a non-party gets an error). */
export function useOffer(offerId: string) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: offerKeys.detail(offerId, user?.id ?? ""),
    enabled: status === "authenticated" && !!user,
    queryFn: () => fetchOffer(offerId),
    retry: false,
  });
}

/** Refreshes the offer cards and the thread; accepting also changes the contracts lists. */
function useRefreshAfterOfferChange() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: offerKeys.all });
    void queryClient.invalidateQueries({ queryKey: messageKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["employer-dashboard"] });
  };
}

export function useCreateOffer() {
  const refresh = useRefreshAfterOfferChange();
  return useMutation({
    mutationFn: (input: CreateOfferInput) => createOfferApi(input),
    onSuccess: refresh,
  });
}

/** Accept, decline or withdraw one offer. */
export function useOfferAction(action: "accept" | "decline" | "withdraw") {
  const refresh = useRefreshAfterOfferChange();
  const call = { accept: acceptOfferApi, decline: declineOfferApi, withdraw: withdrawOfferApi }[action];
  return useMutation({
    mutationFn: (offerId: string) => call(offerId),
    onSuccess: refresh,
  });
}

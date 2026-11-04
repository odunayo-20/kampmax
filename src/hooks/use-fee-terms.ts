"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { feeKeys } from "@/lib/query-keys";
import { NO_FEE, type FeeTerms } from "@/lib/service-fee";
import { fetchFeeTerms } from "@/services/engagement-fees-api";

/**
 * What a new contract would charge the freelancer. Used only to tell people
 * what to expect before they agree, so it falls back to "no fee" while loading
 * or if it cannot be read: the form never claims a fee it does not know about,
 * and the server takes the real one regardless.
 */
export function useFeeTerms(): FeeTerms {
  const { status } = useAuth();
  const { data } = useQuery({
    queryKey: feeKeys.terms,
    enabled: status === "authenticated",
    queryFn: fetchFeeTerms,
    staleTime: 5 * 60_000,
    retry: false,
  });
  return data ?? NO_FEE;
}

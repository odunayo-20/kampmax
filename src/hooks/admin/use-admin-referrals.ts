"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchReferralSummary, fetchReferrals, type ReferralQuery } from "@/services/admin/referrals.api";

export function useReferralSummary() {
  return useQuery({ queryKey: ["admin", "referrals", "summary"], queryFn: fetchReferralSummary });
}

export function useAdminReferrals(query: ReferralQuery) {
  return useQuery({
    queryKey: ["admin", "referrals", "list", query],
    queryFn: () => fetchReferrals(query),
    placeholderData: keepPreviousData,
  });
}

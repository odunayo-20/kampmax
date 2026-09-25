"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { vendorFinancialKeys } from "@/lib/query-keys";
import {
  fetchFinancialOverview,
  fetchFinancialTransaction,
  fetchFinancialTransactions,
  fetchPayouts,
  fetchStatement,
  requestPayoutApi,
} from "@/services/vendor-financials-api";
import type {
  PayoutRequestInput,
  VendorFinancialQuery,
  VendorPayoutStatus,
} from "@/types/vendor-financials";

const STALE_MS = 15_000;

function useAuthenticated() {
  return useAuth().status === "authenticated";
}

export function useFinancialOverview() {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorFinancialKeys.overview(),
    queryFn: fetchFinancialOverview,
    enabled,
    staleTime: STALE_MS,
  });
}

export function useFinancialTransactions(query: VendorFinancialQuery) {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorFinancialKeys.transactions(query),
    queryFn: () => fetchFinancialTransactions(query),
    enabled,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useFinancialTransaction(id: string) {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorFinancialKeys.transaction(id),
    queryFn: () => fetchFinancialTransaction(id),
    enabled,
    staleTime: STALE_MS,
  });
}

export function usePayouts(query: {
  page: number;
  pageSize: number;
  status: VendorPayoutStatus | "all";
}) {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorFinancialKeys.payouts(query),
    queryFn: () => fetchPayouts(query),
    enabled,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useStatement(month: string) {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorFinancialKeys.statement(month),
    queryFn: () => fetchStatement(month),
    enabled,
    staleTime: 60_000,
  });
}

/** A successful payout changes balance, ledger and payout history. */
export function useRequestPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PayoutRequestInput) => requestPayoutApi(input),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: vendorFinancialKeys.all });
      }
    },
  });
}

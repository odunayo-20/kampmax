"use client";

import { useQuery } from "@tanstack/react-query";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { feeKeys } from "@/lib/query-keys";
import { fetchContractFeeReport } from "@/services/engagement-fees-api";

/** Service fees collected on freelance contracts, read from the ledger. */
export function useAdminContractFees() {
  const { admin } = useAdminSession();
  return useQuery({
    queryKey: feeKeys.report,
    enabled: !!admin,
    queryFn: fetchContractFeeReport,
  });
}

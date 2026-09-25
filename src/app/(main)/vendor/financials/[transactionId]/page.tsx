"use client";

import { useParams } from "next/navigation";
import { TransactionDetail } from "@/components/vendor-financials/TransactionDetail";
import { FinancialsSkeleton } from "@/components/vendor-financials/FinancialsSkeleton";
import { useFinancialTransaction } from "@/hooks/use-vendor-financials";

export default function TransactionDetailPage() {
  const params = useParams();
  const txQuery = useFinancialTransaction(params.transactionId as string);

  if (txQuery.isPending) return <FinancialsSkeleton />;
  if (txQuery.isError || !txQuery.data) {
    return <div className="text-center py-12 text-kampmax-text-secondary">Transaction not found</div>;
  }
  return <TransactionDetail transaction={txQuery.data} />;
}

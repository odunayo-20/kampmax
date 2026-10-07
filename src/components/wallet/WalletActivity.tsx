"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TransactionItem } from "@/components/wallet/TransactionItem";
import { TransactionDetail } from "@/components/wallet/TransactionDetail";
import { Button } from "@/components/ui";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { fetchMyWalletTransactions } from "@/services/wallet";
import type { WalletTransaction } from "@/types";

/** The user's real wallet transactions, newest first. `limit` shows only the latest few. */
export function WalletActivity({ limit = 100, title }: { limit?: number; title?: string }) {
  const [selected, setSelected] = useState<WalletTransaction | null>(null);
  const query = useQuery({
    queryKey: ["wallet-activity", limit],
    queryFn: () => fetchMyWalletTransactions({ limit }),
    retry: false,
  });

  return (
    <section className="rounded-xl border border-kampmax-border bg-white">
      {title && <h2 className="border-b border-kampmax-border px-4 py-3 text-sm font-bold text-kampmax-text">{title}</h2>}
      {query.isPending ? (
        <p className="p-6 text-center text-sm text-kampmax-text-secondary">Loading…</p>
      ) : query.isError ? (
        <div role="alert" className="p-6 text-center">
          <p className="text-sm text-kampmax-text-secondary">{getFriendlyErrorMessage(query.error)}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void query.refetch()}>Try again</Button>
        </div>
      ) : query.data.length === 0 ? (
        <p className="p-6 text-center text-sm text-kampmax-text-secondary">No transactions yet.</p>
      ) : (
        <div className="divide-y divide-kampmax-border">
          {query.data.map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} onClick={() => setSelected(tx)} />
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-white" onClick={(e) => e.stopPropagation()}>
            <TransactionDetail transaction={selected} onClose={() => setSelected(null)} />
          </div>
        </div>
      )}
    </section>
  );
}

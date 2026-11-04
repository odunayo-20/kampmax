"use client";

import { useAdminContractFees } from "@/hooks/admin/use-admin-contract-fees";
import { adminErrorMessage } from "@/lib/admin/error-reporting";
import { formatFeeRate } from "@/lib/service-fee";
import { formatNaira } from "@/lib/utils";

/**
 * What the platform has earned from freelance contracts. Read from the ledger's
 * COMMISSION entries, so it is exactly the money that moved; the rate shown is
 * what NEW contracts charge (each existing contract keeps the rate it was made
 * with). Changing it is in Settings, Financial.
 */
export function ContractFeesCard() {
  const { data, isLoading, error, refetch } = useAdminContractFees();

  return (
    <section
      aria-label="Freelance contract fees"
      className="mt-4 rounded-lg border border-kampmax-border bg-white p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-kampmax-text">Freelance contract fees</h2>
          <p className="mt-0.5 text-xs text-kampmax-text-secondary">
            Taken from the freelancer&apos;s payout on each paid milestone or week. Refunds carry no fee.
          </p>
        </div>
        {data && (
          <p className="rounded-full bg-kampmax-bg px-2.5 py-1 text-xs text-kampmax-text-secondary">
            {data.current.rate > 0
              ? `New contracts: ${formatFeeRate(data.current.rate)}, at least ${formatNaira(data.current.minimum)}`
              : "No fee on new contracts"}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="mt-3 h-20 animate-pulse rounded-lg bg-kampmax-surface-hover" />
      ) : error || !data ? (
        <div className="mt-3 text-xs text-kampmax-error" role="alert">
          {adminErrorMessage(error)}{" "}
          <button type="button" onClick={() => void refetch()} className="font-medium underline">
            Retry
          </button>
        </div>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
            <Stat label="Collected" value={formatNaira(data.totalCollected)} />
            <Stat label="This month" value={formatNaira(data.thisMonth)} />
            <Stat label="Payments with a fee" value={data.payments.toLocaleString("en-NG")} />
          </dl>
          {data.recent.length === 0 ? (
            <p className="mt-3 text-xs text-kampmax-text-secondary">No fee has been collected yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-kampmax-text-secondary">
                  <tr>
                    <th className="py-1.5 pr-3 font-medium">When</th>
                    <th className="py-1.5 pr-3 font-medium">Project</th>
                    <th className="py-1.5 pr-3 text-right font-medium">Paid</th>
                    <th className="py-1.5 text-right font-medium">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kampmax-border">
                  {data.recent.map((row) => (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap py-1.5 pr-3">
                        {new Date(row.collectedAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                      </td>
                      <td className="max-w-[16rem] truncate py-1.5 pr-3">
                        {row.jobTitle ?? "Project"} · payment {row.milestonePosition}
                      </td>
                      <td className="py-1.5 pr-3 text-right">{formatNaira(row.paid)}</td>
                      <td className="py-1.5 text-right font-semibold">{formatNaira(row.fee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-kampmax-bg px-2 py-2">
      <dt className="text-[11px] text-kampmax-text-secondary">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-kampmax-text">{value}</dd>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Snowflake, Sun, Users } from "lucide-react";
import { cn, formatNaira, timeAgo } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { Pagination } from "@/components/admin/Pagination";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AdjustWalletDialog } from "./AdjustWalletDialog";
import { walletAccountsService } from "@/services/admin";
import type { AdminWalletAccount, Paginated } from "@/types/admin";

const OWNER_TYPE_LABELS: Record<AdminWalletAccount["ownerType"], string> = {
  vendor: "Vendor",
  customer: "Customer",
};

/** Vendor and customer wallet accounts, with freeze/unfreeze and manual adjustment actions. */
export function WalletAccountsSection() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [ownerType, setOwnerType] = useState<AdminWalletAccount["ownerType"] | "all">("all");
  const [status, setStatus] = useState<AdminWalletAccount["status"] | "all">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [list, setList] = useState<Paginated<AdminWalletAccount> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [statusTarget, setStatusTarget] = useState<AdminWalletAccount | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<AdminWalletAccount | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await walletAccountsService.listAccounts({
        search: debouncedSearch.trim() || undefined,
        ownerType,
        status,
        sortBy: "balance",
        sortDir: "desc",
        page,
        pageSize,
      });
      setList(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, ownerType, status, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSetStatus(reason: string) {
    if (!statusTarget) return;
    const nextStatus = statusTarget.status === "active" ? "frozen" : "active";
    setActionLoading(true);
    setActionError(null);
    try {
      await walletAccountsService.setStatus(statusTarget.id, {
        status: nextStatus,
        reason: reason.trim() || undefined,
      });
      setStatusTarget(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't update the wallet's status.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAdjust(input: { direction: "credit" | "debit"; amount: number; reason: string }) {
    if (!adjustTarget) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await walletAccountsService.adjust(adjustTarget.id, input);
      setAdjustTarget(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't adjust the wallet.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section className="mt-6">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-kampmax-text">
        <Users className="h-4 w-4 opacity-60" />
        Wallet accounts
      </h2>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-60">
          <Input
            value={search}
            placeholder="Search owner name or email…"
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Search wallet accounts"
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          aria-label="Filter by owner type"
          value={ownerType}
          onChange={(e) => {
            setOwnerType(e.target.value as typeof ownerType);
            setPage(1);
          }}
          className="w-auto"
        >
          <option value="all">All owners</option>
          <option value="vendor">Vendors</option>
          <option value="customer">Customers</option>
        </Select>
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status);
            setPage(1);
          }}
          className="w-auto"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="frozen">Frozen</option>
        </Select>
      </div>

      {actionError && (
        <div className="mb-3 rounded-md border border-kampmax-error/30 bg-kampmax-error/5 px-3 py-2 text-sm text-kampmax-error">
          {actionError}
        </div>
      )}

      {loading && !list ? (
        <LoadingSkeleton variant="table" rows={6} />
      ) : error ? (
        <div className="rounded-lg border border-kampmax-border bg-white p-4">
          <ErrorState onRetry={() => void load()} />
        </div>
      ) : !list || list.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No wallet accounts match"
          message="No vendor or customer wallet matches the current search or filters."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-kampmax-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-kampmax-border bg-kampmax-muted/40 text-[11px] uppercase tracking-wide text-kampmax-text-secondary">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Owner</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Type</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Balance</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">Updated</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kampmax-border/70">
                {list.items.map((acct) => {
                  const frozen = acct.status === "frozen";
                  return (
                    <tr key={acct.id} className="transition-colors hover:bg-kampmax-muted/40">
                      <td className="max-w-[220px] px-4 py-2.5">
                        <span className="block truncate text-[13px] font-medium text-kampmax-text">
                          {acct.ownerName}
                        </span>
                        <span className="block truncate text-[11px] text-kampmax-text-secondary">
                          {acct.ownerEmail ?? "No matching user account"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[13px] text-kampmax-text-secondary">
                        {OWNER_TYPE_LABELS[acct.ownerType]}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums text-kampmax-text">
                        {formatNaira(acct.balance)}
                        {acct.heldBalance > 0 && (
                          <span className="block text-[10px] font-normal text-kampmax-text-secondary">
                            {formatNaira(acct.heldBalance)} held
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge
                          variant={frozen ? "warning" : "success"}
                          label={frozen ? "Frozen" : "Active"}
                        />
                      </td>
                      <td
                        className="hidden whitespace-nowrap px-4 py-2.5 tabular-nums text-kampmax-text-secondary md:table-cell"
                        title={acct.updatedAt}
                      >
                        {timeAgo(acct.updatedAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAdjustTarget(acct)}
                            className="rounded-md border border-kampmax-border px-2.5 py-1 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
                          >
                            Adjust
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusTarget(acct)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                              frozen
                                ? "border-kampmax-border text-kampmax-text hover:bg-kampmax-muted/60"
                                : "border-amber-200 text-amber-700 hover:bg-amber-50"
                            )}
                          >
                            {frozen ? <Sun className="h-3 w-3" /> : <Snowflake className="h-3 w-3" />}
                            {frozen ? "Unfreeze" : "Freeze"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {list && list.totalPages > 1 && (
        <div className="mt-3 flex justify-center">
          <Pagination
            page={list.page}
            pageSize={list.pageSize}
            total={list.total}
            totalPages={list.totalPages}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPage(1);
              setPageSize(n);
            }}
          />
        </div>
      )}

      <ConfirmDialog
        open={statusTarget != null}
        title={
          statusTarget
            ? statusTarget.status === "active"
              ? `Freeze ${statusTarget.ownerName}'s wallet?`
              : `Unfreeze ${statusTarget.ownerName}'s wallet?`
            : ""
        }
        message={
          statusTarget?.status === "active"
            ? "Freezing blocks every wallet operation immediately - credits, debits, withdrawals and adjustments - until it's reactivated."
            : "Unfreezing lets this wallet send and receive funds again."
        }
        confirmLabel={statusTarget?.status === "active" ? "Freeze wallet" : "Unfreeze wallet"}
        tone={statusTarget?.status === "active" ? "danger" : "default"}
        loading={actionLoading}
        reasonLabel={statusTarget?.status === "active" ? "Reason (required)" : undefined}
        onConfirm={handleSetStatus}
        onCancel={() => setStatusTarget(null)}
      />

      {adjustTarget && (
        <AdjustWalletDialog
          open
          ownerName={adjustTarget.ownerName}
          balance={adjustTarget.balance}
          loading={actionLoading}
          onConfirm={handleAdjust}
          onCancel={() => setAdjustTarget(null)}
        />
      )}
    </section>
  );
}

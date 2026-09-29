"use client";

import { useCallback, useRef, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Banknote, History, Info, Send, ShieldAlert, User } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminErrorMessage } from "@/lib/admin/error-reporting";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { CustomerWithdrawalStatusBadge } from "@/components/admin/withdrawals/WithdrawalBadges";
import { formatWithdrawalDate } from "@/components/admin/withdrawals/withdrawals-meta";
import {
  useAdminWithdrawal,
  useResolveWithdrawalMutation,
} from "@/hooks/admin/use-admin-withdrawals";
import { formatNaira } from "@/lib/utils";
import type {
  CustomerWithdrawalResolutionOutcome,
  ManagedCustomerWithdrawalDetail,
} from "@/types/admin";

type TabKey = "overview" | "timeline";

const TABS: { key: TabKey; label: string; icon: typeof Info }[] = [
  { key: "overview", label: "Overview", icon: Info },
  { key: "timeline", label: "Timeline", icon: History },
];

export default function WithdrawalDetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <WithdrawalDetailPageInner />
    </Suspense>
  );
}

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

function WithdrawalDetailPageInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data: detail, isLoading, error } = useAdminWithdrawal(id);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [confirmOutcome, setConfirmOutcome] = useState<CustomerWithdrawalResolutionOutcome | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);
  const resolveMut = useResolveWithdrawalMutation();

  const pushToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const tid = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id: tid, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== tid)), 3800);
  }, []);

  async function resolveWithdrawal(outcome: CustomerWithdrawalResolutionOutcome, reason: string) {
    try {
      await resolveMut.mutateAsync({ id, input: { outcome, reason: reason.trim() || undefined } });
      setConfirmOutcome(null);
      pushToast("success", `Withdrawal marked ${outcome}.`);
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Couldn't record the outcome.");
    }
  }

  if (isLoading) return <DetailSkeleton />;

  if (error || !detail) {
    return (
      <>
        <AdminPageHeader
          title="Withdrawal"
          description="Withdrawal not found on the real wallet ledger."
          actions={
            <button
              onClick={() => router.push("/admin/withdrawals")}
              className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border px-3 py-1.5 text-xs font-medium text-kampmax-text-muted hover:text-kampmax-text"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to list
            </button>
          }
        />
        <div className="mt-6 rounded-lg border border-kampmax-border bg-kampmax-surface p-12 text-center text-sm text-kampmax-text-muted">
          {error ? adminErrorMessage(error) : "This withdrawal could not be found."}
        </div>
      </>
    );
  }

  const { withdrawal: row, timeline, gateway, actions } = detail;

  return (
    <>
      <AdminPageHeader
        title={row.id}
        description={`${row.customerName} · customer withdrawal`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CustomerWithdrawalStatusBadge status={row.status} />
            <button
              onClick={() => router.push("/admin/withdrawals")}
              className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-kampmax-border px-3 py-1.5 text-xs font-medium text-kampmax-text-muted hover:text-kampmax-text"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          </div>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-kampmax-border bg-kampmax-surface-hover/50 px-4 py-2.5 text-xs text-kampmax-text-secondary">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kampmax-text-muted" />
        <span>
          <strong className="font-medium">Source status:</strong> {row.statusNote}.
        </span>
      </div>

      <div className="mb-4 flex gap-1 border-b border-kampmax-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "border-kampmax-primary text-kampmax-primary"
                : "border-transparent text-kampmax-text-muted hover:text-kampmax-text"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card label="Status" hint={row.sourceStatus}>
              <CustomerWithdrawalStatusBadge status={row.status} />
            </Card>
            <Card label="Recorded in" hint="wallet_transactions">
              <span className="font-mono text-xs text-kampmax-text">{row.sourceRecordId}</span>
            </Card>
            <Card label="Customer id">
              <span className="font-mono text-xs text-kampmax-text">{row.customerId}</span>
            </Card>
          </div>

          <div className="rounded-lg border border-kampmax-border bg-white p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-kampmax-text-muted">Amount</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-kampmax-text">{formatNaira(row.amount)}</span>
            </div>
            <p className="mt-2 text-xs text-kampmax-text-muted">
              Internal reference: <code className="font-mono">{row.id}</code>
            </p>
          </div>

          <div className="rounded-lg border border-kampmax-border bg-white p-5">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-kampmax-text-muted">
              <User className="h-3.5 w-3.5" /> Customer
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-kampmax-text-muted">Name</span>
                <p className="font-medium text-kampmax-text">{row.customerName}</p>
              </div>
              {row.customerEmail && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-xs text-kampmax-text-muted">Email</span>
                  <span className="text-right text-xs text-kampmax-text-secondary">{row.customerEmail}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-kampmax-border bg-white p-5">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-kampmax-text-muted">
              <Banknote className="h-3.5 w-3.5" /> Bank destination
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-kampmax-text-muted">Bank</span>
                <span className="text-xs font-medium text-kampmax-text">{row.bankName ?? "—"}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-kampmax-text-muted">Account number</span>
                <span className="font-mono text-xs text-kampmax-text">
                  {row.maskedAccountNumber ?? "not recorded"}
                </span>
              </div>
              <p className="pt-1 text-xs text-kampmax-text-muted">
                Account numbers are displayed exactly as masked by the owning record. No provider or
                bank reference is recorded by the prototype backend for this withdrawal.
              </p>
            </div>
          </div>

          <GatewayCard gateway={gateway} />

          {(row.failedReason || row.reversalReason) && (
            <div className="rounded-lg border border-kampmax-error/20 bg-kampmax-error/5 p-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-kampmax-error">Outcome</h3>
              {row.failedReason && (
                <p className="text-sm text-kampmax-text-secondary">
                  Failure reason: <strong className="font-medium">{row.failedReason}</strong>
                </p>
              )}
              {row.reversalReason && (
                <p className="text-sm text-kampmax-text-secondary">
                  Reversal reason: <strong className="font-medium">{row.reversalReason}</strong>
                </p>
              )}
            </div>
          )}

          <div className="rounded-lg border border-kampmax-border bg-kampmax-surface-hover/50 p-5">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-kampmax-text-muted">
              <ShieldAlert className="h-3.5 w-3.5" /> Actions
            </h3>
            <p className="text-sm text-kampmax-text-secondary">{actions.note}</p>
            {actions.resolvable && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setConfirmOutcome("successful")}
                  className="inline-flex h-8 items-center rounded-md bg-kampmax-success px-3 text-xs font-medium text-white transition-colors hover:bg-kampmax-success/90"
                >
                  Mark successful
                </button>
                <button
                  onClick={() => setConfirmOutcome("failed")}
                  className="inline-flex h-8 items-center rounded-md border border-kampmax-error/40 bg-white px-3 text-xs font-medium text-kampmax-error transition-colors hover:bg-kampmax-error/5"
                >
                  Mark failed
                </button>
                <button
                  onClick={() => setConfirmOutcome("reversed")}
                  className="inline-flex h-8 items-center rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
                >
                  Mark reversed
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="rounded-lg border border-kampmax-border bg-white p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-kampmax-text-muted">
            <History className="mr-1.5 inline h-3.5 w-3.5" />
            Withdrawal timeline
          </h3>
          {timeline.length ? (
            <ul className="space-y-3">
              {timeline.map((event) => (
                <li key={event.id} className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-kampmax-primary" />
                  <div>
                    <p className="text-sm font-medium text-kampmax-text">{event.title}</p>
                    <p className="text-xs text-kampmax-text-muted">
                      {event.meta} · {formatWithdrawalDate(event.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-kampmax-text-muted">No timeline is recorded for this withdrawal.</p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOutcome !== null}
        title={
          confirmOutcome === "successful"
            ? "Mark this withdrawal successful?"
            : confirmOutcome === "failed"
              ? "Mark this withdrawal failed?"
              : "Mark this withdrawal reversed?"
        }
        message={
          confirmOutcome === "successful"
            ? "Confirm only once you've verified the transfer landed in the customer's bank account. This cannot be undone."
            : "The debited amount is returned to the customer's wallet immediately. This cannot be undone."
        }
        confirmLabel={
          confirmOutcome === "successful"
            ? "Mark successful"
            : confirmOutcome === "failed"
              ? "Mark failed"
              : "Mark reversed"
        }
        tone={confirmOutcome === "successful" ? "default" : "warning"}
        loading={resolveMut.isPending}
        reasonLabel={confirmOutcome && confirmOutcome !== "successful" ? "Reason (recorded in the audit log)" : undefined}
        onConfirm={(reason) => {
          if (confirmOutcome) void resolveWithdrawal(confirmOutcome, reason);
        }}
        onCancel={() => setConfirmOutcome(null)}
      />

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-80 flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`rounded-md px-3.5 py-2 text-sm font-medium text-white shadow-lg ${
                t.tone === "success" ? "bg-kampmax-success" : "bg-kampmax-error"
              }`}
            >
              {t.text}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function GatewayCard({ gateway }: { gateway: ManagedCustomerWithdrawalDetail["gateway"] }) {
  return (
    <div className="rounded-lg border border-kampmax-border bg-kampmax-surface-hover/50 p-5">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-kampmax-text-muted">
        <Send className="h-3.5 w-3.5" /> Disbursement provider
      </h3>
      <p className="text-sm text-kampmax-text-secondary">{gateway.note}</p>
      <div className="mt-3 space-y-2 text-xs text-kampmax-text-muted">
        <p>
          Provider reference: <strong className="font-mono text-kampmax-text-muted">none on record</strong>
        </p>
      </div>
    </div>
  );
}

function Card({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-kampmax-border bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-kampmax-text-muted">{label}</p>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-0.5 text-[10px] text-kampmax-text-muted">{hint}</p>}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <>
      <div className="mb-6 h-10 w-64 animate-pulse rounded bg-kampmax-surface-hover" />
      <div className="mb-4 h-6 w-full animate-pulse rounded bg-kampmax-surface-hover" />
      <LoadingSkeleton rows={6} />
    </>
  );
}

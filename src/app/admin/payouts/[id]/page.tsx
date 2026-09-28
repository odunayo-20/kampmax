"use client";

import { useCallback, useRef, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  History,
  Info,
  Receipt,
  Send,
  ShieldAlert,
  User,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminErrorMessage } from "@/lib/admin/error-reporting";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import {
  PayoutMethodBadge,
  PayoutRecipientBadge,
  PayoutStatusBadge,
} from "@/components/admin/payouts/PayoutBadges";
import { formatPayoutDate } from "@/components/admin/payouts/payouts-meta";
import {
  useAdminPayout,
  useResolvePayoutMutation,
} from "@/hooks/admin/use-admin-payouts";
import { formatNaira } from "@/lib/utils";
import type {
  ManagedPayoutActivity,
  ManagedPayoutDetail,
  ManagedPayoutResolutionOutcome,
} from "@/types/admin";

type TabKey = "overview" | "timeline";

const TABS: { key: TabKey; label: string; icon: typeof Info }[] = [
  { key: "overview", label: "Overview", icon: Info },
  { key: "timeline", label: "Timeline", icon: History },
];

export default function PayoutDetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PayoutDetailPageInner />
    </Suspense>
  );
}

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

function PayoutDetailPageInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data: detail, isLoading, error } = useAdminPayout(id);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [confirmOutcome, setConfirmOutcome] =
    useState<ManagedPayoutResolutionOutcome | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);
  const resolveMut = useResolvePayoutMutation();

  const pushToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const tid = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id: tid, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== tid)), 3800);
  }, []);

  async function resolvePayout(outcome: ManagedPayoutResolutionOutcome, reason: string) {
    try {
      await resolveMut.mutateAsync({
        id,
        input: { outcome, reason: reason.trim() || undefined },
      });
      setConfirmOutcome(null);
      pushToast("success", `Payout marked ${outcome}.`);
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Couldn't record the outcome.");
    }
  }

  if (isLoading) return <DetailSkeleton />;

  if (error || !detail) {
    return (
      <>
        <AdminPageHeader
          title="Payout"
          description="Payout not found on the real payout ledger."
          actions={
            <button
              onClick={() => router.push("/admin/payouts")}
              className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border px-3 py-1.5 text-xs font-medium text-kampmax-text-muted hover:text-kampmax-text"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to list
            </button>
          }
        />
        <div className="mt-6 rounded-lg border border-kampmax-border bg-kampmax-surface p-12 text-center text-sm text-kampmax-text-muted">
          {error ? adminErrorMessage(error) : "This payout could not be found."}
        </div>
      </>
    );
  }

  const { payout: row, recipient, referencedOrders, timeline, gateway, actions, wallet } = detail;

  return (
    <>
      <AdminPageHeader
        title={row.id}
        description={`${recipient.recipientName} · ${row.recipientType} payout · ${row.method}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PayoutRecipientBadge type={row.recipientType} />
            <PayoutStatusBadge status={row.status} />
            <PayoutMethodBadge method={row.method} />
            <button
              onClick={() => router.push("/admin/payouts")}
              className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-kampmax-border px-3 py-1.5 text-xs font-medium text-kampmax-text-muted hover:text-kampmax-text"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          </div>
        }
      />

      {/* Source-status honesty note */}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-kampmax-border bg-kampmax-surface-hover/50 px-4 py-2.5 text-xs text-kampmax-text-secondary">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kampmax-text-muted" />
        <span>
          <strong className="font-medium">Source status:</strong> {row.statusNote}. Recorded in the{" "}
          <strong className="font-medium">{row.source}</strong> store.
        </span>
      </div>

      {/* Tabs */}
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
          {/* Status grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="Status" hint={row.sourceStatus}>
              <PayoutStatusBadge status={row.status} />
            </Card>
            <Card label="Recipient">
              <PayoutRecipientBadge type={row.recipientType} />
            </Card>
            <Card label="Method">
              <PayoutMethodBadge method={row.method} />
            </Card>
            <Card label="Recorded in" hint={row.source}>
              <span className="font-mono text-xs text-kampmax-text">{row.sourceRecordId}</span>
            </Card>
          </div>

          {/* Amount card */}
          <div className="rounded-lg border border-kampmax-border bg-white p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-kampmax-text-muted">
              Amount
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-kampmax-text">
                {formatNaira(row.amount)}
              </span>
              {row.fee > 0 && (
                <span className="text-xs text-kampmax-text-muted">
                  incl. platform fee {formatNaira(row.fee)}
                </span>
              )}
            </div>
            {row.reference ? (
              <p className="mt-2 text-xs text-kampmax-text-muted">
                Internal reference: <code className="font-mono">{row.reference}</code>
              </p>
            ) : (
              <p className="mt-2 text-xs text-kampmax-text-muted">
                Internal reference: <strong>not recorded</strong> by the owning store.
              </p>
            )}
          </div>

          {/* Recipient */}
          <div className="rounded-lg border border-kampmax-border bg-white p-5">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-kampmax-text-muted">
              <User className="h-3.5 w-3.5" /> Recipient
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-kampmax-text-muted">{row.recipientType}</span>
                <div className="text-right">
                  {recipient.recipientHref ? (
                    <a
                      href={recipient.recipientHref}
                      className="font-medium text-kampmax-primary hover:underline"
                    >
                      {recipient.recipientName}
                    </a>
                  ) : (
                    <p className="font-medium text-kampmax-text">{recipient.recipientName}</p>
                  )}
                  <p className="font-mono text-xs text-kampmax-text-muted">{recipient.recipientId}</p>
                </div>
              </div>
              {recipient.recipientSub && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-xs text-kampmax-text-muted">Context</span>
                  <span className="text-right text-xs text-kampmax-text-secondary">
                    {recipient.recipientSub}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Referenced orders (wallet payouts only) */}
          {referencedOrders.length > 0 && (
            <div className="rounded-lg border border-kampmax-border bg-white p-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-kampmax-text-muted">
                Referenced orders
              </h3>
              <p className="mb-3 text-xs text-kampmax-text-secondary">
                Order ids recorded verbatim by the wallet payout record. Orders that exist in the
                real orders store resolve to their vendor; missing ids are listed at face value.
              </p>
              <ul className="space-y-2">
                {referencedOrders.map((o) => (
                  <li key={o.id} className="flex items-start justify-between gap-4 text-sm">
                    <div>
                      <span className="font-mono text-xs font-semibold text-kampmax-text">{o.id}</span>
                      {o.existsInOrdersStore ? (
                        <span className="ml-2 text-xs text-kampmax-text-muted">
                          {o.vendorName ? `→ ${o.vendorName}` : "→ order present"} · {o.status}
                        </span>
                      ) : (
                        <span className="ml-2 text-xs text-kampmax-warning">
                          not present in the real orders store
                        </span>
                      )}
                    </div>
                    <span className="whitespace-nowrap text-xs font-medium tabular-nums text-kampmax-text">
                      {o.existsInOrdersStore && o.total !== null ? formatNaira(o.total) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Payout method */}
          <div className="rounded-lg border border-kampmax-border bg-white p-5">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-kampmax-text-muted">
              <Banknote className="h-3.5 w-3.5" /> Payout method
            </h3>
            {row.method === "wallet" ? (
              <div className="space-y-2 text-sm">
                <p className="text-xs text-kampmax-text-muted">
                  This payout was credited to the customer wallet — no bank account is involved.
                </p>
                {wallet ? (
                  <div className="mt-2 rounded-md border border-kampmax-border bg-kampmax-surface-hover/40 px-3 py-2 text-xs text-kampmax-text-secondary">
                    Wallet <strong className="font-mono">{wallet.walletId}</strong> · owner{" "}
                    {wallet.ownerName} — balance {formatNaira(wallet.balance)}, pending{" "}
                    {formatNaira(wallet.pendingAmount)} (real wallet store values)
                  </div>
                ) : (
                  <p className="text-xs text-kampmax-text-muted">
                    Wallet account for this payout is not present in the real wallet store.
                  </p>
                )}
              </div>
            ) : (
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
                {row.expectedAt && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs text-kampmax-text-muted">Expected</span>
                    <span className="text-xs font-medium text-kampmax-text">
                      {formatPayoutDate(row.expectedAt)}
                    </span>
                  </div>
                )}
                <p className="pt-1 text-xs text-kampmax-text-muted">
                  Account numbers are displayed exactly as the owning store masks them. No provider or
                  bank reference is recorded by the prototype backend for this payout.
                </p>
              </div>
            )}
          </div>

          {/* Gateway status */}
          <GatewayCard gateway={gateway} />

          {/* Outcome notes (failed/reversed) */}
          {(row.failedReason || row.reversalReason) && (
            <div className="rounded-lg border border-kampmax-error/20 bg-kampmax-error/5 p-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-kampmax-error">
                Outcome
              </h3>
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

          {/* Actions */}
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
            Payout timeline
          </h3>
          <p className="mb-4 text-xs text-kampmax-text-secondary">
            Real events/timestamps from the owning store. Freelancer payouts show the store event log;
            vendor and wallet payouts show the fields the owning record actually carries.
          </p>
          {timeline.length ? (
            <ul className="space-y-3">
              {timeline.map((event) => (
                <EventItem key={event.id} event={event} />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-kampmax-text-muted">
              No timeline is recorded for this payout by the owning store.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOutcome !== null}
        title={
          confirmOutcome === "successful"
            ? "Mark this payout successful?"
            : confirmOutcome === "failed"
              ? "Mark this payout failed?"
              : "Mark this payout reversed?"
        }
        message={
          confirmOutcome === "successful"
            ? "Confirm only once you've verified the transfer landed in the recipient's bank account. This cannot be undone."
            : "The debited amount is returned to the recipient's wallet immediately. This cannot be undone."
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
        reasonLabel={
          confirmOutcome && confirmOutcome !== "successful"
            ? "Reason (recorded in the audit log)"
            : undefined
        }
        onConfirm={(reason) => {
          if (confirmOutcome) void resolvePayout(confirmOutcome, reason);
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

function GatewayCard({
  gateway,
}: {
  gateway: ManagedPayoutDetail["gateway"];
}) {
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
        <p>
          Provider verification events: <strong className="font-mono text-kampmax-text-muted">not tracked</strong>
        </p>
      </div>
    </div>
  );
}

function EventItem({ event }: { event: ManagedPayoutActivity }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-kampmax-primary" />
      <div>
        <p className="text-sm font-medium text-kampmax-text">{event.title}</p>
        <p className="text-xs text-kampmax-text-muted">
          {event.meta} · {formatPayoutDate(event.at)}
        </p>
      </div>
    </li>
  );
}

function Card({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
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
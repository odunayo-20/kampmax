"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Gift, Inbox } from "lucide-react";
import { cn, formatNaira, timeAgo } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { Pagination } from "@/components/admin/Pagination";
import { StatCard } from "@/components/admin/StatCard";
import { useAdminReferrals, useReferralSummary } from "@/hooks/admin/use-admin-referrals";
import { useDebounce } from "@/hooks/use-debounce";
import {
  looksSuspicious,
  reasonText,
  referralStatusText,
  REFERRAL_STATUS_TABS,
  type ReferralStatus,
} from "@/lib/admin/referrals";

const PAGE_SIZE = 15;

export default function AdminReferralsPage() {
  const [status, setStatus] = useState<ReferralStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim(), 350);
  useEffect(() => setPage(1), [debouncedSearch]);

  const summary = useReferralSummary();
  const list = useAdminReferrals({ status, search: debouncedSearch || undefined, page, pageSize: PAGE_SIZE });
  const s = summary.data;
  const filtered = status !== "all" || debouncedSearch.length > 0;

  return (
    <>
      <AdminPageHeader
        title="Invite credit"
        description="Who invited whom, what has been paid, and where abuse would show up. The rules, rewards and budget are edited under Settings."
        actions={
          <Link
            href="/admin/settings"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text hover:bg-kampmax-muted/60"
          >
            <Gift className="h-4 w-4" aria-hidden />
            Edit the rules
          </Link>
        }
      />

      {s && !s.enabled && (
        <p role="status" className="mb-4 rounded-lg border border-dashed border-kampmax-border px-3 py-2.5 text-xs text-kampmax-text-secondary">
          The programme is off. Friends cannot enter codes and nothing is paid. Turn it on under Settings, Invite friends.
        </p>
      )}

      <section aria-label="Summary" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Credit paid this month" value={s ? formatNaira(s.credit.grantedThisMonth) : "…"} hint={s ? `${formatNaira(s.credit.grantedTotal)} all time` : undefined} tone="blue" />
        <StatCard label="Credit spent this month" value={s ? formatNaira(s.credit.spentThisMonth) : "…"} hint="Used at checkout; Kampmax pays this" tone="warning" />
        <StatCard label="Credit still held by users" value={s ? formatNaira(s.credit.outstanding) : "…"} hint="What could still be spent" />
        <StatCard
          label="Invites paid / waiting"
          value={s ? `${s.counts.REWARDED} / ${s.counts.PENDING + s.counts.HOLDING}` : "…"}
          hint={s ? `${s.counts.REJECTED} rejected, ${s.counts.EXPIRED} expired` : undefined}
          tone="success"
        />
      </section>

      {s && (s.rejectedBy.length > 0 || s.campuses.length > 0 || s.topReferrers.length > 0) && (
        <section aria-label="Health" className="mb-6 grid gap-4 lg:grid-cols-3">
          <Panel title="Why invites were rejected">
            {s.rejectedBy.length === 0 ? (
              <p className="text-xs text-kampmax-text-secondary">None yet.</p>
            ) : (
              s.rejectedBy.map((r) => (
                <Row key={r.reason} label={reasonText(r.reason)} value={String(r.count)} />
              ))
            )}
          </Panel>
          <Panel title="This month by campus" hint={`Budget ${formatNaira(s.campusMonthlyBudget)} per campus`}>
            {s.campuses.length === 0 ? (
              <p className="text-xs text-kampmax-text-secondary">No credit paid yet.</p>
            ) : (
              s.campuses.map((c) => {
                const over = s.campusMonthlyBudget > 0 && c.granted >= s.campusMonthlyBudget * 0.9;
                return <Row key={c.campusId ?? "none"} label={c.name} value={formatNaira(c.granted)} warn={over} />;
              })
            )}
          </Panel>
          <Panel title="Top inviters" hint="Flagged when many invites were rejected">
            {s.topReferrers.length === 0 ? (
              <p className="text-xs text-kampmax-text-secondary">No invites yet.</p>
            ) : (
              s.topReferrers.map((t) => (
                <Row
                  key={t.id}
                  label={`${t.name || t.email}`}
                  value={`${t.rewarded} paid · ${t.rejected} rejected`}
                  warn={looksSuspicious(t)}
                />
              ))
            )}
          </Panel>
        </section>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Invite status" className="flex flex-wrap gap-1 border-b border-kampmax-border">
          {REFERRAL_STATUS_TABS.map((t) => {
            const active = status === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStatus(t.value);
                  setPage(1);
                }}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "border-kampmax-blue text-kampmax-blue"
                    : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div>
          <label className="sr-only" htmlFor="referral-search">
            Search invites
          </label>
          <input
            id="referral-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or code…"
            className="h-9 w-full rounded-md border border-kampmax-border bg-white px-2.5 text-sm text-kampmax-text sm:w-64"
          />
        </div>
      </div>

      <section aria-label="Invites" className="rounded-lg border border-kampmax-border bg-white">
        {list.isPending ? (
          <div className="p-4">
            <LoadingSkeleton variant="table" rows={5} />
          </div>
        ) : list.isError ? (
          <ErrorState onRetry={() => void list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={filtered ? "No matching invites" : "No invites yet"}
            message={filtered ? "Try a different search or status." : "Invites show up here once friends start entering codes."}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-kampmax-border text-xs text-kampmax-text-secondary">
                    <th scope="col" className="px-4 py-2 font-medium">Inviter</th>
                    <th scope="col" className="px-4 py-2 font-medium">Friend</th>
                    <th scope="col" className="px-4 py-2 font-medium">Where it stands</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">Credit paid</th>
                    <th scope="col" className="px-4 py-2 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kampmax-border">
                  {list.data.items.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2.5">
                        <span className="block font-medium text-kampmax-text">{r.referrer.name}</span>
                        <span className="block text-[11px] text-kampmax-text-secondary">{r.referrer.email} · {r.code}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="block font-medium text-kampmax-text">{r.friend.name}</span>
                        <span className="block text-[11px] text-kampmax-text-secondary">{r.friend.email}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("block", r.status === "REJECTED" ? "font-medium text-kampmax-error" : "text-kampmax-text")}>
                          {referralStatusText(r)}
                        </span>
                        {r.status === "REJECTED" && (
                          <span className="block text-[11px] text-kampmax-text-secondary">{reasonText(r.reason)}</span>
                        )}
                        {r.status === "HOLDING" && r.payAfter && (
                          <span className="block text-[11px] text-kampmax-text-secondary">Pays after {new Date(r.payAfter).toLocaleDateString()}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-kampmax-text">
                        {r.credit > 0 ? formatNaira(r.credit) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-kampmax-text-secondary">{timeAgo(r.attachedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={list.data.page}
              pageSize={list.data.pageSize}
              total={list.data.total}
              totalPages={list.data.totalPages}
              onPageChange={setPage}
              unitLabel="invites"
            />
          </>
        )}
      </section>
    </>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-kampmax-border bg-white p-4">
      <h2 className="text-sm font-semibold text-kampmax-text">{title}</h2>
      {hint && <p className="mb-2 text-[11px] text-kampmax-text-secondary">{hint}</p>}
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className={cn("min-w-0 break-words", warn ? "font-medium text-kampmax-error" : "text-kampmax-text")}>{label}</span>
      <span className={cn("shrink-0 tabular-nums", warn ? "font-semibold text-kampmax-error" : "text-kampmax-text-secondary")}>{value}</span>
    </div>
  );
}

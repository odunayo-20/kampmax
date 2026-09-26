"use client";

import Link from "next/link";
import {
  Building2,
  CalendarClock,
  ExternalLink,
  Flag,
  History,
  Mail,
  MapPin,
  Phone,
  Scale,
  ShoppingBag,
  Star,
  Store,
  Tag,
  UserRound,
  Wallet,
} from "lucide-react";
import { cn, formatNaira, timeAgo } from "@/lib/utils";
import { StatusBadge, vendorStatusVariant } from "@/components/admin/StatusBadge";
import type { ManagedUserDetail } from "@/types/admin";
import { UserRoleBadge, UserStatusBadge } from "./UserBadges";
import { RatingStars, WalletTxns } from "./UserDetailSections";

interface UserProfileOverviewProps {
  detail: ManagedUserDetail;
  onJumpToActivity: () => void;
  onJumpToReports: () => void;
  onOpenCampus?: () => void;
}

/**
 * Read-side overview for a directory account (Module 35). Sensitive wallet
 * detail is authorized-by-role here because it comes from the detail payload
 * — the list DTO strips wallet balances (§9). Cross-dataset profile links are
 * honest: only directly attributable, existing module routes.
 */
export function UserProfileOverview({
  detail,
  onJumpToActivity,
  onJumpToReports,
  onOpenCampus,
}: UserProfileOverviewProps) {
  const { user, campus, wallet } = detail;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Left column: identity */}
      <div className="space-y-4 lg:col-span-2">
        <Card title="Profile information">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
            <InfoRow icon={Mail} label="Email" value={user.email} mono />
            <InfoRow icon={Phone} label="Phone" value={user.phone} mono />
            <InfoRow
              icon={CalendarClock}
              label="Date joined"
              value={`${timeAgo(user.joinedAt)} · ${new Date(user.joinedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}`}
            />
            <InfoRow icon={History} label="Last active" value={timeAgo(user.lastActiveAt)} />
            <InfoRow icon={Tag} label="Lifetime orders" value={`${user.ordersCount.toLocaleString("en-NG")}`} />
            <InfoRow icon={Wallet} label="Lifetime spend" value={formatNaira(user.totalSpent)} />
          </dl>
        </Card>

        {/* Campus */}
        <Card title="Campus">
          <div className="flex items-start gap-3 px-4 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kampmax-navy/5 text-kampmax-navy">
              <Building2 className="h-4 w-4" />
            </span>
            {campus ? (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-kampmax-text">{campus.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-kampmax-text-secondary">
                  <MapPin className="h-3 w-3" />
                  {campus.city}, {campus.state} · {campus.shortName}
                </p>
              </div>
            ) : (
              <p className="text-sm text-kampmax-text-secondary">No campus assigned.</p>
            )}
            {campus && onOpenCampus && (
              <button
                type="button"
                onClick={onOpenCampus}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-2.5 py-1.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
              >
                <ExternalLink className="h-3 w-3" />
                Campus console
              </button>
            )}
          </div>
        </Card>

        {/* Vendor information (vendors only) */}
        {user.vendorProfile && (
          <Card
            title="Vendor information"
            subtitle={`Store operated by ${user.name}`}
            action={
              <Link
                href="/admin/vendors"
                className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-2.5 py-1.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
              >
                <Store className="h-3 w-3" />
                Vendors console
              </Link>
            }
          >
            <div className="px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kampmax-gold/15 text-kampmax-gold-dark">
                    <Store className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-kampmax-text">
                      {user.vendorProfile.storeName}
                    </p>
                    {user.vendorProfile.category && (
                      <p className="truncate text-xs text-kampmax-text-secondary">
                        {user.vendorProfile.category}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <RatingStars rating={user.vendorProfile.rating} />
                  <StatusBadge variant={vendorStatusVariant(user.vendorProfile.status)} label={user.vendorProfile.status} />
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4">
                <MiniStat label="Products" value={String(user.vendorProfile.productsCount)} />
                <MiniStat label="Total sales" value={formatNaira(user.vendorProfile.totalSales)} />
                <MiniStat label="Reviews" value={String(user.vendorProfile.reviewsCount)} />
                <MiniStat
                  label="Fulfillment"
                  value={user.vendorProfile.fulfillmentRate === null ? "—" : `${user.vendorProfile.fulfillmentRate}%`}
                />
              </dl>
            </div>
          </Card>
        )}
      </div>

      {/* Right column: finance + account */}
      <div className="space-y-4">
        {/* Wallet summary */}
        <Card title="Wallet summary" subtitle={`Last wallet activity ${timeAgo(wallet.lastActivityAt)}`}>
          <div className="px-4 py-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-kampmax-text-secondary">Current balance</p>
                <p className="text-2xl font-bold tabular-nums text-kampmax-text">{formatNaira(wallet.balance)}</p>
              </div>
              <StatusBadge
                variant={wallet.status === "active" ? "success" : "error"}
                label={wallet.status === "active" ? "wallet active" : "wallet frozen"}
              />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-6">
              <MiniStat label="Total credited" value={formatNaira(wallet.totalCredited)} tone="success" />
              <MiniStat label="Total debited" value={formatNaira(wallet.totalDebited)} tone="error" />
            </dl>
            <div className="mt-3 border-t border-kampmax-border/70 pt-1">
              <p className="px-0 pt-2 text-xs font-medium uppercase tracking-wide text-kampmax-text-secondary">
                Recent transactions
              </p>
              <WalletTxns txns={wallet.recentTransactions} />
            </div>
          </div>
        </Card>

        {/* Account status */}
        <Card title="Account status">
          <div className="space-y-3 px-4 py-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <UserStatusBadge status={user.status} />
              <UserRoleBadge role={user.role} />
              {!user.isVerified && (
                <StatusBadge variant="warning" label="unverified email" dot={false} />
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              <div>
                <dt className="text-xs text-kampmax-text-secondary">Open disputes</dt>
                <dd className={cn("mt-0.5 text-sm font-semibold tabular-nums", user.disputeCount > 0 ? "text-kampmax-error" : "text-kampmax-text")}>
                  {user.disputeCount}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-kampmax-text-secondary">Reports against</dt>
                <dd className={cn("mt-0.5 text-sm font-semibold tabular-nums", user.reportsCount > 0 ? "text-kampmax-error" : "text-kampmax-text")}>
                  {user.reportsCount}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={onJumpToActivity}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-2.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
              >
                <History className="h-3 w-3" /> View activity
              </button>
              <button
                type="button"
                onClick={onJumpToReports}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-2.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
              >
                <Flag className="h-3 w-3" /> Reports ({detail.reports.length})
              </button>
            </div>
          </div>
        </Card>

        {/* Connected modules */}
        <Card
          title="Related modules"
          subtitle="Account activity is governed from the modules below"
        >
          <ul role="list" className="divide-y divide-kampmax-border/70">
            <ModuleLinkRow icon={ShoppingBag} label="Orders" target="/admin/orders" />
            <ModuleLinkRow icon={Star} label="Reviews & moderation" target="/admin/reviews" />
            <ModuleLinkRow icon={Scale} label="Disputes" target="/admin/disputes" />
            {user.vendorProfile && (
              <ModuleLinkRow icon={Store} label="Vendors" target="/admin/vendors" />
            )}
            {(user.role === "admin" || user.role === "super_admin" || user.role === "moderator" || user.role === "support" || user.role === "campus_admin") && (
              <ModuleLinkRow icon={UserRound} label="Roles & permissions" target="/admin/permissions" />
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Building blocks
// ------------------------------------------------------------

function Card({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-kampmax-border bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-kampmax-border px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-kampmax-text">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-xs text-kampmax-text-secondary">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-kampmax-text-secondary">
        <Icon className="h-3 w-3 shrink-0" />
        {label}
      </dt>
      <dd className={cn("mt-0.5 truncate text-sm font-medium text-kampmax-text", mono && "font-mono text-xs")}>
        {value}
      </dd>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "error";
}) {
  return (
    <div>
      <dt className="text-xs text-kampmax-text-secondary">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-sm font-semibold tabular-nums",
          tone === "success" ? "text-kampmax-success" : tone === "error" ? "text-kampmax-error" : "text-kampmax-text"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function ModuleLinkRow({
  icon: Icon,
  label,
  target,
}: {
  icon: typeof Store;
  label: string;
  target: string;
}) {
  return (
    <li className="flex items-center gap-2.5 px-4 py-2.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-kampmax-text-secondary" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-kampmax-text">{label}</span>
      <Link
        href={target}
        className="inline-flex items-center gap-1 text-xs font-medium text-kampmax-blue transition-colors hover:underline"
      >
        Open
        <ExternalLink className="h-3 w-3" />
      </Link>
    </li>
  );
}
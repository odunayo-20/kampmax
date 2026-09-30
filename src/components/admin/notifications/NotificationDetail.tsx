"use client";

import {
  ArrowLeft,
  Bell,
  ExternalLink,
  Info,
  User,
} from "lucide-react";
import { StatusBadge, badgeVariantClasses } from "@/components/admin/StatusBadge";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { cn, formatDateTime } from "@/lib/utils";
import {
  notificationTypeIcon,
  notificationTypeLabel,
  notificationTypeVariant,
  readStateLabel,
  readStateVariant,
} from "./notifications-meta";
import { useEffect } from "react";
import { markNotificationRead } from "@/data/notifications";
import { useAdminNotificationDetail } from "@/hooks/admin/use-admin-communications";
import type { ManagedNotificationRow } from "@/types/admin";

interface NotificationDetailProps {
  id: string;
  onBack: () => void;
}

export function NotificationDetail({ id, onBack }: NotificationDetailProps) {
  const { data: row, isLoading, error } = useAdminNotificationDetail(id);

  useEffect(() => {
    if (row?.id && !row.read) {
      markNotificationRead(row.id);
    }
  }, [row?.id, row?.read]);

  if (isLoading) return <DetailSkeleton />;
  if (error || !row) return <NotFound onBack={onBack} />;

  return <DetailContent row={row} onBack={onBack} />;
}

function DetailContent({
  row,
  onBack,
}: {
  row: ManagedNotificationRow;
  onBack: () => void;
}) {
  const Icon = notificationTypeIcon(row.type);
  const actionUrl =
    row.data && typeof row.data.actionUrl === "string" ? row.data.actionUrl : null;

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border px-3 py-1.5 text-xs font-medium text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted/40"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <StatusBadge
          variant={notificationTypeVariant(row.type)}
          label={notificationTypeLabel(row.type)}
        />
        <StatusBadge
          variant={readStateVariant(row.read)}
          label={readStateLabel(row.read)}
        />
      </div>

      {/* Title */}
      <h1 className="mt-3 text-lg font-bold text-kampmax-text">{row.title}</h1>
      <p className="mt-0.5 font-mono text-xs text-kampmax-text-secondary">{row.id}</p>

      {/* Body */}
      <div className="mt-4 rounded-lg border border-kampmax-border bg-white px-5 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-kampmax-text-secondary">
          Message
        </h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-kampmax-text">
          {row.message || row.body}
        </p>
      </div>

      {/* Meta grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetaCard label="Recipient">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-kampmax-muted text-kampmax-text-secondary">
              <User className="h-3.5 w-3.5" />
            </span>
            <div>
              <a
                href={row.recipientHref}
                className="font-medium text-kampmax-text hover:underline"
              >
                {row.recipientName}
              </a>
              <p className="font-mono text-[11px] text-kampmax-text-secondary">
                {row.recipientId}
              </p>
            </div>
          </div>
        </MetaCard>

        <MetaCard label="Type">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
              badgeVariantClasses(notificationTypeVariant(row.type))
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {notificationTypeLabel(row.type)}
          </span>
        </MetaCard>

        <MetaCard label="Created">
          <p className="text-sm font-medium text-kampmax-text">
            {formatDateTime(row.createdAt)}
          </p>
        </MetaCard>
      </div>

      {/* Action link */}
      <div className="mt-4 rounded-lg border border-kampmax-border bg-white px-5 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-kampmax-text-secondary">
          Action link
        </h2>
        {actionUrl ? (
          <a
            href={actionUrl}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-kampmax-text hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {actionUrl}
          </a>
        ) : (
          <p className="mt-2 text-xs text-kampmax-text-secondary">
            No action link set on this notification.
          </p>
        )}
      </div>

      {/* Delivery note */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-kampmax-border bg-kampmax-muted/30 px-4 py-3 text-xs text-kampmax-text-secondary">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          This notification lives in the shared in-app notification store. Read
          state is the only delivery signal available — no email, SMS or push
          provider is integrated.
        </span>
      </div>
    </>
  );
}

function MetaCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-kampmax-border bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-kampmax-text-secondary">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border px-3 py-1.5 text-xs font-medium text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted/40"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
      </div>
      <div className="mt-6 rounded-lg border border-kampmax-border bg-kampmax-surface p-12 text-center text-sm text-kampmax-text-muted">
        This notification could not be found on the real in-app store.
      </div>
    </>
  );
}

function DetailSkeleton() {
  return (
    <>
      <div className="mb-4 flex gap-2">
        <div className="h-8 w-16 animate-pulse rounded-md bg-kampmax-surface-hover" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-kampmax-surface-hover" />
      </div>
      <div className="mb-2 h-7 w-48 animate-pulse rounded bg-kampmax-surface-hover" />
      <LoadingSkeleton rows={5} />
    </>
  );
}

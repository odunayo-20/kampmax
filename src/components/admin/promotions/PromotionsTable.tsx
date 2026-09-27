"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  Copy,
  MoreHorizontal,
  Pencil,
  Play,
  Eye,
  Ticket,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { cn, formatDateShort } from "@/lib/utils";
import {
  PromotionStatusBadge,
  PromotionTypeIcon,
} from "./PromotionBadges";
import { discountLabel } from "./promotions-meta";
import type { ManagedPromotion, ManagedPromotionStatus } from "@/types/admin";

export interface PromotionsTableProps {
  items: ManagedPromotion[];
  loading: boolean;
  error: boolean;
  hasActiveFilters: boolean;
  onRetry: () => void;
  onClearFilters: () => void;
  onEdit: (p: ManagedPromotion) => void;
  onDuplicate: (p: ManagedPromotion) => void;
  onSetStatus: (p: ManagedPromotion, status: ManagedPromotionStatus) => void;
  onDelete: (p: ManagedPromotion) => void;
}

/** Which lifecycle actions are offered for each current status. */
export function promotionActionsFor(
  p: ManagedPromotion
): { action: ManagedPromotionStatus | "delete"; label: string; danger?: boolean }[] {
  const out: { action: ManagedPromotionStatus | "delete"; label: string; danger?: boolean }[] = [];
  switch (p.status) {
    case "draft":
      out.push({ action: "active", label: "Activate" });
      break;
    case "scheduled":
      out.push({ action: "active", label: "Activate now" });
      out.push({ action: "paused", label: "Pause" });
      break;
    case "active":
      out.push({ action: "paused", label: "Pause" });
      out.push({ action: "ended", label: "End now" });
      break;
    case "paused":
      out.push({ action: "active", label: "Resume" });
      out.push({ action: "ended", label: "End now" });
      break;
    case "ended":
      break;
  }
  if (p.status !== "active") {
    out.push({ action: "delete", label: "Delete", danger: true });
  }
  return out;
}

export function PromotionsTable(props: PromotionsTableProps) {
  const {
    items,
    loading,
    error,
    hasActiveFilters,
    onRetry,
    onClearFilters,
    onEdit,
    onDuplicate,
    onSetStatus,
    onDelete,
  } = props;
  const router = useRouter();

  if (loading && items.length === 0)
    return <LoadingSkeleton variant="table" rows={6} />;
  if (error) return <ErrorState onRetry={onRetry} />;
  if (items.length === 0)
    return (
      <EmptyState
        title={hasActiveFilters ? "No promotions match" : "No promotions yet"}
        message={
          hasActiveFilters
            ? "Try different search terms or filters."
            : "Create a promo code to get started."
        }
        action={
          hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="h-8 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text hover:bg-kampmax-muted/60"
            >
              Clear filters
            </button>
          ) : undefined
        }
      />
    );

  return (
    <>
      {/* Desktop / tablet: full table */}
      <div className="hidden overflow-hidden rounded-lg border border-kampmax-border bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-kampmax-border bg-kampmax-muted/40 text-[11px] uppercase tracking-wide text-kampmax-text-secondary">
              <th scope="col" className="px-4 py-2.5 font-medium">Promotion</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Type</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Discount</th>
              <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">Target</th>
              <th scope="col" className="hidden px-3 py-2.5 font-medium xl:table-cell">Campus</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Runs</th>
              <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">Usage</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
              <th scope="col" className="w-10 px-2 py-2.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kampmax-border">
            {items.map((p) => (
              <tr
                key={p.id}
                onClick={() => router.push(`/admin/promotions/${p.id}`)}
                className="cursor-pointer transition-colors hover:bg-kampmax-muted/40"
              >
                {/* Name + code */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <PromotionTypeIcon type={p.type} size="sm" />
                    <div className="min-w-0">
                      <Link
                        href={`/admin/promotions/${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block max-w-[220px] truncate font-medium text-kampmax-blue hover:underline"
                      >
                        {p.name}
                      </Link>
                      <span className="text-[11px] tabular-nums text-kampmax-text-secondary">
                        {p.code ? (
                          <span className="inline-flex items-center gap-1 font-mono uppercase text-kampmax-text-secondary">
                            <Ticket aria-hidden className="h-3 w-3" />
                            {p.code}
                          </span>
                        ) : (
                          p.id.toUpperCase()
                        )}
                        {p.vendorName && (
                          <span className="ml-2 font-sans normal-case">by {p.vendorName}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="whitespace-nowrap px-3 py-2.5 capitalize text-kampmax-text-secondary">
                  {p.type.replace(/_/g, " ")}
                </td>

                <td className="whitespace-nowrap px-3 py-2.5 font-medium tabular-nums text-kampmax-text">
                  {discountLabel(p)}
                </td>

                {/* Target */}
                <td className="hidden max-w-[200px] px-3 py-2.5 lg:table-cell">
                  <TargetSummary p={p} />
                </td>

                {/* Campus */}
                <td className="hidden whitespace-nowrap px-3 py-2.5 xl:table-cell">
                  {p.targeting.campusIds.length === 0 ? (
                    <span className="text-kampmax-text-secondary">All campuses</span>
                  ) : (
                    <span className="font-medium text-kampmax-text">
                      {p.targeting.campusIds.length} campus
                      {p.targeting.campusIds.length === 1 ? "" : "es"}
                    </span>
                  )}
                </td>

                {/* Runs */}
                <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-kampmax-text-secondary">
                  <span title={p.startsAt}>{formatDateShort(p.startsAt)}</span>
                  {" → "}
                  <span title={p.endsAt ?? undefined}>
                    {p.endsAt ? formatDateShort(p.endsAt) : "No end"}
                  </span>
                </td>

                <td className="hidden whitespace-nowrap px-3 py-2.5 tabular-nums md:table-cell">
                  {p.usageCount}
                  {p.usageLimit != null ? ` / ${p.usageLimit}` : ""}
                </td>

                <td className="px-3 py-2.5">
                  <PromotionStatusBadge status={p.status} />
                </td>

                <td
                  className="px-2 py-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <RowMenu
                    p={p}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onSetStatus={onSetStatus}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="space-y-2.5 md:hidden">
        {items.map((p) => (
          <li
            key={p.id}
            onClick={() => router.push(`/admin/promotions/${p.id}`)}
            className="cursor-pointer rounded-lg border border-kampmax-border bg-white p-3 transition-colors active:bg-kampmax-muted/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2.5">
                <PromotionTypeIcon type={p.type} size="sm" />
                <div className="min-w-0">
                  <Link
                    href={`/admin/promotions/${p.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block truncate font-medium text-kampmax-blue"
                  >
                    {p.name}
                  </Link>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase text-kampmax-text-secondary">
                    {p.code && <Ticket aria-hidden className="h-3 w-3" />}
                    {p.code ?? p.id.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <PromotionStatusBadge status={p.status} />
                <RowMenu
                  p={p}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onSetStatus={onSetStatus}
                  onDelete={onDelete}
                />
              </div>
            </div>

            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-dashed border-kampmax-border pt-2 text-xs sm:grid-cols-3">
              <MetaCell label="Discount">
                <span className="font-medium tabular-nums">{discountLabel(p)}</span>
              </MetaCell>
              <MetaCell label="Type">
                <span className="capitalize">{p.type.replace(/_/g, " ")}</span>
              </MetaCell>
              <MetaCell label="Usage">
                {p.usageCount}
                {p.usageLimit != null ? ` / ${p.usageLimit}` : ""}
              </MetaCell>
              <MetaCell label="Runs">
                <span className="tabular-nums">
                  {formatDateShort(p.startsAt)} - {p.endsAt ? formatDateShort(p.endsAt) : "No end"}
                </span>
              </MetaCell>
              <MetaCell label="Target">
                <TargetSummary p={p} />
              </MetaCell>
              <MetaCell label="Campus">
                {p.targeting.campusIds.length === 0
                  ? "All campuses"
                  : `${p.targeting.campusIds.length} campus${p.targeting.campusIds.length === 1 ? "" : "es"}`}
              </MetaCell>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

function MetaCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-kampmax-text-secondary">
        {label}
      </dt>
      <dd className="truncate text-kampmax-text" title={typeof children === "string" ? children : undefined}>
        {children}
      </dd>
    </div>
  );
}

function TargetSummary({ p }: { p: ManagedPromotion }) {
  const { targeting, type } = p;
  const bits: string[] = [];
  if (type === "featured_vendor" || targeting.vendorIds.length > 0)
    bits.push(
      `${targeting.vendorIds.length || 1} vendor${targeting.vendorIds.length === 1 ? "" : "s"}`
    );
  if (type === "featured_product" || targeting.productIds.length > 0)
    bits.push(
      `${targeting.productIds.length || 1} product${targeting.productIds.length === 1 ? "" : "s"}`
    );
  if (targeting.categoryIds.length > 0)
    bits.push(`${targeting.categoryIds.length} categor${targeting.categoryIds.length === 1 ? "y" : "ies"}`);
  if (bits.length === 0) return <span className="text-kampmax-text-secondary">Marketplace-wide</span>;
  return (
    <span className="truncate text-kampmax-text" title={bits.join(" · ")}>
      {bits.join(" · ")}
    </span>
  );
}

function RowMenu({
  p,
  onEdit,
  onDuplicate,
  onSetStatus,
  onDelete,
}: Pick<PromotionsTableProps, "onEdit" | "onDuplicate" | "onSetStatus" | "onDelete"> & {
  p: ManagedPromotion;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click, Escape, any scroll or resize.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const dismiss = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  // Position below the trigger, flipping above when it would overflow the
  // viewport bottom (last rows), clamped to the screen edges.
  useEffect(() => {
    if (!open || !menuRef.current || !btnRef.current) return;
    const menu = menuRef.current.getBoundingClientRect();
    const btn = btnRef.current.getBoundingClientRect();
    let top = btn.bottom + 4;
    if (top + menu.height > window.innerHeight - 8)
      top = Math.max(8, btn.top - menu.height - 4);
    let left = btn.right - menu.width;
    left = Math.max(8, Math.min(left, window.innerWidth - menu.width - 8));
    menuRef.current.style.top = `${top}px`;
    menuRef.current.style.left = `${left}px`;
    menuRef.current.style.visibility = "visible";
  }, [open]);

  const actions = promotionActionsFor(p);

  return (
    <div className="relative flex justify-end">
      <div className="flex items-center gap-0.5">
        {(p.status === "draft" || p.status === "paused") && (
          <button
            type="button"
            title={p.status === "draft" ? "Activate" : "Resume"}
            onClick={() => onSetStatus(p, "active")}
            className="rounded-md p-1.5 text-kampmax-success transition-colors hover:bg-emerald-50"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        )}
        {p.status === "active" && (
          <button
            type="button"
            title="Pause"
            onClick={() => onSetStatus(p, "paused")}
            className="rounded-md p-1.5 text-amber-600 transition-colors hover:bg-amber-50"
          >
            <Ban className="h-3.5 w-3.5" />
          </button>
        )}
        <Link
          href={`/admin/promotions/${p.id}`}
          title="View details"
          className="hidden rounded-md p-1.5 text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted sm:block"
        >
          <Eye className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          ref={btnRef}
          aria-label={`Actions for ${p.name}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-1.5 text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-text"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: -9999,
              left: -9999,
              visibility: "hidden",
            }}
            className="z-[90] w-44 overflow-hidden rounded-lg border border-kampmax-border bg-white py-1 shadow-lg"
          >
          <MenuItem icon={Pencil} label="Edit promotion" close={() => setOpen(false)} onSelect={() => onEdit(p)} />
          <MenuItem
            icon={Copy}
            label="Duplicate as draft"
            close={() => setOpen(false)}
            onSelect={() => onDuplicate(p)}
          />
          {actions
            .filter((a) => a.action !== "delete")
            .map((a) => (
              <MenuItem
                key={a.action + a.label}
                icon={a.action === "ended" ? Ban : Play}
                label={a.label}
                close={() => setOpen(false)}
                onSelect={() => onSetStatus(p, a.action as ManagedPromotionStatus)}
              />
            ))}
          {actions.map((a) =>
            a.action !== "delete" ? null : (
              <MenuItem
                key={a.action}
                icon={Trash2}
                label={a.label}
                danger
                close={() => setOpen(false)}
                onSelect={() => onDelete(p)}
              />
            )
          )}
            </div>,
            document.body
          )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  danger = false,
  close,
  onSelect,
}: {
  icon: typeof Pencil;
  label: string;
  danger?: boolean;
  close: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        close();
        onSelect();
      }}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-kampmax-muted/60",
        danger ? "text-kampmax-error" : "text-kampmax-text"
      )}
    >
      <Icon className="h-3.5 w-3.5 opacity-70" />
      {label}
    </button>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, MoreHorizontal, Pencil, Pause, Play, Power, XCircle } from "lucide-react";
import {
  useActivatePromotion,
  useCancelPromotion,
  useDuplicatePromotion,
  usePausePromotion,
  useResumePromotion,
} from "@/hooks/use-vendor-promotions";
import type { VendorPromotion, VendorPromotionPermissions, VendorPromotionResult } from "@/types/vendor-promotions";

interface PromotionRowActionsProps {
  promotion: VendorPromotion;
  permissions: VendorPromotionPermissions;
  onChanged: () => void;
}

export function PromotionRowActions({ promotion, permissions, onChanged }: PromotionRowActionsProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const activate = useActivatePromotion();
  const pause = usePausePromotion();
  const resume = useResumePromotion();
  const cancel = useCancelPromotion();
  const duplicate = useDuplicatePromotion();
  const [message, setMessage] = useState<string | null>(null);

  const canManage = permissions["promotions.manage"];
  const status = promotion.status;
  const editable = status === "draft" || status === "scheduled";

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  function handleResult(result: VendorPromotionResult, successText: string) {
    if (result.ok) {
      close();
      setMessage(successText);
      onChanged();
    } else {
      setMessage(result.error ?? "Something went wrong.");
      setConfirming(false);
    }
    setBusy(false);
  }

  async function run(fn: () => Promise<VendorPromotionResult>, successText: string) {
    setBusy(true);
    setMessage(null);
    try {
      handleResult(await fn(), successText);
    } catch (err) {
      handleResult(
        { ok: false, code: "validation_failed", error: err instanceof Error ? err.message : undefined },
        successText
      );
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setMessage(null); }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-kampmax-text-secondary hover:bg-kampmax-muted"
        aria-label={`Actions for ${promotion.title}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className="absolute right-0 top-9 z-20 w-48 rounded-lg border border-kampmax-border bg-white py-1 shadow-lg">
            {canManage && status === "active" && (
              <MenuButton onClick={() => run(() => pause.mutateAsync(promotion.id), "Promotion paused.")} icon={Pause} label="Pause" />
            )}
            {canManage && status === "paused" && (
              <MenuButton onClick={() => run(() => resume.mutateAsync(promotion.id), "Promotion resumed.")} icon={Play} label="Resume" />
            )}
            {canManage && (status === "draft" || status === "scheduled") && (
              <MenuButton onClick={() => run(() => activate.mutateAsync(promotion.id), "Promotion activated.")} icon={Power} label="Activate" />
            )}
            {editable && (
              <Link href={`/vendor/promotions/${promotion.id}/edit`} onClick={close} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-kampmax-text hover:bg-kampmax-muted">
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit
              </Link>
            )}
            {canManage && (
              <MenuButton onClick={() => run(() => duplicate.mutateAsync(promotion.id), "Draft copy created.")} icon={Copy} label="Duplicate" />
            )}
            {canManage && !["expired", "cancelled"].includes(status) && (
              confirming ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => cancel.mutateAsync(promotion.id), "Promotion cancelled.")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-kampmax-error hover:bg-kampmax-muted"
                >
                  <XCircle className="h-3.5 w-3.5" aria-hidden />
                  Confirm cancel?
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-kampmax-error hover:bg-kampmax-muted"
                >
                  <XCircle className="h-3.5 w-3.5" aria-hidden />
                  Cancel promotion
                </button>
              )
            )}
          </div>
        </>
      )}

      {message && (
        <p className="mt-1 text-[11px] font-medium text-kampmax-text-secondary" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

function MenuButton({ onClick, icon: Icon, label }: { onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-kampmax-text hover:bg-kampmax-muted"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}
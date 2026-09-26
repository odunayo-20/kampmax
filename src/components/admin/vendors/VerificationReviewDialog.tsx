"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BadgeX,
  CheckCircle2,
  CircleDashed,
  FileWarning,
  Loader2,
  MailCheck,
  PhoneCall,
  ShieldQuestion,
  X,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type {
  ManagedVendor,
  VendorDocState,
  VendorVerificationDocument,
} from "@/types/admin";
import { docStateBadgeVariant } from "./vendors-meta";
import { StoreAvatar, VerificationBadge } from "./VendorBadges";

interface VerificationReviewDialogProps {
  open: boolean;
  vendor: ManagedVendor | null;
  /** "review" = approve/reject controls; "read" = history only. */
  mode?: "review" | "read";
  working?: boolean;
  onClose: () => void;
  onApprove: (vendor: ManagedVendor) => Promise<void>;
  onReject: (vendor: ManagedVendor, reason: string) => Promise<void>;
  /**
   * Approve / reject a single document. A store can only be approved once
   * its required documents are approved, so review mode needs this.
   */
  onReviewDocument?: (
    vendor: ManagedVendor,
    doc: VendorVerificationDocument,
    decision: "approve" | "reject",
    reason?: string
  ) => Promise<void>;
}

const DOC_STATE_LABELS: Record<VendorDocState, string> = {
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  missing: "Missing",
};

/**
 * "Review verification information" - the document dossier an admin
 * sees before approving or rejecting a vendor. Also used read-only
 * for rejected vendors (shows the recorded rejection reason).
 */
export function VerificationReviewDialog({
  open,
  vendor,
  mode = "review",
  working = false,
  onClose,
  onApprove,
  onReject,
  onReviewDocument,
}: VerificationReviewDialogProps) {
  const [docBusy, setDocBusy] = useState<string | null>(null);
  const [docRejectId, setDocRejectId] = useState<string | null>(null);
  const [docReason, setDocReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [busyButton, setBusyButton] = useState<"approve" | "reject" | null>(null);

  useEffect(() => {
    if (!open) return;
    setRejecting(false);
    setReason("");
    setReasonError(null);
    setBusyButton(null);
    setDocBusy(null);
    setDocRejectId(null);
    setDocReason("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !working) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, working, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const completeness = useMemo(() => {
    if (!vendor) return { approved: 0, total: 0, percent: 0 };
    const docs = vendor.verification.documents;
    const approved = docs.filter((d) => d.state === "approved").length;
    return {
      approved,
      total: docs.length,
      percent: Math.round((approved / Math.max(docs.length, 1)) * 100),
    };
  }, [vendor]);

  if (!open || !vendor) return null;

  const v = vendor.verification;

  async function reviewDoc(
    doc: VendorVerificationDocument,
    decision: "approve" | "reject",
    why?: string
  ) {
    if (!vendor || !onReviewDocument || docBusy) return;
    setDocBusy(doc.id);
    try {
      await onReviewDocument(vendor, doc, decision, why);
      setDocRejectId(null);
      setDocReason("");
    } finally {
      setDocBusy(null);
    }
  }

  async function handleApprove() {
    if (!vendor || busyButton) return;
    setBusyButton("approve");
    try {
      await onApprove(vendor);
      onClose();
    } finally {
      setBusyButton(null);
    }
  }

  async function handleSubmitReject(e: FormEvent) {
    e.preventDefault();
    if (!vendor || busyButton) return;
    if (reason.trim().length < 10) {
      setReasonError("Give the vendor a clear reason (at least 10 characters).");
      return;
    }
    setReasonError(null);
    setBusyButton("reject");
    try {
      await onReject(vendor, reason.trim());
      onClose();
    } finally {
      setBusyButton(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-review-title"
    >
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={() => !working && onClose()}
      />

      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-kampmax-border bg-white shadow-xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-kampmax-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <StoreAvatar vendor={vendor} size="lg" />
            <div className="min-w-0">
              <h2 id="verification-review-title" className="truncate text-sm font-semibold text-kampmax-text">
                Verification review
              </h2>
              <p className="truncate text-xs text-kampmax-text-secondary">
                {vendor.storeName} · submitted{" "}
                {v.submittedAt ? formatDate(v.submittedAt) : "—"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <VerificationBadge status={vendor.verificationStatus} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              disabled={working}
              className="rounded-md p-1 text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-text disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Account checks */}
          <section aria-label="Account checks" className="grid grid-cols-3 gap-2">
            <CheckTile
              label="Email verified"
              ok={v.emailVerified}
              icon={<MailCheck className="h-3.5 w-3.5" />}
            />
            <CheckTile
              label="Phone verified"
              ok={v.phoneVerified}
              icon={<PhoneCall className="h-3.5 w-3.5" />}
            />
            {v.bvnVerified !== null && (
              <CheckTile
                label="BVN matched"
                ok={v.bvnVerified}
                icon={<ShieldQuestion className="h-3.5 w-3.5" />}
              />
            )}
          </section>

          {/* Documents */}
          <section aria-label="Verification documents">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-kampmax-text-secondary">
                Documents · {completeness.approved}/{completeness.total} approved
              </h3>
              <span className="text-xs tabular-nums text-kampmax-text-secondary">
                {completeness.percent}% complete
              </span>
            </div>

            <ul className="space-y-1.5">
              {v.documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  reviewable={mode === "review" && !!onReviewDocument}
                  busy={docBusy === doc.id}
                  rejecting={docRejectId === doc.id}
                  reason={docReason}
                  onReason={setDocReason}
                  onApprove={() => void reviewDoc(doc, "approve")}
                  onStartReject={() => {
                    setDocRejectId(doc.id);
                    setDocReason("");
                  }}
                  onCancelReject={() => setDocRejectId(null)}
                  onConfirmReject={() => void reviewDoc(doc, "reject", docReason)}
                />
              ))}
            </ul>
          </section>

          {/* Reviewer trail / rejection reason for non-pending vendors */}
          {(v.reviewedBy || v.rejectionReason) && (
            <section
              aria-label="Previous decision"
              className={cn(
                "rounded-lg border px-3.5 py-3",
                v.rejectionReason
                  ? "border-kampmax-error/30 bg-kampmax-error/5"
                  : "border-kampmax-success/30 bg-kampmax-success/5"
              )}
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold text-kampmax-text">
                {v.rejectionReason ? (
                  <>
                    <FileWarning className="h-3.5 w-3.5 text-kampmax-error" />
                    Rejected by {v.reviewedBy} · {formatDate(v.reviewedAt!)}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-kampmax-success" />
                    Approved by {v.reviewedBy} · {formatDate(v.reviewedAt!)}
                  </>
                )}
              </p>
              {v.rejectionReason && (
                <p className="mt-1 text-sm leading-relaxed text-kampmax-text-secondary">
                  “{v.rejectionReason}”
                </p>
              )}
            </section>
          )}

          {/* Reject reason input */}
          {mode === "review" && rejecting && (
            <form
              onSubmit={handleSubmitReject}
              aria-label="Reject with reason"
              className="rounded-lg border border-kampmax-error/40 bg-kampmax-error/5 p-3"
            >
              <label
                htmlFor="rejection-reason"
                className="block text-xs font-semibold text-kampmax-error"
              >
                Rejection reason <span aria-hidden>*</span>
              </label>
              <textarea
                id="rejection-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Explain what the vendor must fix before reapplying…"
                className="mt-1.5 w-full resize-none rounded-lg border border-kampmax-border bg-white px-3 py-2 text-sm text-kampmax-text placeholder:text-kampmax-text-secondary/60 focus:border-kampmax-error focus:outline-none focus:ring-1 focus:ring-kampmax-error"
              />
              {reasonError && (
                <p role="alert" className="mt-1 text-xs font-medium text-kampmax-error">
                  {reasonError}
                </p>
              )}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejecting(false);
                    setReason("");
                    setReasonError(null);
                  }}
                  disabled={busyButton !== null}
                  className="h-8 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyButton !== null}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-kampmax-error px-3 text-xs font-medium text-white transition-colors hover:bg-kampmax-error/90 disabled:opacity-50"
                >
                  {busyButton === "reject" && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Confirm rejection
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer actions */}
        {mode === "review" && !rejecting && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-kampmax-border bg-kampmax-muted/30 px-5 py-3">
            <p className="text-xs leading-snug text-kampmax-text-secondary">
              Approving makes the storefront live immediately.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setRejecting(true)}
                disabled={busyButton !== null || vendor.verificationStatus !== "pending_verification"}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-error/40 bg-white px-3.5 text-sm font-medium text-kampmax-error transition-colors hover:bg-kampmax-error/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <BadgeX className="h-4 w-4" />
                Reject…
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={
                  busyButton !== null ||
                  vendor.verificationStatus !== "pending_verification"
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-success px-3.5 text-sm font-medium text-white transition-colors hover:bg-kampmax-success/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busyButton === "approve" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BadgeCheck className="h-4 w-4" />
                )}
                Approve vendor
              </button>
            </div>
          </div>
        )}

        {mode === "read" && (
          <div className="shrink-0 border-t border-kampmax-border bg-kampmax-muted/30 px-5 py-3">
            <p className="text-xs text-kampmax-text-secondary">
              This record is historical - no further action is required.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Pieces
// ------------------------------------------------------------

function CheckTile({
  label,
  ok,
  icon,
}: {
  label: string;
  ok: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2.5 py-2",
        ok ? "border-kampmax-success/30 bg-kampmax-success/5" : "border-kampmax-warning/40 bg-kampmax-warning/10"
      )}
    >
      <span className={ok ? "text-kampmax-success" : "text-amber-600"}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-kampmax-text">{label}</p>
        <p className={cn("text-[10px]", ok ? "text-kampmax-success" : "text-amber-700")}>
          {ok ? "Verified" : "Unverified"}
        </p>
      </div>
    </div>
  );
}

function DocumentRow({
  doc,
  reviewable,
  busy,
  rejecting,
  reason,
  onReason,
  onApprove,
  onStartReject,
  onCancelReject,
  onConfirmReject,
}: {
  doc: VendorVerificationDocument;
  reviewable: boolean;
  busy: boolean;
  rejecting: boolean;
  reason: string;
  onReason: (v: string) => void;
  onApprove: () => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onConfirmReject: () => void;
}) {
  // Missing documents haven't been uploaded, so there is nothing to review.
  const canReview = reviewable && doc.state !== "missing";
  const variant = docStateBadgeVariant(doc.state);
  const stateIcon =
    doc.state === "approved" ? (
      <CheckCircle2 className="h-3.5 w-3.5" />
    ) : doc.state === "missing" ? (
      <CircleDashed className="h-3.5 w-3.5" />
    ) : doc.state === "rejected" ? (
      <FileWarning className="h-3.5 w-3.5" />
    ) : (
      <CircleDashed className="h-3.5 w-3.5" />
    );

  return (
    <li className="rounded-lg border border-kampmax-border px-3 py-2 transition-colors hover:bg-kampmax-muted/40">
      <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="text-kampmax-text-secondary">{stateIcon}</span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-kampmax-text">
            {doc.label}
          </p>
          <p className="font-mono text-[11px] text-kampmax-text-secondary">
            {doc.reference}
            {doc.note ? ` · ${doc.note}` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {canReview && !rejecting && (
          <>
            {doc.state !== "approved" && (
              <button
                type="button"
                disabled={busy}
                onClick={onApprove}
                className="inline-flex h-7 items-center rounded-md border border-kampmax-success/40 px-2 text-[11px] font-medium text-kampmax-success transition-colors hover:bg-kampmax-success/5 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Approve"}
              </button>
            )}
            {doc.state !== "rejected" && (
              <button
                type="button"
                disabled={busy}
                onClick={onStartReject}
                className="inline-flex h-7 items-center rounded-md border border-kampmax-error/40 px-2 text-[11px] font-medium text-kampmax-error transition-colors hover:bg-kampmax-error/5 disabled:opacity-60"
              >
                Reject
              </button>
            )}
          </>
        )}
        <StatusPill variant={variant} label={DOC_STATE_LABELS[doc.state]} />
      </div>
      </div>
      {canReview && rejecting && (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={reason}
            onChange={(e) => onReason(e.target.value)}
            placeholder="Why is this document being rejected?"
            aria-label="Document rejection reason"
            maxLength={500}
            className="h-8 min-w-0 flex-1 rounded-md border border-kampmax-border bg-white px-2 text-xs focus:border-kampmax-blue focus:outline-none focus:ring-1 focus:ring-kampmax-blue"
          />
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={onConfirmReject}
            className="inline-flex h-8 items-center rounded-md bg-kampmax-error px-2.5 text-xs font-medium text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reject document"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancelReject}
            className="inline-flex h-8 items-center rounded-md border border-kampmax-border px-2.5 text-xs font-medium text-kampmax-text"
          >
            Cancel
          </button>
        </div>
      )}
    </li>
  );
}

/** Local pill so the dialog doesn't depend on StatusBadge's dot style here. */
function StatusPill({
  variant,
  label,
}: {
  variant: string;
  label: string;
}) {
  const styles: Record<string, string> = {
    success: "bg-kampmax-success/10 text-kampmax-success",
    info: "bg-kampmax-info/10 text-kampmax-info",
    error: "bg-kampmax-error/10 text-kampmax-error",
    neutral: "bg-kampmax-muted text-kampmax-text-secondary",
  };
  return (
    <span
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        styles[variant] ?? styles.neutral
      )}
    >
      {label}
    </span>
  );
}

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import {
  useVendorVerification,
  useVendorVerificationActions,
} from "@/hooks/use-verification";
import {
  documentLabel,
  type RequiredDocument,
  type VendorBusinessType,
  type VendorVerification,
  type VerificationDocStatus,
} from "@/services/verification";

const BUSINESS_TYPES: { value: VendorBusinessType; title: string; description: string }[] = [
  {
    value: "INDIVIDUAL",
    title: "Individual seller",
    description: "You sell as yourself, for example as a student with a side business.",
  },
  {
    value: "BUSINESS",
    title: "Registered business",
    description: "You sell through a business registered with the CAC.",
  },
];

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const STATUS_BADGE: Record<VerificationDocStatus | "missing", { label: string; className: string }> = {
  missing: { label: "Not uploaded", className: "bg-neutral-100 text-neutral-600" },
  submitted: { label: "Submitted", className: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
};

export default function VendorVerificationPage() {
  const query = useVendorVerification();
  const actions = useVendorVerificationActions();

  if (query.isPending) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-kampmax-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <p className="text-sm">Loading your verification…</p>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center" role="alert">
        <p className="text-sm text-kampmax-text-secondary">{getFriendlyErrorMessage(query.error)}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const v = query.data;
  const editable = v.status === "unverified" || v.status === "rejected";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/vendor"
          aria-label="Back to dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-kampmax-muted text-kampmax-text hover:bg-neutral-200 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-kampmax-navy">Store verification</h1>
          <p className="text-xs text-kampmax-text-secondary mt-0.5">
            Upload the documents Kampmax needs to verify your store.
          </p>
        </div>
      </div>

      <StatusCard status={v.status} />

      {editable && (
        <section className="rounded-2xl border border-kampmax-border bg-white p-6 space-y-4">
          <h2 className="text-sm font-bold text-kampmax-navy">How do you sell?</h2>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Business type">
            {BUSINESS_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={v.businessType === option.value}
                disabled={actions.changeBusinessType.isPending}
                onClick={() => {
                  if (v.businessType !== option.value) actions.changeBusinessType.mutate(option.value);
                }}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors disabled:opacity-60",
                  v.businessType === option.value
                    ? "border-kampmax-blue bg-blue-50/60"
                    : "border-neutral-200 hover:border-neutral-300"
                )}
              >
                <p className="text-sm font-semibold text-kampmax-navy">{option.title}</p>
                <p className="mt-0.5 text-xs text-kampmax-text-secondary">{option.description}</p>
              </button>
            ))}
          </div>
          {actions.changeBusinessType.isError && (
            <p role="alert" className="text-xs text-red-600">
              {getFriendlyErrorMessage(actions.changeBusinessType.error)}
            </p>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-kampmax-border bg-white p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-kampmax-navy">Required documents</h2>
          <p className="text-xs text-kampmax-text-secondary mt-0.5">
            PDF, JPG or PNG, up to 10MB each.
          </p>
        </div>

        <ul className="divide-y divide-neutral-100">
          {v.required.map((doc) => (
            <DocumentRow
              key={doc.type}
              doc={doc}
              canUpload={editable && doc.latest?.status !== "approved"}
              uploading={actions.upload.isPending && actions.upload.variables?.type === doc.type}
              onFile={(file) => actions.upload.mutate({ type: doc.type, file })}
            />
          ))}
        </ul>

        {actions.upload.isError && (
          <p role="alert" className="text-xs text-red-600">
            {getFriendlyErrorMessage(actions.upload.error)}
          </p>
        )}
      </section>

      {editable && (
        <section className="rounded-2xl border border-kampmax-border bg-white p-6 space-y-3">
          <h2 className="text-sm font-bold text-kampmax-navy">Send for review</h2>
          <p className="text-xs text-kampmax-text-secondary">
            {v.documentsComplete
              ? "Everything is in. Our team will review your documents and let you know."
              : "Upload every required document above to send them for review."}
          </p>
          {actions.submit.isError && (
            <p role="alert" className="text-xs text-red-600">
              {getFriendlyErrorMessage(actions.submit.error)}
            </p>
          )}
          <Button
            variant="primary"
            disabled={!v.canSubmit || actions.submit.isPending}
            onClick={() => actions.submit.mutate()}
          >
            {actions.submit.isPending ? "Submitting…" : v.status === "rejected" ? "Resubmit for review" : "Submit for review"}
          </Button>
        </section>
      )}

      <DocumentHistory documents={v.documents} />

      <p className="text-xs text-kampmax-text-secondary">
        Payouts need a bank account and identity check. Set those up in your{" "}
        <Link href="/profile/wallet" className="font-semibold text-kampmax-blue hover:underline">
          wallet
        </Link>
        .
      </p>
    </div>
  );
}

function StatusCard({ status }: { status: VendorVerification["status"] }) {
  const content = {
    verified: {
      icon: <ShieldCheck className="h-6 w-6" />,
      tone: "border-emerald-200 bg-emerald-50/50",
      iconTone: "bg-emerald-100 text-emerald-600",
      title: "Your store is verified",
      body: "Kampmax has verified your documents. Your store shows the verified badge.",
    },
    pending_review: {
      icon: <Clock className="h-6 w-6" />,
      tone: "border-amber-200 bg-amber-50/50",
      iconTone: "bg-amber-100 text-amber-600",
      title: "Your documents are under review",
      body: "Our team is reviewing what you submitted. You'll be notified when there's a decision.",
    },
    rejected: {
      icon: <XCircle className="h-6 w-6" />,
      tone: "border-red-200 bg-red-50/50",
      iconTone: "bg-red-100 text-red-600",
      title: "Your verification needs attention",
      body: "One or more documents were rejected. Replace them below and submit again.",
    },
    suspended: {
      icon: <XCircle className="h-6 w-6" />,
      tone: "border-red-200 bg-red-50/50",
      iconTone: "bg-red-100 text-red-600",
      title: "Your store is suspended",
      body: "Verification can't be changed while a store is suspended. Contact support to resolve it.",
    },
    unverified: {
      icon: <ShieldAlert className="h-6 w-6" />,
      tone: "border-blue-200 bg-blue-50/50",
      iconTone: "bg-kampmax-blue/15 text-kampmax-blue",
      title: "Verify your store",
      body: "Upload the documents below and send them for review to earn the verified badge.",
    },
  }[status];

  return (
    <div className={cn("rounded-2xl border p-6", content.tone)}>
      <div className="flex items-start gap-4">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", content.iconTone)}>
          {content.icon}
        </div>
        <div>
          <h2 className="text-base font-bold text-kampmax-navy">{content.title}</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-kampmax-text-secondary">{content.body}</p>
        </div>
      </div>
    </div>
  );
}

function DocumentRow({
  doc,
  canUpload,
  uploading,
  onFile,
}: {
  doc: RequiredDocument;
  canUpload: boolean;
  uploading: boolean;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const state = doc.latest?.status ?? "missing";
  const badge = STATUS_BADGE[state];

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-4 w-4 text-neutral-400" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-kampmax-navy">{doc.label}</p>
          {doc.latest && <p className="text-[11px] text-neutral-500">{doc.latest.filename}</p>}
          {doc.latest?.status === "rejected" && doc.latest.rejectionReason && (
            <p className="text-[11px] text-red-600">Reason: {doc.latest.rejectionReason}</p>
          )}
          {sizeError && <p className="text-[11px] text-red-600">{sizeError}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", badge.className)}>
          {badge.label}
        </span>
        {canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="sr-only"
              aria-label={`Upload ${documentLabel(doc.type)}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (file.size > MAX_FILE_BYTES) {
                  setSizeError("That file is over 10MB.");
                  return;
                }
                setSizeError(null);
                onFile(file);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              )}
              {uploading ? "Uploading…" : doc.latest ? "Replace" : "Upload"}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

function DocumentHistory({ documents }: { documents: VendorVerification["documents"] }) {
  if (documents.length === 0) return null;
  return (
    <section className="rounded-2xl border border-kampmax-border bg-white p-6 space-y-3">
      <h2 className="text-sm font-bold text-kampmax-navy">Everything you&apos;ve uploaded</h2>
      <ul className="divide-y divide-neutral-100">
        {documents.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <CheckCircle2
                className={cn("h-4 w-4 shrink-0", doc.status === "approved" ? "text-emerald-500" : "text-neutral-300")}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="truncate font-semibold text-kampmax-navy">{documentLabel(doc.type)}</p>
                <p className="truncate text-[11px] text-neutral-500">
                  {doc.filename} ·{" "}
                  {new Date(doc.submittedAt).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", STATUS_BADGE[doc.status].className)}>
              {STATUS_BADGE[doc.status].label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

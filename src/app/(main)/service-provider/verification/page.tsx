"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  getSpOnboardingDraft,
  submitSpVerification,
  uploadSpDocument,
} from "@/services/service-provider";
import type { ServiceProviderDocumentStatus } from "@/types/service-provider";

const VERIFICATION_TYPES = [
  { id: "identity", label: "Identity Verification", description: "Government-issued ID (NIN, Driver's License, Passport).", icon: BadgeCheck },
  { id: "business", label: "Business Verification", description: "Business registration (CAC certificate), if operating as a business.", icon: FileText },
  { id: "professional", label: "Professional Verification", description: "Professional licenses, certifications, or qualifications.", icon: Shield },
] as const;

const STATUS_STYLES: Record<ServiceProviderDocumentStatus, string> = {
  not_uploaded: "bg-neutral-100 text-neutral-700 border-neutral-200",
  uploading: "bg-info-100 text-info-700 border-info-200",
  uploaded: "bg-warning-100 text-warning-700 border-warning-200",
  under_review: "bg-warning-100 text-warning-700 border-warning-200",
  approved: "bg-success-100 text-success-700 border-success-200",
  rejected: "bg-error-100 text-error-700 border-error-200",
  requires_replacement: "bg-error-100 text-error-700 border-error-200",
};

const STATUS_LABELS: Record<ServiceProviderDocumentStatus, string> = {
  not_uploaded: "Not uploaded",
  uploading: "Uploading...",
  uploaded: "Uploaded - Pending review",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  requires_replacement: "Needs replacement",
};

/**
 * Service provider identity/business/professional verification — reachable
 * only from an activated profile, entirely optional (nothing on the
 * backend blocks bookings/services on verification status). This is where
 * NIN/BVN/certificate documents belong, NOT the onboarding wizard.
 */
export default function ServiceProviderVerificationPage() {
  const [draft, setDraft] = useState(getSpOnboardingDraft());
  const [selectedType, setSelectedType] = useState<(typeof VERIFICATION_TYPES)[number]["id"] | null>(
    (draft?.verification?.type as (typeof VERIFICATION_TYPES)[number]["id"] | undefined) ?? null
  );
  const [uploading, setUploading] = useState<string | null>(null);

  function refresh() {
    setDraft(getSpOnboardingDraft());
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, documentType: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(documentType);
    await new Promise((r) => setTimeout(r, 600));
    uploadSpDocument(documentType, file.name, file.size, file.type);
    setUploading(null);
    refresh();
  }

  function handleSubmitVerification() {
    if (!selectedType) return;
    submitSpVerification(selectedType);
    refresh();
  }

  const verification = draft?.verification;
  const documents = draft?.documents ?? [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/service-provider"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-kampmax-muted text-kampmax-text hover:bg-neutral-200 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-kampmax-navy">Verification</h1>
          <p className="text-xs text-kampmax-text-secondary mt-0.5">
            Optional — verified providers get a trust badge and higher visibility. You can take
            bookings without it.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-kampmax-border bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-100">
            <Shield className="h-6 w-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-kampmax-text">Verification Status</h3>
            <p className="mt-1 text-sm text-kampmax-text-secondary">
              {verification?.status === "approved" && "You're verified. Your profile shows a trust badge."}
              {verification?.status === "pending" && "Under review — this usually takes 1-3 business days."}
              {verification?.status === "action_required" && "Additional information is needed below."}
              {(!verification || verification.status === "not_required") && "Choose a verification type below to get started, whenever you're ready."}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-kampmax-text mb-4">Choose Verification Type</h3>
        <div className="space-y-3">
          {VERIFICATION_TYPES.map((type) => {
            const isSelected = selectedType === type.id;
            return (
              <button
                type="button"
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border-2 transition-all",
                  isSelected ? "border-primary-600 bg-primary-50" : "border-neutral-200 hover:border-primary-300 bg-white"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", isSelected ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-500")}>
                    <type.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-kampmax-text">{type.label}</h4>
                    <p className="mt-1 text-sm text-kampmax-text-secondary">{type.description}</p>
                  </div>
                  {isSelected && <CheckCircle className="h-5 w-5 text-primary-600 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedType && (
        <div>
          <h3 className="text-lg font-semibold text-kampmax-text mb-4">Documents</h3>
          <div className="space-y-3">
            {documents.map((doc) => {
              const status = doc.status;
              const isUploading = uploading === doc.documentType;
              return (
                <div key={doc.documentType} className={cn("rounded-lg border", STATUS_STYLES[status])}>
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {status === "approved" ? <CheckCircle className="h-4 w-4 text-success-600" /> : status === "rejected" || status === "requires_replacement" ? <XCircle className="h-4 w-4 text-error-600" /> : status === "under_review" || status === "uploaded" ? <Clock className="h-4 w-4 text-warning-600" /> : <FileText className="h-4 w-4 text-neutral-400" />}
                      <div className="min-w-0">
                        <h4 className="font-medium text-kampmax-text">{doc.label}</h4>
                        <p className="text-xs text-kampmax-text-secondary">
                          {doc.maxSizeMb}MB max • {doc.acceptedFormats.join(", ").toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", STATUS_STYLES[status])}>
                        {STATUS_LABELS[status]}
                      </span>
                      {status === "approved" || status === "under_review" ? null : (
                        <div className="relative">
                          <input
                            type="file"
                            accept={doc.acceptedFormats.map((f) => `.${f}`).join(",")}
                            onChange={(e) => handleUpload(e, doc.documentType)}
                            disabled={isUploading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Button variant={status === "uploaded" ? "ghost" : "primary"} size="sm" disabled={isUploading}>
                            {isUploading ? "Uploading..." : (
                              <span className="inline-flex items-center gap-1.5"><Upload className="h-4 w-4" /> {status === "uploaded" ? "Replace" : "Upload"}</span>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button className="mt-4 w-full sm:w-auto" onClick={handleSubmitVerification}>
            Submit for Review
          </Button>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-lg bg-neutral-50 border border-neutral-200 p-4">
        <HelpCircle className="h-5 w-5 text-neutral-500 shrink-0 mt-0.5" />
        <p className="text-sm text-neutral-700">
          Documents are encrypted and stored privately. Only Kampmax verification staff can access
          them — we never share them with other users.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  FileText,
  Upload,
  Building2,
  CreditCard,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui";
import { KycVerificationModal } from "@/components/verification/KycVerificationModal";
import {
  fetchVendorKycStatus,
  getVendorKycState,
  simulateVerificationApproval,
} from "@/services/verification";
import type { KycVerificationState } from "@/types/verification";

export default function VendorVerificationPage() {
  const [kycState, setKycState] = useState<KycVerificationState>(getVendorKycState());
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetchVendorKycStatus();
      if (res.data) setKycState(res.data);
      setLoading(false);
    }
    load();
  }, []);

  function handleRefresh() {
    setKycState({ ...getVendorKycState() });
  }

  const isVerified = kycState.status === "verified";
  const isPending = kycState.status === "pending_review";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/vendor"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-kampmax-muted text-kampmax-text hover:bg-neutral-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-kampmax-navy">
              Vendor Identity & Store Verification
            </h1>
            <p className="text-xs text-kampmax-text-secondary mt-0.5">
              Manage your NIN, BVN, banking info, and store compliance documents.
            </p>
          </div>
        </div>

        {isVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> Store Verified & Active
          </span>
        ) : isPending ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            <Clock className="h-4 w-4" /> Under Review
          </span>
        ) : (
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            Start Verification
          </Button>
        )}
      </div>

      {/* Overview Status Banner */}
      <div
        className={`rounded-2xl border p-6 ${
          isVerified
            ? "border-emerald-200 bg-emerald-50/50"
            : isPending
            ? "border-amber-200 bg-amber-50/50"
            : "border-blue-200 bg-blue-50/50"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                isVerified
                  ? "bg-emerald-100 text-emerald-600"
                  : isPending
                  ? "bg-amber-100 text-amber-600"
                  : "bg-kampmax-blue/15 text-kampmax-blue"
              }`}
            >
              {isVerified ? (
                <ShieldCheck className="h-6 w-6" />
              ) : isPending ? (
                <Clock className="h-6 w-6" />
              ) : (
                <ShieldAlert className="h-6 w-6" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-kampmax-navy">
                {isVerified
                  ? "Your Vendor Profile is Fully Verified"
                  : isPending
                  ? "Verification Application Under Review"
                  : "Complete Your Verification in 3 Simple Steps"}
              </h2>
              <p className="text-xs text-kampmax-text-secondary mt-1 leading-relaxed max-w-xl">
                {isVerified
                  ? "Your identity, NIN, BVN, and store credentials have been verified by Kampmax Compliance. Full selling and payout privileges are active."
                  : isPending
                  ? "Your NIN, BVN, and compliance documents are being processed by our compliance team. Verification is usually completed within 24 hours."
                  : "To protect the campus marketplace and enable seamless bank payouts, all vendors verify their National Identity Number (NIN), BVN, and store registration or student ID."}
              </p>
            </div>
          </div>

          {!isVerified && !isPending && (
            <Button
              variant="primary"
              className="shrink-0 w-full sm:w-auto"
              onClick={() => setModalOpen(true)}
            >
              Submit Documents
            </Button>
          )}
        </div>
      </div>

      {/* Verification Checklist */}
      <div className="rounded-2xl border border-kampmax-border bg-white p-6 space-y-6">
        <h3 className="text-sm font-bold text-kampmax-navy">
          Verification Requirements & Status
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: NIN */}
          <div className="rounded-xl border border-neutral-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-kampmax-blue">
                <CreditCard className="h-5 w-5" />
              </div>
              {kycState.ninVerified || isVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Verified
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-600">
                  {isPending ? "Pending" : "Required"}
                </span>
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold text-kampmax-navy">
                NIN Verification
              </h4>
              <p className="text-xs text-kampmax-text-secondary mt-0.5">
                11-digit National Identity Number linked to your legal name.
              </p>
            </div>
          </div>

          {/* Card 2: BVN & Bank Account */}
          <div className="rounded-xl border border-neutral-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Building2 className="h-5 w-5" />
              </div>
              {kycState.bvnVerified || isVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Verified
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-600">
                  {isPending ? "Pending" : "Required"}
                </span>
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold text-kampmax-navy">
                BVN & Payout Account
              </h4>
              <p className="text-xs text-kampmax-text-secondary mt-0.5">
                Bank account details to receive your sales payouts directly.
              </p>
            </div>
          </div>

          {/* Card 3: Documents */}
          <div className="rounded-xl border border-neutral-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <FileText className="h-5 w-5" />
              </div>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Approved
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-600">
                  {isPending ? "In Review" : "Required"}
                </span>
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold text-kampmax-navy">
                Business / Student ID
              </h4>
              <p className="text-xs text-kampmax-text-secondary mt-0.5">
                CAC certificate, Student ID card, or valid Government ID.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Attached Documents Table */}
      <div className="rounded-2xl border border-kampmax-border bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-kampmax-navy">
            Submitted KYC Documents
          </h3>
          {!isVerified && (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-kampmax-blue hover:underline"
            >
              <Upload className="h-3.5 w-3.5" /> Upload additional document
            </button>
          )}
        </div>

        {kycState.documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-xs text-neutral-400">
            No compliance documents uploaded yet. Click "Start Verification" above to upload your NIN slip and ID.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {kycState.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between py-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-neutral-400" />
                  <div>
                    <p className="font-semibold text-kampmax-navy">{doc.name}</p>
                    <p className="text-[11px] text-neutral-400">
                      Uploaded on{" "}
                      {new Date(doc.uploadedAt).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demo helper */}
      <div className="flex items-center justify-between rounded-xl bg-neutral-100 p-4 text-xs text-neutral-500">
        <span>Need to test instant active state in development?</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            simulateVerificationApproval("vendor");
            handleRefresh();
          }}
        >
          Simulate Approval
        </Button>
      </div>

      {/* Verification Modal */}
      <KycVerificationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        role="vendor"
        onSuccess={handleRefresh}
      />
    </div>
  );
}

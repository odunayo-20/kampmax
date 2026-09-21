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
  Award,
} from "lucide-react";
import { Button } from "@/components/ui";
import { KycVerificationModal } from "@/components/verification/KycVerificationModal";
import {
  fetchFreelancerKycStatus,
  getFreelancerKycState,
  simulateVerificationApproval,
} from "@/services/verification";
import type { KycVerificationState } from "@/types/verification";

export default function FreelancerVerificationPage() {
  const [kycState, setKycState] = useState<KycVerificationState>(getFreelancerKycState());
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetchFreelancerKycStatus();
      if (res.data) setKycState(res.data);
      setLoading(false);
    }
    load();
  }, []);

  function handleRefresh() {
    setKycState({ ...getFreelancerKycState() });
  }

  const isVerified = kycState.status === "verified";
  const isPending = kycState.status === "pending_review";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/freelancer/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-kampmax-muted text-kampmax-text hover:bg-neutral-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-kampmax-navy">
              Freelancer Pro Identity Verification
            </h1>
            <p className="text-xs text-kampmax-text-secondary mt-0.5">
              Verify your NIN, student credentials, and bank details to earn client trust and unlock payouts.
            </p>
          </div>
        </div>

        {isVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> Verified Pro
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
                  ? "Your Freelancer Profile is Verified"
                  : isPending
                  ? "Identity Verification Under Review"
                  : "Activate Your Profile with NIN & Student ID"}
              </h2>
              <p className="text-xs text-kampmax-text-secondary mt-1 leading-relaxed max-w-xl">
                {isVerified
                  ? "Your profile displays the Verified Freelancer Pro badge. You can submit proposals, receive job offers, and withdraw earnings directly."
                  : isPending
                  ? "Our review team is validating your NIN and student/national ID. You'll receive an in-app confirmation once active."
                  : "Completing your identity verification ensures clients can hire you with confidence and enables automatic payouts to your Nigerian bank account."}
              </p>
            </div>
          </div>

          {!isVerified && !isPending && (
            <Button
              variant="primary"
              className="shrink-0 w-full sm:w-auto"
              onClick={() => setModalOpen(true)}
            >
              Verify Profile
            </Button>
          )}
        </div>
      </div>

      {/* Verification Items */}
      <div className="rounded-2xl border border-kampmax-border bg-white p-6 space-y-6">
        <h3 className="text-sm font-bold text-kampmax-navy">
          Verification Requirements & Benefits
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                Authenticates your national identity securely with NIMC.
              </p>
            </div>
          </div>

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
                BVN & Direct Payouts
              </h4>
              <p className="text-xs text-kampmax-text-secondary mt-0.5">
                Withdraw job earnings directly to your bank account.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Award className="h-5 w-5" />
              </div>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Verified Pro
                </span>
              ) : (
                <span className="text-xs font-medium text-neutral-400">
                  Unlocked on Approval
                </span>
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold text-kampmax-navy">
                Verified Pro Badge
              </h4>
              <p className="text-xs text-kampmax-text-secondary mt-0.5">
                Gain 3x more proposal acceptance with high client trust.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo helper */}
      <div className="flex items-center justify-between rounded-xl bg-neutral-100 p-4 text-xs text-neutral-500">
        <span>Testing in development?</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            simulateVerificationApproval("freelancer");
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
        role="freelancer"
        onSuccess={handleRefresh}
      />
    </div>
  );
}

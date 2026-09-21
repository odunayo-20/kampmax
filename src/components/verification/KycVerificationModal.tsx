"use client";

import { useState } from "react";
import { X, ShieldCheck, Upload, CheckCircle2, AlertCircle, Building2, CreditCard, FileText } from "lucide-react";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import {
  submitVendorKycVerification,
  submitFreelancerKycVerification,
  simulateVerificationApproval,
} from "@/services/verification";
import type { KycDocumentType, SubmitVerificationDto } from "@/types/verification";

interface KycVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: "vendor" | "freelancer";
  onSuccess?: () => void;
}

export function KycVerificationModal({
  isOpen,
  onClose,
  role,
  onSuccess,
}: KycVerificationModalProps) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form states
  const [nin, setNin] = useState("");
  const [fullName, setFullName] = useState("");
  const [bvn, setBvn] = useState("");
  const [bankCode, setBankCode] = useState("058"); // GTBank default
  const [accountNumber, setAccountNumber] = useState("");
  const [documentType, setDocumentType] = useState<KycDocumentType>(
    role === "vendor" ? "CAC_DOCUMENT" : "STUDENT_ID"
  );
  const [documentFileName, setDocumentFileName] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  function validateStep1(): boolean {
    const errs: Record<string, string> = {};
    if (!nin.trim() || nin.trim().length !== 11 || !/^\d+$/.test(nin.trim())) {
      errs.nin = "NIN must be exactly 11 digits";
    }
    if (!fullName.trim() || fullName.trim().length < 3) {
      errs.fullName = "Please enter your full legal name as on your NIN slip";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    const errs: Record<string, string> = {};
    if (!bvn.trim() || bvn.trim().length !== 11 || !/^\d+$/.test(bvn.trim())) {
      errs.bvn = "BVN must be exactly 11 digits";
    }
    if (!accountNumber.trim() || accountNumber.trim().length !== 10 || !/^\d+$/.test(accountNumber.trim())) {
      errs.accountNumber = "Account number must be exactly 10 digits";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErrors({});

    const payload: SubmitVerificationDto = {
      nin: nin.trim(),
      bvn: bvn.trim(),
      bankCode,
      accountNumber: accountNumber.trim(),
      accountName: fullName.trim(),
      documents: [
        {
          type: "NIN_SLIP",
          name: "National Identification Number Slip",
          url: "https://kampmax-docs.s3.amazonaws.com/uploads/nin-verified.pdf",
        },
        {
          type: documentType,
          name: documentFileName || `${documentType.replace(/_/g, " ")} Document`,
          url: "https://kampmax-docs.s3.amazonaws.com/uploads/id-document.pdf",
        },
      ],
    };

    try {
      if (role === "vendor") {
        await submitVendorKycVerification(payload);
      } else {
        await submitFreelancerKycVerification(payload);
      }
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch {
      setErrors({ general: "Submission failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  function handleInstantDemoApprove() {
    simulateVerificationApproval(role);
    setSubmitted(true);
    if (onSuccess) onSuccess();
    setTimeout(() => onClose(), 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-kampmax-navy/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-kampmax-navy">
              Verification Submitted!
            </h2>
            <p className="text-sm text-kampmax-text-secondary max-w-sm mx-auto">
              Your NIN, BVN, and verification documents have been securely transmitted to our compliance desk. You will be notified as soon as your account is activated.
            </p>
            <div className="pt-4">
              <Button
                variant="primary"
                onClick={onClose}
                className="w-full sm:w-auto px-8"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 text-kampmax-blue mb-1">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Identity & Compliance Verification
                </span>
              </div>
              <h2 className="text-xl font-bold text-kampmax-navy">
                {role === "vendor" ? "Verify Vendor Store" : "Verify Freelancer Profile"}
              </h2>
              <p className="text-xs text-kampmax-text-secondary mt-1">
                Required to enable payouts, public store badging, and full account activation.
              </p>
            </div>

            {/* Stepper Header */}
            <div className="flex items-center justify-between border-y border-neutral-100 py-3">
              {[
                { step: 1, label: "1. NIN Verification" },
                { step: 2, label: "2. BVN & Bank" },
                { step: 3, label: "3. Document Upload" },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`text-xs font-semibold ${
                    activeStep === s.step
                      ? "text-kampmax-blue border-b-2 border-kampmax-blue pb-1 -mb-3"
                      : activeStep > s.step
                      ? "text-emerald-600"
                      : "text-neutral-400"
                  }`}
                >
                  {s.label}
                </div>
              ))}
            </div>

            {/* Error banner */}
            {errors.general && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors.general}</span>
              </div>
            )}

            {/* STEP 1: NIN Verification */}
            {activeStep === 1 && (
              <div className="space-y-4">
                <Input
                  label="National Identity Number (NIN)"
                  placeholder="11-digit NIN (e.g. 12345678901)"
                  maxLength={11}
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))}
                  error={errors.nin}
                  leftIcon={<CreditCard className="h-4 w-4" />}
                />
                <Input
                  label="Full Name on NIN Slip"
                  placeholder="Firstname Middlename Lastname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  error={errors.fullName}
                  leftIcon={<Building2 className="h-4 w-4" />}
                />
                <div className="rounded-lg bg-neutral-50 p-3 text-[11px] text-neutral-500 leading-relaxed">
                  Your NIN is securely verified via government identity integration. It is never stored as plain text or shared with buyers.
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (validateStep1()) setActiveStep(2);
                    }}
                  >
                    Continue to BVN & Bank
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: BVN & Bank Details */}
            {activeStep === 2 && (
              <div className="space-y-4">
                <Input
                  label="Bank Verification Number (BVN)"
                  placeholder="11-digit BVN"
                  maxLength={11}
                  value={bvn}
                  onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))}
                  error={errors.bvn}
                  leftIcon={<CreditCard className="h-4 w-4" />}
                />
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-kampmax-navy">
                    Payout Bank
                  </label>
                  <select
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 p-2.5 text-sm focus:border-kampmax-blue focus:outline-none"
                  >
                    <option value="058">Guaranty Trust Bank (GTBank)</option>
                    <option value="044">Access Bank</option>
                    <option value="033">United Bank for Africa (UBA)</option>
                    <option value="011">First Bank of Nigeria</option>
                    <option value="057">Zenith Bank</option>
                    <option value="035">Wema Bank / ALAT</option>
                    <option value="999">OPay / PalmPay</option>
                  </select>
                </div>
                <Input
                  label="Account Number (10 Digits)"
                  placeholder="0123456789"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  error={errors.accountNumber}
                />
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setActiveStep(1)}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (validateStep2()) setActiveStep(3);
                    }}
                  >
                    Continue to Documents
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Document Uploads */}
            {activeStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-kampmax-navy">
                    Document Type
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as KycDocumentType)}
                    className="w-full rounded-lg border border-neutral-300 p-2.5 text-sm focus:border-kampmax-blue focus:outline-none"
                  >
                    {role === "vendor" ? (
                      <>
                        <option value="CAC_DOCUMENT">CAC Business Certificate / Registration</option>
                        <option value="STUDENT_ID">Campus Student ID Card</option>
                        <option value="NATIONAL_ID">National ID Card / NIMC Slip</option>
                        <option value="PROOF_OF_ADDRESS">Utility Bill / Proof of Address</option>
                      </>
                    ) : (
                      <>
                        <option value="STUDENT_ID">Campus Student ID Card</option>
                        <option value="NATIONAL_ID">National ID Card / NIMC Slip</option>
                        <option value="CERTIFICATE">Skill / Professional Certificate</option>
                        <option value="PASSPORT">International Passport</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="rounded-xl border-2 border-dashed border-neutral-300 p-6 text-center hover:border-kampmax-blue transition-colors cursor-pointer bg-neutral-50/50">
                  <Upload className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
                  <p className="text-xs font-semibold text-kampmax-navy">
                    {documentFileName || "Click to upload document (PDF, JPG, PNG)"}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Max file size: 5MB
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setDocumentFileName(e.target.files[0].name);
                      }
                    }}
                    className="hidden"
                    id="kyc-doc-file"
                  />
                  <label
                    htmlFor="kyc-doc-file"
                    className="mt-3 inline-block rounded-lg bg-white border border-neutral-200 px-3 py-1.5 text-xs font-medium text-kampmax-navy cursor-pointer hover:bg-neutral-100"
                  >
                    Select File
                  </label>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setActiveStep(2)}>
                    Back
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleInstantDemoApprove}
                      className="text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      Instant Approve (Demo)
                    </Button>
                    <Button
                      variant="primary"
                      disabled={submitting}
                      onClick={handleSubmit}
                    >
                      {submitting ? "Submitting..." : "Submit Verification"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

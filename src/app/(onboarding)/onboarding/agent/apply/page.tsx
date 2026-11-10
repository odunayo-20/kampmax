"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ArrowLeft,
  Upload,
  CheckCircle,
  ShieldCheck,
  FileText,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  useAccommodationAgentStatus,
  useApplyAsAccommodationAgent,
  useUploadAccommodationDocument,
} from "@/hooks/use-accommodation";
import type { AgentDocumentType } from "@/types/accommodation";

interface QueuedDoc {
  file: File;
  type: AgentDocumentType;
  label: string;
}

export default function AgentApplyPage() {
  const router = useRouter();
  const { user, status: authStatus } = useAuth();
  const statusQuery = useAccommodationAgentStatus();
  const applyMutation = useApplyAsAccommodationAgent();
  const uploadMutation = useUploadAccommodationDocument();

  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [operatingLocation, setOperatingLocation] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [acceptedAgreement, setAcceptedAgreement] = useState(false);

  // Document Uploads
  const [queuedDocs, setQueuedDocs] = useState<QueuedDoc[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Pre-fill user data
  useEffect(() => {
    if (user) {
      setFullName((curr) => curr || user.name || "");
      setPhone((curr) => curr || user.phone || "");
      setEmail((curr) => curr || user.email || "");
    }
  }, [user]);

  // Gatekeeping
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace(`/login?returnTo=${encodeURIComponent("/onboarding/agent/apply")}`);
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (statusQuery.data?.status === "APPROVED") {
      router.replace("/agent");
    } else if (statusQuery.data?.applied && statusQuery.data?.status === "PENDING") {
      router.replace("/onboarding/agent/submitted");
    }
  }, [statusQuery.data, router]);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>, type: AgentDocumentType, label: string) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5 MB. Please choose a smaller file.");
        return;
      }
      setQueuedDocs((prev) => [...prev.filter((d) => d.type !== type), { file, type, label }]);
      e.target.value = "";
    }
  }

  function removeQueuedDoc(type: AgentDocumentType) {
    setQueuedDocs((prev) => prev.filter((d) => d.type !== type));
  }

  async function handleFinalSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // 1. Submit Agent Profile
      await applyMutation.mutateAsync({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        operatingLocation: operatingLocation.trim(),
        agencyName: agencyName.trim() || undefined,
        businessAddress: businessAddress.trim() || undefined,
        acceptAgreement: true,
      });

      // 2. Upload any queued documents
      for (const doc of queuedDocs) {
        try {
          await uploadMutation.mutateAsync({
            file: doc.file,
            documentType: doc.type,
          });
        } catch (docErr) {
          console.warn(`Doc upload warning for ${doc.type}:`, docErr);
        }
      }

      // 3. Navigate to Submitted screen
      router.replace("/onboarding/agent/submitted");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Application submission failed.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-kampmax-bg px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/onboarding/agent"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-kampmax-text-secondary hover:text-kampmax-text mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to overview</span>
        </Link>

        {/* Header */}
        <div className="border-b border-kampmax-border pb-6">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-kampmax-blue">
            <Building2 className="h-4 w-4" />
            <span>Agent Application</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-kampmax-text sm:text-3xl">
            Apply to Become an Accommodation Agent
          </h1>
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            Provide your operating locations and credentials. Our team will verify your account to unlock publishing.
          </p>

          {/* Stepper indicator */}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                step === 1 ? "bg-kampmax-blue text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              <span>1</span>
              <span>Profile & Contact</span>
            </button>
            <span className="text-neutral-300">/</span>
            <button
              type="button"
              onClick={() => {
                if (fullName && phone && email && operatingLocation && acceptedAgreement) {
                  setStep(2);
                }
              }}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                step === 2 ? "bg-kampmax-blue text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              <span>2</span>
              <span>Verification Documents</span>
            </button>
          </div>
        </div>

        {/* Step 1: Profile & Contact */}
        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(2);
            }}
            className="mt-6 space-y-4 rounded-2xl border border-kampmax-border bg-white p-6 shadow-xs"
          >
            <h2 className="text-base font-bold text-kampmax-text">Contact & Operating Details</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-kampmax-text">
                Full Legal Name *
                <input
                  required
                  placeholder="As shown on your ID card"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
                />
              </label>

              <label className="text-xs font-semibold text-kampmax-text">
                Operating Campus / Town *
                <input
                  required
                  placeholder="e.g. UNILAG (Akoka / Yaba / Bariga)"
                  value={operatingLocation}
                  onChange={(e) => setOperatingLocation(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
                />
              </label>

              <label className="text-xs font-semibold text-kampmax-text">
                Phone Number *
                <input
                  required
                  type="tel"
                  placeholder="08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
                />
              </label>

              <label className="text-xs font-semibold text-kampmax-text">
                Email Address *
                <input
                  required
                  type="email"
                  placeholder="agent@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
                />
              </label>

              <label className="text-xs font-semibold text-kampmax-text sm:col-span-2">
                Agency / Property Brand Name (Optional)
                <input
                  placeholder="e.g. TrustHaven Real Estate"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
                />
              </label>

              <label className="text-xs font-semibold text-kampmax-text sm:col-span-2">
                Physical Office Address (Optional)
                <input
                  placeholder="e.g. 14 Commercial Avenue, Yaba, Lagos"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
                />
              </label>
            </div>

            <div className="border-t border-kampmax-border pt-4">
              <label className="flex items-start gap-2.5 text-xs text-kampmax-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={acceptedAgreement}
                  onChange={(e) => setAcceptedAgreement(e.target.checked)}
                  className="mt-0.5 rounded border-neutral-300 text-kampmax-blue focus:ring-kampmax-blue"
                />
                <span>
                  I accept the Kampmax Accommodation Agent Agreement, confirming that all listings I advertise are genuine, accurately described, and authorized by property owners.
                </span>
              </label>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={!acceptedAgreement || !fullName || !phone || !email || !operatingLocation}
                className="rounded-xl bg-kampmax-blue px-6 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-kampmax-blue/90 disabled:opacity-50"
              >
                Continue to Documents →
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Verification Documents */}
        {step === 2 && (
          <form onSubmit={handleFinalSubmit} className="mt-6 space-y-6">
            <div className="rounded-2xl border border-kampmax-border bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2 border-b border-kampmax-border pb-4">
                <ShieldCheck className="h-5 w-5 text-kampmax-blue" />
                <div>
                  <h2 className="text-base font-bold text-kampmax-text">Upload Verification Documents</h2>
                  <p className="text-xs text-kampmax-text-secondary">
                    Files are stored securely and reviewed only by the Kampmax Trust & Safety team.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {/* 1. Identity */}
                <div className="rounded-xl border border-kampmax-border bg-neutral-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-kampmax-text">
                        1. Government-Issued ID *
                      </p>
                      <p className="mt-0.5 text-[11px] text-kampmax-text-secondary">
                        NIN Slip, Driver&apos;s License, International Passport, or Voter&apos;s Card (PDF/JPEG/PNG, max 5 MB).
                      </p>
                    </div>

                    {queuedDocs.some((d) => d.type === "IDENTITY") ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Ready</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeQueuedDoc("IDENTITY")}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-kampmax-border bg-white px-3 py-1.5 text-xs font-semibold text-kampmax-blue hover:bg-neutral-50">
                        <Upload className="h-3 w-3" />
                        <span>Select File</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                          onChange={(e) => handleFileSelected(e, "IDENTITY", "Government ID")}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* 2. Authority / Ownership */}
                <div className="rounded-xl border border-kampmax-border bg-neutral-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-kampmax-text">
                        2. Proof of Authority to Lease / Ownership *
                      </p>
                      <p className="mt-0.5 text-[11px] text-kampmax-text-secondary">
                        Written authorization letter from the landlord or title deed/C of O.
                      </p>
                    </div>

                    {queuedDocs.some((d) => d.type === "AUTHORIZATION_LETTER" || d.type === "OWNERSHIP_PROOF") ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Ready</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            removeQueuedDoc("AUTHORIZATION_LETTER");
                            removeQueuedDoc("OWNERSHIP_PROOF");
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-kampmax-border bg-white px-3 py-1.5 text-xs font-semibold text-kampmax-blue hover:bg-neutral-50">
                        <Upload className="h-3 w-3" />
                        <span>Select File</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                          onChange={(e) => handleFileSelected(e, "AUTHORIZATION_LETTER", "Letter of Authorization")}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* 3. Business / CAC */}
                <div className="rounded-xl border border-kampmax-border bg-neutral-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-kampmax-text">
                        3. Business Registration (Optional for Agencies)
                      </p>
                      <p className="mt-0.5 text-[11px] text-kampmax-text-secondary">
                        CAC Certificate of Incorporation or Business Name Registration.
                      </p>
                    </div>

                    {queuedDocs.some((d) => d.type === "BUSINESS_REGISTRATION") ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Ready</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeQueuedDoc("BUSINESS_REGISTRATION")}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-kampmax-border bg-white px-3 py-1.5 text-xs font-semibold text-kampmax-text hover:bg-neutral-50">
                        <Upload className="h-3 w-3" />
                        <span>Select File</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                          onChange={(e) => handleFileSelected(e, "BUSINESS_REGISTRATION", "CAC Registration")}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {submitError && (
                <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 font-medium">
                  {submitError}
                </p>
              )}

              <div className="mt-6 flex items-center justify-between border-t border-kampmax-border pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-kampmax-border px-4 py-2 text-xs font-semibold text-kampmax-text hover:bg-neutral-50"
                >
                  ← Back to Profile
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-kampmax-blue px-6 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-kampmax-blue/90 disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting Application…" : "Submit Agent Application"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


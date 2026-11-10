"use client";

import { ShieldCheck, Upload, Trash2, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import {
  useAccommodationAgentProfile,
  useAccommodationAgentStatus,
  useUploadAccommodationDocument,
  useRemoveAccommodationDocument,
} from "@/hooks/use-accommodation";
import {
  AGENT_DOCUMENT_TYPE_LABELS,
  AGENT_STATUS_LABELS,
  missingForApproval,
  type AgentDocumentType,
} from "@/types/accommodation";
import { AgentStatusBadge } from "@/components/agent/AgentStatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";

const DOCUMENT_TYPES: AgentDocumentType[] = [
  "IDENTITY",
  "OWNERSHIP_PROOF",
  "AUTHORIZATION_LETTER",
  "BUSINESS_REGISTRATION",
  "OTHER",
];

export default function AgentVerificationPage() {
  const statusQuery = useAccommodationAgentStatus();
  const profileQuery = useAccommodationAgentProfile(Boolean(statusQuery.data?.applied));
  const upload = useUploadAccommodationDocument();
  const removeDocument = useRemoveAccommodationDocument();

  const agent = profileQuery.data;
  const status = statusQuery.data?.status ?? "PENDING";
  const missing = agent ? missingForApproval(agent.documents) : [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-kampmax-blue" />
          <h1 className="text-2xl font-bold tracking-tight text-kampmax-text">
            KYC & Document Verification
          </h1>
        </div>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Upload and manage your credentials. Verified agents earn high trust and featured placement across campus housing.
        </p>
      </div>

      {/* Verification Status Card */}
      <section className="rounded-2xl border border-kampmax-border bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-kampmax-text">Current Account Status</h2>
            <p className="text-xs text-kampmax-text-secondary">
              Review process typically completes within 24 to 48 hours.
            </p>
          </div>
          <AgentStatusBadge status={status} />
        </div>

        {agent?.infoRequest && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            <strong>Administrator Note:</strong> {agent.infoRequest}
          </div>
        )}

        {status === "PENDING" && missing.length > 0 && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
            <strong>Still Required for Full Verification:</strong> {missing.join(" and ")}.
          </div>
        )}
      </section>

      {/* Uploaded Documents List */}
      <section className="rounded-2xl border border-kampmax-border bg-white p-6 shadow-xs">
        <h2 className="text-base font-bold text-kampmax-text">Submitted Documents</h2>
        <p className="mt-0.5 text-xs text-kampmax-text-secondary">
          Private documents visible only to you and the Kampmax verification team.
        </p>

        <div className="mt-4">
          {profileQuery.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : !agent?.documents.length ? (
            <div className="rounded-xl border border-dashed border-kampmax-border p-8 text-center text-xs text-kampmax-text-secondary">
              No documents uploaded yet. Upload your government ID and authority documents below.
            </div>
          ) : (
            <div className="divide-y divide-kampmax-border">
              {agent.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-kampmax-text">
                        {AGENT_DOCUMENT_TYPE_LABELS[doc.documentType]}
                      </p>
                      <p className="text-[11px] text-kampmax-text-secondary">
                        {doc.originalFilename || "Uploaded file"} ·{" "}
                        <span
                          className={`font-semibold ${
                            doc.status === "ACCEPTED"
                              ? "text-emerald-600"
                              : doc.status === "REJECTED"
                              ? "text-red-600"
                              : "text-amber-600"
                          }`}
                        >
                          {doc.status.toLowerCase()}
                        </span>
                        {doc.rejectionReason && ` (${doc.rejectionReason})`}
                      </p>
                    </div>
                  </div>

                  {doc.status !== "ACCEPTED" && (
                    <button
                      type="button"
                      disabled={removeDocument.isPending}
                      onClick={() => removeDocument.mutate(doc.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {removeDocument.error && (
          <p role="alert" className="mt-3 text-xs text-red-600 font-medium">
            {removeDocument.error.message}
          </p>
        )}
      </section>

      {/* Document Upload Grid */}
      <section className="rounded-2xl border border-kampmax-border bg-white p-6 shadow-xs">
        <h2 className="text-base font-bold text-kampmax-text">Upload Documents</h2>
        <p className="mt-0.5 text-xs text-kampmax-text-secondary">
          Accepted formats: PDF, JPEG, PNG (up to 5 MB per file).
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {DOCUMENT_TYPES.map((type) => (
            <div
              key={type}
              className="rounded-xl border border-kampmax-border bg-neutral-50/60 p-4 transition-colors hover:border-kampmax-blue/40"
            >
              <p className="font-bold text-xs text-kampmax-text">
                {AGENT_DOCUMENT_TYPE_LABELS[type]}
              </p>
              <p className="mt-1 text-[11px] text-kampmax-text-secondary">
                {type === "IDENTITY" && "NIN slip, Driver's License, International Passport, or Voter's Card"}
                {type === "OWNERSHIP_PROOF" && "C of O, Deed of Assignment, or Land receipt"}
                {type === "AUTHORIZATION_LETTER" && "Letter of authority signed by the landlord/property owner"}
                {type === "BUSINESS_REGISTRATION" && "CAC Certificate of Incorporation / Business Name"}
                {type === "OTHER" && "Any other supporting verification documentation"}
              </p>

              <label className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-kampmax-border bg-white px-3 py-2 text-xs font-semibold text-kampmax-text shadow-2xs hover:bg-neutral-50">
                <Upload className="h-3.5 w-3.5 text-kampmax-blue" />
                <span>Upload Document</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  disabled={upload.isPending || (agent && agent.documents.length >= 10)}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      upload.mutate(
                        { file, documentType: type },
                        {
                          onSuccess: () => {
                            e.target.value = "";
                          },
                        }
                      );
                    }
                  }}
                  className="sr-only"
                />
              </label>
            </div>
          ))}
        </div>

        {upload.error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {upload.error.message}
          </p>
        )}
      </section>
    </div>
  );
}


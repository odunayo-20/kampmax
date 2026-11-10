"use client";

import Link from "next/link";
import {
  AGENT_DOCUMENT_TYPE_LABELS,
  AGENT_STATUS_LABELS,
  missingForApproval,
  type AgentDocumentType,
} from "@/types/accommodation";
import {
  useAccommodationAgentProfile,
  useAccommodationAgentStatus,
  useApplyAsAccommodationAgent,
  useRemoveAccommodationDocument,
  useUploadAccommodationDocument,
} from "@/hooks/use-accommodation";
import { ApplyForm } from "@/components/accommodation/AccommodationAgentDashboard";

const REQUIRED_DOCUMENT_TYPES: AgentDocumentType[] = [
  "IDENTITY",
  "OWNERSHIP_PROOF",
  "AUTHORIZATION_LETTER",
];
const OPTIONAL_DOCUMENT_TYPES: AgentDocumentType[] = [
  "BUSINESS_REGISTRATION",
  "OTHER",
];

function Step({
  number,
  title,
  complete,
  children,
}: {
  number: number;
  title: string;
  complete: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-kampmax-border bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            complete
              ? "bg-emerald-100 text-emerald-800"
              : "bg-kampmax-bg text-kampmax-text-secondary"
          }`}
        >
          {complete ? "✓" : number}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{title}</h2>
          {children}
        </div>
      </div>
    </section>
  );
}

export function AccommodationAgentOnboarding() {
  const status = useAccommodationAgentStatus();
  const profile = useAccommodationAgentProfile(Boolean(status.data?.applied));
  const upload = useUploadAccommodationDocument();
  const removeDocument = useRemoveAccommodationDocument();

  if (status.isPending) {
    return <main className="mx-auto max-w-3xl px-4 py-10"><div className="h-52 animate-pulse rounded-xl bg-kampmax-muted" /></main>;
  }
  if (status.isError) {
    return <main className="mx-auto max-w-3xl px-4 py-10"><p role="alert" className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700">Could not check your agent application: {status.error.message}</p></main>;
  }
  if (!status.data.applied) {
    return (
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
        <div>
          <p className="text-sm font-semibold text-kampmax-blue">Accommodation agent onboarding</p>
          <h1 className="mt-1 text-3xl font-bold">Apply to become an agent</h1>
          <p className="mt-2 text-sm text-kampmax-text-secondary">
            Start with your contact and operating details. Once the application is created, upload
            your identity and property-authority documents for review.
          </p>
        </div>
        <Step number={1} title="Agent profile" complete={false}>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            Tell us how to contact you and where you operate.
          </p>
        </Step>
        <ApplyForm />
      </main>
    );
  }
  if (profile.isPending) {
    return <main className="mx-auto max-w-3xl px-4 py-10"><div className="h-52 animate-pulse rounded-xl bg-kampmax-muted" /></main>;
  }
  if (profile.isError) {
    return <main className="mx-auto max-w-3xl px-4 py-10"><p role="alert" className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700">Could not load your agent profile: {profile.error.message}</p></main>;
  }

  const agent = profile.data;
  const missing = missingForApproval(agent.documents);
  const profileComplete = Boolean(agent.fullName && agent.email && agent.phone && agent.operatingLocation);
  const documentsComplete = missing.length === 0;
  const canUpload = agent.status !== "REVOKED" && agent.documents.length < 10;

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm font-semibold text-kampmax-blue">Accommodation agent onboarding</p>
        <h1 className="mt-1 text-3xl font-bold">Application checklist</h1>
        <p className="mt-2 text-sm text-kampmax-text-secondary">
          Your application status is <strong>{AGENT_STATUS_LABELS[agent.status]}</strong>. Keep this page
          handy to respond to document requests and track the review.
        </p>
      </div>

      <Step number={1} title="Agent profile submitted" complete={profileComplete}>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          {agent.fullName} · {agent.operatingLocation}
        </p>
        {agent.infoRequest && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Information requested: {agent.infoRequest}
          </p>
        )}
        {agent.rejectionReason && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            Previous decision: {agent.rejectionReason}
          </p>
        )}
      </Step>

      <Step number={2} title="Upload verification documents" complete={documentsComplete}>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          PDF, JPEG or PNG files up to 5 MB. Upload identity and either proof of ownership or a
          letter of authorization. Other files are optional.
        </p>
        {missing.length > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Still needed for approval: {missing.join(" and ")}.
          </p>
        )}
        <div className="mt-4 divide-y divide-kampmax-border">
          {agent.documents.map((document) => (
            <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium">{AGENT_DOCUMENT_TYPE_LABELS[document.documentType]}</p>
                <p className="text-xs text-kampmax-text-secondary">
                  {document.originalFilename || "Uploaded file"} · {document.status.toLowerCase()}
                  {document.rejectionReason ? ` · ${document.rejectionReason}` : ""}
                </p>
              </div>
              {document.status !== "ACCEPTED" && (
                <button
                  type="button"
                  disabled={removeDocument.isPending}
                  onClick={() => removeDocument.mutate(document.id)}
                  className="text-xs text-red-700 underline disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {agent.documents.length === 0 && (
            <p className="py-3 text-sm text-kampmax-text-secondary">No documents uploaded yet.</p>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[...REQUIRED_DOCUMENT_TYPES, ...OPTIONAL_DOCUMENT_TYPES].map((documentType) => (
            <label key={documentType} className="text-xs font-medium text-kampmax-text-secondary">
              Upload {AGENT_DOCUMENT_TYPE_LABELS[documentType]}
              {OPTIONAL_DOCUMENT_TYPES.includes(documentType) && " (optional)"}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                disabled={upload.isPending || !canUpload}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) upload.mutate({ file, documentType }, { onSuccess: () => { event.target.value = ""; } });
                }}
                className="mt-1 block w-full text-xs"
              />
            </label>
          ))}
        </div>
        {upload.error && <p role="alert" className="mt-2 text-sm text-red-700">{upload.error.message}</p>}
        {removeDocument.error && <p role="alert" className="mt-2 text-sm text-red-700">{removeDocument.error.message}</p>}
      </Step>

      <Step
        number={3}
        title={agent.status === "APPROVED" ? "Agent approved" : "Application review"}
        complete={agent.status === "APPROVED"}
      >
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          {agent.status === "APPROVED"
            ? "Your agent tools are ready. You can now manage properties, listings, enquiries and billing."
            : agent.status === "REJECTED"
              ? "Update your application details and documents, then reapply for review."
              : agent.status === "SUSPENDED" || agent.status === "REVOKED"
                ? "Your workspace is restricted. Contact Kampmax support if you need help."
                : documentsComplete
                  ? "Your documents are on file. The review team will update your status here."
                  : "Upload the required documents to complete your application for review."}
        </p>
        {agent.status === "REJECTED" && <div className="mt-4"><ApplyForm initial={agent} /></div>}
        {agent.status === "APPROVED" && (
          <Link
            href="/accommodation/agent"
            className="mt-4 inline-flex rounded-lg bg-kampmax-blue px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Open agent workspace
          </Link>
        )}
      </Step>
    </main>
  );
}

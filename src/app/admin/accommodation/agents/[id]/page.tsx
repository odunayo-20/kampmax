"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, CircleAlert, FileText, Info } from "lucide-react";
import { cn, formatDate, formatDateTime, timeAgo } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DocumentViewerDialog } from "@/components/admin/accommodation/DocumentViewerDialog";
import {
  AgentStatusBadge,
  DocumentStatusBadge,
  ModerationBadge,
  PublicationBadge,
} from "@/components/admin/accommodation/status-badges";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { Pagination } from "@/components/admin/Pagination";
import {
  useAdminAgent,
  useAdminAgentListings,
  useApproveAgent,
  useRejectAgent,
  useRequestAgentInfo,
  useRestoreAgent,
  useReviewAgentDocument,
  useRevokeAgent,
  useSuspendAgent,
} from "@/hooks/admin/use-admin-accommodation";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { canAdminPerform } from "@/lib/admin/permissions";
import { accommodationService } from "@/services/admin";
import {
  AGENT_DOCUMENT_TYPE_LABELS,
  missingForApproval,
  type AgentDocument,
} from "@/types/accommodation";

const buttonClass =
  "inline-flex h-8 items-center rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-50";
const primaryClass =
  "inline-flex h-8 items-center rounded-md bg-kampmax-blue px-3 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50";

type Decision =
  | { kind: "reject" | "suspend" | "revoke" | "request-info" }
  | { kind: "reject-document"; document: AgentDocument };

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-kampmax-text-secondary">{label}</dt>
      <dd className="mt-0.5 text-sm text-kampmax-text">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

export default function AdminAccommodationAgentPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { admin } = useAdminSession();
  const canReview = admin ? canAdminPerform(admin, "accommodation", "reviewAgents") : false;

  const { data: agent, isPending, isError, refetch } = useAdminAgent(id);
  const [listingPage, setListingPage] = useState(1);
  const listings = useAdminAgentListings(id, listingPage);

  const approve = useApproveAgent();
  const reject = useRejectAgent();
  const requestInfo = useRequestAgentInfo();
  const suspend = useSuspendAgent();
  const restore = useRestoreAgent();
  const revoke = useRevokeAgent();
  const reviewDocument = useReviewAgentDocument();
  const busy =
    approve.isPending ||
    reject.isPending ||
    requestInfo.isPending ||
    suspend.isPending ||
    restore.isPending ||
    revoke.isPending ||
    reviewDocument.isPending;

  const [decision, setDecision] = useState<Decision | null>(null);
  const [viewing, setViewing] = useState<AgentDocument | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  }

  if (isPending) {
    return (
      <div className="p-4">
        <LoadingSkeleton variant="table" rows={6} />
      </div>
    );
  }
  if (isError || !agent) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const missing = missingForApproval(agent.documents);
  const dialog = (() => {
    switch (decision?.kind) {
      case "reject":
        return {
          title: "Reject this application?",
          message: "The applicant is told why. They can apply again after fixing it.",
          confirmLabel: "Reject application",
          tone: "warning" as const,
          reasonLabel: "Reason shown to the applicant",
          loading: reject.isPending,
          go: (reason: string) => reject.mutateAsync({ id, reason }),
        };
      case "request-info":
        return {
          title: "Ask for more documents",
          message: "The applicant is notified and can upload more files. The application stays pending.",
          confirmLabel: "Send request",
          tone: "default" as const,
          reasonLabel: "What do you need from them?",
          loading: requestInfo.isPending,
          go: (reason: string) => requestInfo.mutateAsync({ id, message: reason }),
        };
      case "suspend":
        return {
          title: "Suspend this agent?",
          message: "They cannot publish or renew listings, and their listings stop showing on the site. You can restore them later.",
          confirmLabel: "Suspend agent",
          tone: "warning" as const,
          reasonLabel: "Reason (the agent sees this)",
          loading: suspend.isPending,
          go: (reason: string) => suspend.mutateAsync({ id, reason }),
        };
      case "revoke":
        return {
          title: "Remove this agent's privileges?",
          message: "This cannot be undone from here. Use suspend if you only want to pause them.",
          confirmLabel: "Revoke privileges",
          tone: "danger" as const,
          reasonLabel: "Reason (the agent sees this)",
          loading: revoke.isPending,
          go: (reason: string) => revoke.mutateAsync({ id, reason }),
        };
      case "reject-document":
        return {
          title: "Reject this document?",
          message: `${AGENT_DOCUMENT_TYPE_LABELS[decision.document.documentType]} will not count toward approval. The applicant can upload another.`,
          confirmLabel: "Reject document",
          tone: "warning" as const,
          reasonLabel: "What is wrong with it?",
          loading: reviewDocument.isPending,
          go: (reason: string) =>
            reviewDocument.mutateAsync({
              agentId: id,
              documentId: decision.document.id,
              decision: "REJECTED",
              reason,
            }),
        };
      default:
        return null;
    }
  })();

  return (
    <>
      <Link
        href="/admin/accommodation/agents"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-kampmax-text-secondary transition-colors hover:text-kampmax-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        All agents
      </Link>

      <AdminPageHeader
        title={agent.fullName}
        description={`${agent.agencyName ? `${agent.agencyName} · ` : ""}${agent.operatingLocation} · applied ${formatDate(agent.createdAt)}`}
        actions={<AgentStatusBadge status={agent.status} />}
      />

      {actionError && (
        <p role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {agent.status === "PENDING" && agent.infoRequest && (
        <p className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            <span className="font-medium">You asked for more documents:</span> {agent.infoRequest}
          </span>
        </p>
      )}
      {agent.status === "REJECTED" && agent.rejectionReason && (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="font-medium">Rejected:</span> {agent.rejectionReason}
        </p>
      )}
      {(agent.status === "SUSPENDED" || agent.status === "REVOKED") && agent.suspensionReason && (
        <p className="mb-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
          <span className="font-medium">{agent.status === "REVOKED" ? "Revoked" : "Suspended"}:</span>{" "}
          {agent.suspensionReason}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section aria-label="Applicant" className="rounded-lg border border-kampmax-border bg-white p-4 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-kampmax-text">Applicant</h2>
          <dl className="grid grid-cols-1 gap-3">
            <Field label="Full name" value={agent.fullName} />
            <Field label="Email" value={agent.email} />
            <Field label="Phone" value={agent.phone} />
            <Field label="Works in" value={agent.operatingLocation} />
            <Field label="Agency" value={agent.agencyName} />
            <Field label="Business address" value={agent.businessAddress} />
            {agent.approvedAt && <Field label="Approved" value={formatDateTime(agent.approvedAt)} />}
          </dl>
        </section>

        <section aria-label="Documents" className="rounded-lg border border-kampmax-border bg-white p-4 lg:col-span-2">
          <h2 className="mb-1 text-sm font-semibold text-kampmax-text">Verification documents</h2>
          <p className="mb-3 text-xs text-kampmax-text-secondary">
            Private files. Opening one is recorded in the audit log.
          </p>

          {agent.documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              message="The applicant has not uploaded anything. Ask them for an identity document and proof of ownership."
            />
          ) : (
            <ul className="divide-y divide-kampmax-border rounded-md border border-kampmax-border">
              {agent.documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-kampmax-text">
                      {AGENT_DOCUMENT_TYPE_LABELS[d.documentType]}
                    </p>
                    <p className="truncate text-[11px] text-kampmax-text-secondary">
                      {d.originalFilename ?? "File"} · uploaded {timeAgo(d.createdAt)}
                    </p>
                    {d.status === "REJECTED" && d.rejectionReason && (
                      <p className="text-[11px] text-red-700">Reason: {d.rejectionReason}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DocumentStatusBadge status={d.status} />
                    <button
                      type="button"
                      className={buttonClass}
                      aria-label={`View ${AGENT_DOCUMENT_TYPE_LABELS[d.documentType]}`}
                      onClick={() => setViewing(d)}
                    >
                      View
                    </button>
                    {canReview && d.status !== "ACCEPTED" && (
                      <button
                        type="button"
                        disabled={busy}
                        className={buttonClass}
                        aria-label={`Accept ${AGENT_DOCUMENT_TYPE_LABELS[d.documentType]}`}
                        onClick={() =>
                          void run(() =>
                            reviewDocument.mutateAsync({ agentId: id, documentId: d.id, decision: "ACCEPTED" })
                          )
                        }
                      >
                        Accept
                      </button>
                    )}
                    {canReview && d.status !== "REJECTED" && (
                      <button
                        type="button"
                        disabled={busy}
                        className={cn(buttonClass, "text-kampmax-error")}
                        aria-label={`Reject ${AGENT_DOCUMENT_TYPE_LABELS[d.documentType]}`}
                        onClick={() => setDecision({ kind: "reject-document", document: d })}
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {agent.status === "PENDING" && (
            <div className="mt-3 rounded-md border border-kampmax-border bg-kampmax-muted/40 px-3 py-2.5">
              {missing.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Identity and proof of ownership are on file. Check them, then approve.
                </p>
              ) : (
                <p className="flex items-start gap-2 text-sm text-amber-800">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    Before approving, the applicant still needs to provide {missing.join(" and ")}.
                  </span>
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {canReview && (
        <section aria-label="Decisions" className="mt-4 rounded-lg border border-kampmax-border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-kampmax-text">Decision</h2>
          <div className="flex flex-wrap gap-2">
            {agent.status === "PENDING" && (
              <>
                <button
                  type="button"
                  className={primaryClass}
                  disabled={busy || missing.length > 0}
                  title={missing.length > 0 ? `Needs ${missing.join(" and ")}` : undefined}
                  onClick={() => void run(() => approve.mutateAsync(id))}
                >
                  Approve agent
                </button>
                <button type="button" className={buttonClass} disabled={busy} onClick={() => setDecision({ kind: "request-info" })}>
                  Ask for more documents
                </button>
                <button type="button" className={cn(buttonClass, "text-kampmax-error")} disabled={busy} onClick={() => setDecision({ kind: "reject" })}>
                  Reject
                </button>
              </>
            )}
            {agent.status === "APPROVED" && (
              <>
                <button type="button" className={buttonClass} disabled={busy} onClick={() => setDecision({ kind: "suspend" })}>
                  Suspend
                </button>
                <button type="button" className={cn(buttonClass, "text-kampmax-error")} disabled={busy} onClick={() => setDecision({ kind: "revoke" })}>
                  Revoke privileges
                </button>
              </>
            )}
            {agent.status === "SUSPENDED" && (
              <>
                <button type="button" className={primaryClass} disabled={busy} onClick={() => void run(() => restore.mutateAsync(id))}>
                  Restore agent
                </button>
                <button type="button" className={cn(buttonClass, "text-kampmax-error")} disabled={busy} onClick={() => setDecision({ kind: "revoke" })}>
                  Revoke privileges
                </button>
              </>
            )}
            {(agent.status === "REJECTED" || agent.status === "REVOKED") && (
              <p className="flex items-center gap-2 text-sm text-kampmax-text-secondary">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                {agent.status === "REJECTED"
                  ? "This application was rejected. The person can apply again."
                  : "This agent's privileges were removed. There is nothing more to decide."}
              </p>
            )}
          </div>
        </section>
      )}

      <section aria-label="Listing history" className="mt-4 rounded-lg border border-kampmax-border bg-white">
        <h2 className="border-b border-kampmax-border px-4 py-3 text-sm font-semibold text-kampmax-text">
          Listing history
        </h2>
        {listings.isPending ? (
          <div className="p-4">
            <LoadingSkeleton variant="table" rows={3} />
          </div>
        ) : listings.isError ? (
          <ErrorState onRetry={() => void listings.refetch()} />
        ) : listings.data.items.length === 0 ? (
          <EmptyState icon={FileText} title="No listings yet" message="This agent has not created a listing." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-kampmax-border text-xs text-kampmax-text-secondary">
                    <th scope="col" className="px-4 py-2 font-medium">Listing</th>
                    <th scope="col" className="px-4 py-2 font-medium">Review</th>
                    <th scope="col" className="px-4 py-2 font-medium">On the site</th>
                    <th scope="col" className="px-4 py-2 font-medium">Created</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kampmax-border">
                  {listings.data.items.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-2.5 font-medium text-kampmax-text">{l.title}</td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <ModerationBadge status={l.moderationStatus} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <PublicationBadge status={l.publicationStatus} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-kampmax-text-secondary">
                        {formatDate(l.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/admin/accommodation/listings/${l.id}`}
                          aria-label={`Open ${l.title}`}
                          className="inline-flex h-7 items-center rounded-md border border-kampmax-border bg-white px-2.5 text-xs font-medium text-kampmax-text hover:bg-kampmax-muted/60"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={listings.data.page}
              pageSize={listings.data.pageSize}
              total={listings.data.total}
              totalPages={listings.data.totalPages}
              onPageChange={setListingPage}
              unitLabel="listings"
            />
          </>
        )}
      </section>

      <DocumentViewerDialog
        open={viewing !== null}
        title={viewing ? AGENT_DOCUMENT_TYPE_LABELS[viewing.documentType] : ""}
        load={() => accommodationService.openAgentDocument(id, viewing!.id)}
        onClose={() => setViewing(null)}
      />

      <ConfirmDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        confirmLabel={dialog?.confirmLabel}
        tone={dialog?.tone}
        reasonLabel={dialog?.reasonLabel}
        loading={dialog?.loading}
        onCancel={() => setDecision(null)}
        onConfirm={(reason) => {
          if (!dialog) return;
          void run(async () => {
            await dialog.go(reason);
            setDecision(null);
          });
        }}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { Pill, useAsk } from "@/components/accommodation/enquiry-parts";
import { useRemoveAccommodationDocument, useUploadAccommodationDocument } from "@/hooks/use-accommodation";
import { describeHousingError } from "@/lib/accommodation-text";
import { ADDABLE_DOCUMENTS, DOC_HINT, DOC_STATUS_LABEL, DOCS_PRIVACY, MAX_AGENT_DOCUMENTS, NO_DOCUMENTS } from "@/lib/agent-details";
import { timeAgo } from "@/lib/utils";
import { AGENT_DOCUMENT_TYPE_LABELS, type AgentDocument, type AgentDocumentType } from "@/types/accommodation";

/**
 * The agent's verification documents: what is on file and how each was judged, a way to remove one not yet
 * accepted, and a way to add one while the application allows it. Shared by the profile and verification pages,
 * like the documents section of the mobile app's agent-profile.
 */
export function AgentDocuments({ documents, canAdd }: { documents: AgentDocument[]; canAdd: boolean }) {
  const upload = useUploadAccommodationDocument();
  const remove = useRemoveAccommodationDocument();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<AgentDocumentType>("IDENTITY");
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const { confirm, dialog } = useAsk(remove.isPending);
  const room = documents.length < MAX_AGENT_DOCUMENTS;

  async function send() {
    if (!file) return;
    setProblem(null);
    try {
      await upload.mutateAsync({ file, documentType: type });
      setAdding(false);
      setFile(null);
    } catch (reason) {
      setProblem(describeHousingError(reason));
    }
  }

  return (
    <section className="rounded-2xl border border-kampmax-border bg-white p-5">
      <h2 className="text-base font-bold text-kampmax-text">Your documents</h2>
      <p className="mt-0.5 text-xs text-kampmax-text-secondary">{documents.length} of {MAX_AGENT_DOCUMENTS} on file. {DOCS_PRIVACY}</p>

      {documents.length === 0 && <p className="mt-3 text-sm text-kampmax-text-secondary">{NO_DOCUMENTS}</p>}
      <ul className="mt-2 divide-y divide-kampmax-border">
        {documents.map((d) => {
          const s = DOC_STATUS_LABEL[d.status] ?? { label: d.status, tone: "info" as const };
          const label = AGENT_DOCUMENT_TYPE_LABELS[d.documentType] ?? "Document";
          return (
            <li key={d.id} className="flex items-start gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-kampmax-text">{label}</span>
                <span className="block truncate text-xs text-kampmax-text-secondary">{d.originalFilename ?? "File"} · {timeAgo(d.createdAt)}</span>
                {d.rejectionReason && <span className="block text-xs text-red-700">{d.rejectionReason}</span>}
                <span className="mt-1 block"><Pill label={s.label} tone={s.tone} /></span>
              </span>
              {d.status !== "ACCEPTED" && (
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() =>
                    confirm({
                      title: `Remove ${label}?`,
                      body: "You can add it again later.",
                      confirmLabel: "Remove",
                      run: async () => {
                        setProblem(null);
                        try {
                          await remove.mutateAsync(d.id);
                        } catch (reason) {
                          setProblem(describeHousingError(reason));
                        }
                      },
                    })
                  }
                  className="text-xs text-red-700 underline disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {canAdd && room && !adding && (
        <button type="button" onClick={() => setAdding(true)} className="mt-2 rounded-md border border-kampmax-border px-3 py-2 text-xs font-semibold">Add a document</button>
      )}
      {adding && (
        <div className="mt-3 space-y-3 rounded-lg bg-kampmax-bg p-4">
          <label className="block text-xs text-kampmax-text-secondary">
            Kind of document
            <select value={type} onChange={(e) => setType(e.target.value as AgentDocumentType)} className="mt-1 block w-full rounded-md border border-kampmax-border bg-white px-3 py-2 text-sm text-kampmax-text">
              {ADDABLE_DOCUMENTS.map((t) => <option key={t} value={t}>{AGENT_DOCUMENT_TYPE_LABELS[t]}</option>)}
            </select>
            <span className="mt-0.5 block">{DOC_HINT[type]}</span>
          </label>
          <label className="block text-xs text-kampmax-text-secondary">
            File (PDF, JPEG or PNG, up to 5 MB)
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={!file || upload.isPending} onClick={() => void send()} className="rounded-md bg-kampmax-blue px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
              {upload.isPending ? "Uploading…" : "Upload"}
            </button>
            <button type="button" onClick={() => { setAdding(false); setFile(null); }} className="rounded-md border border-kampmax-border px-3 py-2 text-xs">Cancel</button>
          </div>
        </div>
      )}
      {problem && <p role="alert" className="mt-3 text-sm text-red-700">{problem}</p>}
      {dialog}
    </section>
  );
}

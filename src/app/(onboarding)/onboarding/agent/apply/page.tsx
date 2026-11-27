"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccommodationAgentStatus, useApplyAsAccommodationAgent, useUploadAccommodationDocument } from "@/hooks/use-accommodation";
import { Field, fieldClass } from "@/components/agent/form-parts";
import { StepFlow } from "@/components/onboarding/StepFlow";
import { describeHousingError } from "@/lib/accommodation-text";
import { useAuth } from "@/lib/auth-context";
import {
  AGENT_STEPS,
  AGREEMENT_TEXT,
  agentBody,
  agentDocProblem,
  agentStepProblem,
  DOC_NAME,
  documentsToSend,
  emptyAgent,
  uploadsFailedText,
  type AgentAnswers,
} from "@/services/agent-application";

type Answers = AgentAnswers;

/**
 * Applying to be an accommodation agent: details, documents, then a review and the agreement. Review takes 24 to 48
 * hours. A retry never sends the application or a finished upload twice. The same flow as the mobile agent-setup.
 */
export default function AgentApplyPage() {
  const router = useRouter();
  const { user, status: authStatus } = useAuth();
  const statusQuery = useAccommodationAgentStatus();
  const apply = useApplyAsAccommodationAgent();
  const upload = useUploadAccommodationDocument();
  const [a, setA] = useState<Answers>(() => emptyAgent());
  const [step, setStep] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const done = useRef(new Set<string>());

  useEffect(() => {
    if (user) setA((c) => ({ ...c, fullName: c.fullName || user.name || "", phone: c.phone || user.phone || "", email: c.email || user.email || "" }));
  }, [user]);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace(`/login?returnTo=${encodeURIComponent("/onboarding/agent/apply")}`);
  }, [authStatus, router]);

  // An application already sent goes to where it stands, unless this page is the one finishing it.
  useEffect(() => {
    if (done.current.size > 0) return;
    if (statusQuery.data?.status === "APPROVED") router.replace("/agent");
    else if (statusQuery.data?.applied && statusQuery.data.status === "PENDING") router.replace("/onboarding/agent/submitted");
  }, [statusQuery.data, router]);

  const patch = (next: Partial<Answers>) => {
    setProblem(null);
    setA((c) => ({ ...c, ...next }));
  };

  async function send() {
    setSending(true);
    try {
      if (!done.current.has("apply")) {
        try {
          await apply.mutateAsync(agentBody(a));
        } catch (e) {
          // 409: an earlier try already sent the application, so carry on with the documents.
          if ((e as { status?: number }).status !== 409) throw e;
        }
        done.current.add("apply");
      }
      const failed: string[] = [];
      for (const doc of documentsToSend(a)) {
        if (done.current.has(doc.key)) continue;
        try {
          await upload.mutateAsync({ file: doc.file, documentType: doc.type });
          done.current.add(doc.key);
        } catch {
          failed.push(DOC_NAME[doc.key]);
        }
      }
      if (failed.length > 0) return setProblem(uploadsFailedText(failed));
      router.replace("/onboarding/agent/submitted");
    } catch (reason) {
      setProblem(describeHousingError(reason));
    } finally {
      setSending(false);
    }
  }

  function next() {
    const found = agentStepProblem(step, a);
    setProblem(found);
    if (found) return;
    if (step < AGENT_STEPS.length - 1) return setStep(step + 1);
    void send();
  }

  const text = (key: "fullName" | "phone" | "email" | "operatingLocation" | "agencyName" | "businessAddress", label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <Field label={label}>
      <input value={a[key]} onChange={(e) => patch({ [key]: e.target.value })} className={fieldClass} {...props} />
    </Field>
  );

  return (
    <div className="min-h-screen bg-kampmax-bg px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/onboarding/agent" className="text-sm text-kampmax-blue hover:underline">← Back</Link>
        <div className="mt-4">
          <StepFlow
            title="Agent application"
            steps={AGENT_STEPS}
            step={step}
            problem={problem}
            pending={sending}
            finishLabel="Send application"
            onBack={() => { setProblem(null); setStep(step - 1); }}
            onNext={next}
          >
            {step === 0 && (
              <div className="space-y-5">
                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold text-kampmax-text">Contact details</legend>
                  <p className="text-xs text-kampmax-text-secondary">The review team uses these to reach you. Students message you through Kampmax.</p>
                  {text("fullName", "Full name", { placeholder: "As shown on your ID card", autoComplete: "name", maxLength: 160 })}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {text("phone", "Phone", { type: "tel", placeholder: "0803 123 4567", autoComplete: "tel", maxLength: 20 })}
                    {text("email", "Email", { type: "email", autoComplete: "email", maxLength: 254 })}
                  </div>
                </fieldset>
                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold text-kampmax-text">Where you work</legend>
                  {text("operatingLocation", "Campus area you operate in", { placeholder: "UNILAG (Akoka / Yaba / Bariga)", maxLength: 200 })}
                  {text("agencyName", "Agency name (optional)", { placeholder: "TrustHaven Real Estate", maxLength: 200 })}
                  {text("businessAddress", "Business address (optional)", { placeholder: "14 Commercial Avenue, Yaba, Lagos", maxLength: 300 })}
                </fieldset>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-kampmax-text-secondary">PDF, JPEG or PNG, up to 5 MB each.</p>
                <FilePick label="Government-issued ID" hint="NIN slip, driver's licence, international passport or voter's card." file={a.identity} onChange={(identity) => patch({ identity })} onProblem={setProblem} />
                <FilePick label="Proof you may rent the property out" hint="A letter from the landlord, or a title deed or C of O." file={a.authority} onChange={(authority) => patch({ authority })} onProblem={setProblem} />
                <FilePick label="Business registration (optional)" hint="Only if you apply as an agency." file={a.business} onChange={(business) => patch({ business })} onProblem={setProblem} />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 text-sm">
                <Review
                  title="You"
                  onEdit={() => setStep(0)}
                  rows={[
                    ["Name", a.fullName],
                    ["Phone", a.phone],
                    ["Email", a.email],
                    ["Operates in", a.operatingLocation],
                    ["Agency", a.agencyName],
                  ]}
                />
                <Review
                  title="Documents"
                  onEdit={() => setStep(1)}
                  rows={[
                    ["Government ID", a.identity?.name ?? ""],
                    ["Proof of authority", a.authority?.name ?? ""],
                    ["Business registration", a.business?.name ?? ""],
                  ]}
                />
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={a.accepted} onChange={(e) => patch({ accepted: e.target.checked })} className="mt-1" />
                  <span>{AGREEMENT_TEXT}</span>
                </label>
                <p className="text-center text-xs text-kampmax-text-secondary">Our trust and safety team reviews applications within 24 to 48 hours.</p>
              </div>
            )}
          </StepFlow>
        </div>
      </div>
    </div>
  );
}

function FilePick({ label, hint, file, onChange, onProblem }: { label: string; hint: string; file: File | null; onChange: (f: File | null) => void; onProblem: (p: string | null) => void }) {
  return (
    <div className="rounded-lg border border-kampmax-border p-3">
      <p className="text-sm font-semibold text-kampmax-text">{label}</p>
      <p className="text-xs text-kampmax-text-secondary">{hint}</p>
      {file ? (
        <p className="mt-2 flex items-center justify-between gap-2 text-sm">
          <span className="truncate">{file.name}</span>
          <button type="button" onClick={() => onChange(null)} className="text-xs text-red-700 underline">Remove</button>
        </p>
      ) : (
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          aria-label={label}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const problem = agentDocProblem(f);
            onProblem(problem);
            if (!problem) onChange(f);
          }}
          className="mt-2 block w-full text-sm"
        />
      )}
    </div>
  );
}

function Review({ title, rows, onEdit }: { title: string; rows: [string, string][]; onEdit: () => void }) {
  return (
    <section className="rounded-lg border border-kampmax-border p-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-kampmax-text">{title}</h3>
        <button type="button" onClick={onEdit} className="text-xs text-kampmax-blue underline">Edit</button>
      </div>
      <dl className="mt-2 space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-kampmax-text-secondary">{k}</dt>
            <dd className="truncate text-right text-kampmax-text">{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

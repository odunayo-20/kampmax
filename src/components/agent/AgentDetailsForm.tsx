"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useUpdateAccommodationAgent } from "@/hooks/use-accommodation";
import { describeHousingError } from "@/lib/accommodation-text";
import { agentDetailsPatch, agentDetailsProblems, DETAILS_PRIVACY, formFromAgent, type AgentDetailsErrors, type AgentDetailsForm as Form, type AgentDetailsSource } from "@/lib/agent-details";
import { Field, fieldClass } from "./form-parts";

/**
 * Phone, email, area and agency name. Saves only what changed, and keeps what the agent is typing when fresh data
 * arrives. The same form as the mobile app's agent-profile DetailsForm.
 */
export function AgentDetailsForm({ agent }: { agent: AgentDetailsSource & { fullName: string } }) {
  const update = useUpdateAccommodationAgent();
  const [form, setForm] = useState<Form>(() => formFromAgent(agent));
  const [errors, setErrors] = useState<AgentDetailsErrors>({});
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const touched = useRef(false);

  // Pick up a fresh copy from the server, unless the agent is mid-edit.
  useEffect(() => {
    if (!touched.current) setForm(formFromAgent(agent));
  }, [agent]);

  function set(key: keyof Form, value: string) {
    touched.current = true;
    setSaved(false);
    setErrors((e) => ({ ...e, [key]: undefined }));
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProblem(null);
    const found = agentDetailsProblems(form, agent);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const patch = agentDetailsPatch(form, agent);
    if (Object.keys(patch).length === 0) return setSaved(true);
    try {
      await update.mutateAsync(patch);
      touched.current = false;
      setSaved(true);
    } catch (reason) {
      setProblem(describeHousingError(reason));
    }
  }

  const input = (key: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <Field label={label} error={errors[key]}>
      <input value={form[key]} onChange={(e) => set(key, e.target.value)} className={fieldClass} {...props} />
    </Field>
  );

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4 rounded-2xl border border-kampmax-border bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-kampmax-text">Your details</h2>
        <p className="mt-0.5 text-xs text-kampmax-text-secondary">
          {DETAILS_PRIVACY} {agent.fullName} is the name on your ID and cannot be changed here.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {input("phone", "Phone", { type: "tel", autoComplete: "tel", maxLength: 20 })}
        {input("email", "Email", { type: "email", autoComplete: "email", maxLength: 254 })}
        {input("operatingLocation", "Campus area you operate in", { maxLength: 200 })}
        {input("agencyName", "Agency name (optional)", { maxLength: 160 })}
      </div>
      {input("businessAddress", "Business address (optional)", { maxLength: 300 })}
      {problem && <p role="alert" className="text-sm text-red-700">{problem}</p>}
      {saved && !update.isPending && <p role="status" className="text-sm text-emerald-700">Saved.</p>}
      <button type="submit" disabled={update.isPending} className="rounded-md bg-kampmax-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {update.isPending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}

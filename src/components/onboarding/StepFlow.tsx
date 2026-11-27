"use client";

import { FormEvent } from "react";

/**
 * The frame of a step-by-step sign-up: where you are, the step's own fields, and Back / Continue. Steps can only be
 * reached in order, so each one is checked before the next. Like the mobile app's OnboardingFlow; any role's
 * sign-up can use it.
 */
export function StepFlow({
  title,
  steps,
  step,
  problem,
  pending,
  finishLabel,
  onBack,
  onNext,
  children,
}: {
  title: string;
  steps: { label: string; description: string }[];
  step: number;
  problem: string | null;
  pending: boolean;
  finishLabel: string;
  onBack: () => void;
  onNext: () => void;
  children: React.ReactNode;
}) {
  const last = step === steps.length - 1;
  const current = steps[step];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNext();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-kampmax-text">{title}</h1>
        <ol className="mt-4 flex flex-wrap gap-2 text-xs" aria-label="Steps">
          {steps.map((s, i) => (
            <li
              key={s.label}
              aria-current={i === step ? "step" : undefined}
              className={`rounded-full px-3 py-1 font-semibold ${i === step ? "bg-kampmax-blue text-white" : i < step ? "bg-blue-50 text-kampmax-blue" : "bg-kampmax-muted text-kampmax-text-secondary"}`}
            >
              {i + 1}. {s.label}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-kampmax-text-secondary">{current.description}</p>
      </div>

      <div className="rounded-2xl border border-kampmax-border bg-white p-5">{children}</div>

      {problem && <p role="alert" className="text-sm text-red-700">{problem}</p>}

      <div className="flex items-center justify-between gap-3">
        {step > 0 ? (
          <button type="button" onClick={onBack} disabled={pending} className="rounded-md border border-kampmax-border px-4 py-2 text-sm disabled:opacity-50">Back</button>
        ) : (
          <span />
        )}
        <button type="submit" disabled={pending} className="rounded-md bg-kampmax-blue px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Sending…" : last ? finishLabel : "Continue"}
        </button>
      </div>
    </form>
  );
}

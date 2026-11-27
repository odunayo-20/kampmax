"use client";

/** A labelled field with an optional hint and error, shared by the agent workspace forms. */

export const fieldClass = "mt-1 block w-full rounded-md border border-kampmax-border bg-white px-3 py-2 text-sm text-kampmax-text";

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-kampmax-text-secondary">
      {label}
      {children}
      {hint && <span className="mt-0.5 block">{hint}</span>}
      {error && <span role="alert" className="mt-0.5 block text-red-700">{error}</span>}
    </label>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { useApp } from "@/lib/app-context";
import { useApplyOrganizer, useOrganizerStatus } from "@/hooks/use-events";
import { CampusSelector } from "@/components/layout/footer/CampusSelector";
import { FieldError, inputClass } from "@/components/events/organizer/fields";
import {
  DESCRIPTION_MAX,
  NAME_MAX,
  PROOF_MAX,
  validateApplication,
  type ApplicationErrors,
  type ApplicationForm,
} from "@/lib/organizer-application";


export default function OrganizerApplyPage() {
  const router = useRouter();
  const { selectedCampus } = useApp();
  const status = useOrganizerStatus();
  const apply = useApplyOrganizer();
  const [form, setForm] = useState<ApplicationForm>({ organizationName: "", description: "", proofUrl: "" });
  const [errors, setErrors] = useState<ApplicationErrors>({});
  const [pickerOpen, setPickerOpen] = useState(false);

  const campusId = selectedCampus?.id;
  const state = status.data?.application?.status;
  const blocked = state === "PENDING" || state === "APPROVED" || state === "SUSPENDED";
  const set = (key: keyof ApplicationForm) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (apply.isPending) return;
    const checked = validateApplication(form);
    setErrors(checked.ok ? {} : checked.errors);
    if (!checked.ok || !campusId) return;
    apply.mutate(
      { campusId, ...checked.value },
      { onSuccess: () => router.replace("/organizer") }
    );
  }

  return (
    <PageContainer narrow className="space-y-4 pb-14">
      <Link href="/organizer" className="flex items-center gap-2 text-sm text-kampmax-text-secondary hover:text-kampmax-text">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div>
        <h1 className="text-xl font-bold text-kampmax-text">Become an event organizer</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Organizers can create events, sell tickets and scan entries. An admin reviews every
          request. You keep using the same Kampmax account.
        </p>
      </div>

      {blocked ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          {state === "PENDING" && "Your application is under review."}
          {state === "APPROVED" && "You're already an approved organizer."}
          {state === "SUSPENDED" && "Your organizer access is suspended. Contact support."}{" "}
          <Link href="/organizer" className="font-semibold underline">Go to organizer hub</Link>
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-kampmax-border bg-white p-4">
          {state === "REJECTED" && status.data?.application?.reviewNote && (
            <p role="status" className="rounded-lg bg-error-50 p-3 text-xs text-error-700">
              Your last request was declined: {status.data.application.reviewNote}. You can update your
              details and apply again.
            </p>
          )}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-label="Change campus"
            className={`text-left ${inputClass}`}
          >
            <span className="block text-[11px] text-kampmax-text-muted">Campus</span>
            <span className="font-semibold text-kampmax-text">
              {campusId ? selectedCampus.name : "Choose your campus"}
            </span>
          </button>
          <label className="block text-xs font-semibold text-kampmax-text">
            Club or organisation name
            <input
              value={form.organizationName}
              onChange={set("organizationName")}
              maxLength={NAME_MAX}
              aria-invalid={Boolean(errors.organizationName)}
              className={`mt-1 ${inputClass}`}
            />
            <FieldError message={errors.organizationName} />
          </label>
          <label className="block text-xs font-semibold text-kampmax-text">
            What events will you run?
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={5}
              maxLength={DESCRIPTION_MAX}
              aria-invalid={Boolean(errors.description)}
              placeholder="Who you are, the kind of events, and how often."
              className={`mt-1 ${inputClass}`}
            />
            <span className="mt-0.5 block text-right text-[11px] font-normal text-kampmax-text-muted">
              {form.description.length}/{DESCRIPTION_MAX}
            </span>
            <FieldError message={errors.description} />
          </label>
          <label className="block text-xs font-semibold text-kampmax-text">
            Link that shows who you are (optional)
            <input
              value={form.proofUrl}
              onChange={set("proofUrl")}
              maxLength={PROOF_MAX}
              inputMode="url"
              aria-invalid={Boolean(errors.proofUrl)}
              placeholder="https://instagram.com/your-club"
              className={`mt-1 ${inputClass}`}
            />
            <FieldError message={errors.proofUrl} />
          </label>
          {!campusId && <p className="text-xs text-error-700">Choose your campus first.</p>}
          {apply.isError && (
            <p role="alert" className="rounded-lg bg-error-50 p-3 text-xs text-error-700">
              Couldn&apos;t send your application. Try again.
            </p>
          )}
          <button
            type="submit"
            disabled={apply.isPending}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-kampmax-navy text-sm font-bold text-white disabled:opacity-50"
          >
            {apply.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Send application
          </button>
          <CampusSelector hideTrigger open={pickerOpen} onOpenChange={setPickerOpen} />
        </form>
      )}
    </PageContainer>
  );
}

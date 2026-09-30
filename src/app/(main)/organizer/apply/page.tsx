"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { useApp } from "@/lib/app-context";
import { useApplyOrganizer, useOrganizerStatus } from "@/hooks/use-events";

const inputClass =
  "w-full rounded-xl border border-kampmax-border bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-kampmax-blue";

export default function OrganizerApplyPage() {
  const router = useRouter();
  const { selectedCampus } = useApp();
  const status = useOrganizerStatus();
  const apply = useApplyOrganizer();
  const [organizationName, setOrganizationName] = useState("");
  const [description, setDescription] = useState("");
  const [proofUrl, setProofUrl] = useState("");

  const campusId = selectedCampus?.id;
  const state = status.data?.application?.status;
  const blocked = state === "PENDING" || state === "APPROVED" || state === "SUSPENDED";
  const valid =
    Boolean(campusId) &&
    organizationName.trim().length >= 3 &&
    description.trim().length >= 30;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !campusId || apply.isPending) return;
    apply.mutate(
      {
        campusId,
        organizationName: organizationName.trim(),
        description: description.trim(),
        proofUrl: proofUrl.trim() || undefined,
      },
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
          <label className="block text-xs font-semibold text-kampmax-text">
            Club or organization name
            <input
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              maxLength={120}
              placeholder="RUGIPO Tech Community"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="block text-xs font-semibold text-kampmax-text">
            What events will you run?
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Tell us who you are and the kind of events you plan to host (at least 30 characters)."
              className={`mt-1 ${inputClass}`}
            />
            <span className="mt-0.5 block text-[11px] font-normal text-kampmax-text-muted">
              {description.trim().length}/30 minimum
            </span>
          </label>
          <label className="block text-xs font-semibold text-kampmax-text">
            Proof link (optional)
            <input
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              maxLength={500}
              inputMode="url"
              placeholder="Link to a club letter or student ID scan"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          {!campusId && (
            <p className="text-xs text-error-700">Select your campus first (from the home screen).</p>
          )}
          {apply.isError && (
            <p role="alert" className="rounded-lg bg-error-50 p-3 text-xs text-error-700">
              {apply.error.message}
            </p>
          )}
          <button
            type="submit"
            disabled={!valid || apply.isPending}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-kampmax-navy text-sm font-bold text-white disabled:opacity-50"
          >
            {apply.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Submit application
          </button>
        </form>
      )}
    </PageContainer>
  );
}

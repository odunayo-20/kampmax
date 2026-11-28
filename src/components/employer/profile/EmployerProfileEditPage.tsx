"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEmployerProfile, useUpdateEmployerProfile } from "@/hooks/use-employer-profile";
import { getRefusalMessage } from "@/lib/error-messages";
import { EMPLOYER_CLIENT_TYPES } from "@/config/employer";
import { EmployerProfileSkeleton } from "./EmployerProfileSkeleton";
import { EmployerProfileEditForm } from "./EmployerProfileEditForm";
import type { EmployerProfileUpdatePayload } from "@/types/employer";

/**
 * Supports updating the draft via the mass-assignment-safe payload. Profiles
 * in a NON-APPROVED state (PENDING_REVIEW, REJECTED, IN_PROGRESS) must keep
 * this route open — only the view is symmetric with the profile page.
 */
export function EmployerProfileEditPage() {
  const router = useRouter();
  const profileQuery = useEmployerProfile();
  const updateMutation = useUpdateEmployerProfile();

  const clientTypeLabel = profileQuery.data?.draft.clientType
    ? (EMPLOYER_CLIENT_TYPES.find(
        (t) => t.value === profileQuery.data?.draft.clientType
      )?.label ?? profileQuery.data?.draft.clientType)
    : "—";

  const handleSave = (payload: EmployerProfileUpdatePayload) => {
    updateMutation.mutate(payload, {
      onSuccess: () => {
        router.push("/employer/profile");
      },
    });
  };

  return (
    <div className="space-y-6">
      <Link
        href="/employer/profile"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-kampmax-text-secondary hover:text-kampmax-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to profile
      </Link>

      <div>
        <h1 className="text-xl font-bold text-kampmax-text">Edit employer profile</h1>
        <p className="mt-0.5 text-sm text-kampmax-text-secondary">
          Freelancers and applicants see these details on your jobs.
        </p>
      </div>

      {profileQuery.isPending || !profileQuery.data ? (
        <EmployerProfileSkeleton />
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-kampmax-text-secondary">
            Employer type: <strong className="text-kampmax-text">{clientTypeLabel}</strong>.
            Your employer type shapes which sections are available.
          </div>

          {updateMutation.isError && (
            <div className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2.5 text-sm text-error-700">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              <span>{getRefusalMessage(updateMutation.error)}</span>
            </div>
          )}

          {updateMutation.isSuccess && (
            <div className="flex items-start gap-2 rounded-lg border border-success-200 bg-success-50 px-3 py-2.5 text-sm text-success-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              <span>Saved. Candidates see these changes now.</span>
            </div>
          )}

          <EmployerProfileEditForm
            draft={profileQuery.data.draft}
            isPending={profileQuery.isFetching && !profileQuery.data}
            isUpdating={updateMutation.isPending}
            onSave={handleSave}
          />
        </>
      )}
    </div>
  );
}
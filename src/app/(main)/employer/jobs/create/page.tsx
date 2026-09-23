"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { OpportunityInput } from "@/types/opportunity";
import { useAuth } from "@/lib/auth-context";
import { getEmployerProfileApi } from "@/services/employer";
import { useCreateJob, usePublishJob } from "@/hooks/use-jobs";
import { JobForm, emptyJobFormValues } from "@/components/employer/jobs/JobForm";
import { getFriendlyErrorMessage } from "@/lib/error-messages";

export default function CreateJobPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // The backend is the authority: any employer profile may post jobs.
  const [employer, setEmployer] = useState<{ name: string } | null | undefined>(undefined);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getEmployerProfileApi().then(({ profile }) => {
      if (!cancelled) {
        setEmployer(profile ? { name: String(profile.companyName || profile.displayName || "") } : null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);
  const employerName = employer?.name;

  const createMutation = useCreateJob();
  const publishMutation = usePublishJob();

  const handleSave = (values: OpportunityInput) => {
    createMutation.mutate(values, {
      onSuccess: (job) => router.push(`/employer/jobs/${job.id}`),
      onError: (err) => setSubmissionError(getFriendlyErrorMessage(err)),
    });
  };

  const handlePublish = async (values: OpportunityInput) => {
    setSubmissionError(null);
    try {
      const job = await createMutation.mutateAsync(values);
      await publishMutation.mutateAsync(job.id);
      router.push(`/employer/jobs/${job.id}`);
    } catch (err) {
      setSubmissionError(getFriendlyErrorMessage(err));
    }
  };

  if (employer === undefined) {
    return <div className="pt-8 text-center text-sm text-neutral-500">Loading…</div>;
  }
  if (employer === null) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
        Create an employer profile before posting jobs.
      </div>
    );
  }

  return (
    <JobForm
      mode="create"
      initialValues={emptyJobFormValues()}
      employerName={employerName}
      isSaving={createMutation.isPending}
      isPublishing={publishMutation.isPending || createMutation.isPending}
      error={submissionError}
      onSaveDraft={handleSave}
      onPublish={handlePublish}
    />
  );
}
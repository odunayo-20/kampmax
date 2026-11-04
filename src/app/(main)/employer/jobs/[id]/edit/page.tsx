"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { OpportunityInput } from "@/types/opportunity";
import { isHiringType } from "@/types/opportunity";
import { useEmployerJob, useUpdateJob, usePublishJob } from "@/hooks/use-jobs";
import { JobForm, opportunityToInput } from "@/components/employer/jobs/JobForm";
import { PublishJobDialog } from "@/components/employer/jobs/PublishJobDialog";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { Button } from "@/components/ui";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = String(params.id);
  const jobQuery = useEmployerJob(jobId);
  const updateMutation = useUpdateJob();
  const publishMutation = usePublishJob();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (jobQuery.isPending) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-neutral-200" />
        ))}
      </div>
    );
  }

  if (jobQuery.isError || jobQuery.data?.status !== "draft") {
    const reason =
      (jobQuery.error as { code?: string } | undefined)?.code === "NOT_FOUND"
        ? "We couldn't find that job, or you don't have access to it."
        : jobQuery.data && jobQuery.data.status !== "draft"
        ? "Only draft jobs can be edited. Live jobs can be closed, and everything else is managed by moderation."
        : (jobQuery.data?.status ?? "") &&
          "Only draft jobs can be edited before they're submitted for moderation.";
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 text-error-600 ring-1 ring-error-100">
          <ShieldAlert className="h-7 w-7" aria-hidden />
        </div>
        <h2 className="mt-4 text-lg font-bold text-neutral-900">This job can't be edited.</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-neutral-500">{reason}</p>
        <Button variant="outline" className="mt-5" onClick={() => router.push("/employer/jobs")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back to my jobs
        </Button>
      </div>
    );
  }

  const o = jobQuery.data;

  const handleSave = (values: OpportunityInput) => {
    updateMutation.mutate(
      { id: jobId, input: values },
      {
        onSuccess: () => router.push(`/employer/jobs/${jobId}`),
        onError: (err) => setSubmissionError(getFriendlyErrorMessage(err)),
      }
    );
  };

  const handlePublish = async (values: OpportunityInput) => {
    setSubmissionError(null);
    try {
      await updateMutation.mutateAsync({ id: jobId, input: values });
      if (values.opportunityType && isHiringType(values.opportunityType)) {
        // Paid: show what it costs before anything is charged.
        setDialogOpen(true);
        return;
      }
      await publishMutation.mutateAsync(jobId);
      router.push(`/employer/jobs/${jobId}`);
    } catch (err) {
      setSubmissionError(getFriendlyErrorMessage(err));
    }
  };

  return (
    <>
      <JobForm
        mode="edit"
        initialValues={opportunityToInput(o)}
        employerName={o.employer.name}
        isSaving={updateMutation.isPending}
        isPublishing={publishMutation.isPending || updateMutation.isPending}
        error={submissionError}
        onSaveDraft={handleSave}
        onPublish={handlePublish}
      />
      <PublishJobDialog
        jobId={jobId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onPublished={() => router.push(`/employer/jobs/${jobId}`)}
      />
    </>
  );
}
"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, FileText, MapPin } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/home/Skeleton";
import { JobsPagination } from "@/components/jobs/JobsPagination";
import { OpportunityTypeBadge } from "@/components/employer/jobs/OpportunityTypeBadge";
import { APPLICANT_STATUS_META, canWithdraw } from "@/config/cv";
import { useMyApplications, useWithdrawApplication } from "@/hooks/use-job-applications";
import { getFriendlyErrorMessage, getRefusalMessage } from "@/lib/error-messages";
import { formatDate } from "@/lib/utils";
import type { OpportunityType } from "@/types/opportunity";
import type { MyApplication } from "@/services/job-applications";

const TYPE_FROM_BACKEND: Record<string, OpportunityType> = {
  GIG: "gig",
  FULL_TIME: "full_time",
  PART_TIME: "part_time",
  INTERNSHIP: "internship",
  CONTRACT: "contract",
};

function ApplicationCard({ application: a }: { application: MyApplication }) {
  const withdraw = useWithdrawApplication();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = APPLICANT_STATUS_META[a.status];
  const where = [a.job.city, a.job.state].filter(Boolean).join(", ");

  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <OpportunityTypeBadge type={TYPE_FROM_BACKEND[a.job.opportunityType] ?? "internship"} />
            <span className="text-xs text-neutral-500">{a.job.employerName}</span>
          </div>
          <h2 className="mt-1 text-base font-semibold text-neutral-900">
            <Link href={`/jobs/${a.job.id}`} className="hover:underline">
              {a.job.title}
            </Link>
          </h2>
        </div>
        <Badge variant={meta.tone}>
          {meta.label}
          <span className="sr-only">. {meta.hint}</span>
        </Badge>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-neutral-600">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <dt className="sr-only">CV</dt>
          <dd>Applied with &ldquo;{a.cvLabel}&rdquo;</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <dt className="sr-only">Sent</dt>
          <dd>Sent {formatDate(a.createdAt)}</dd>
        </div>
        {where && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
            <dt className="sr-only">Where</dt>
            <dd>{where}</dd>
          </div>
        )}
      </dl>

      <p className="mt-2 text-xs text-neutral-500">{meta.hint}</p>

      {a.employerNote && (
        <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
          <span className="font-medium">Message from the employer:</span> {a.employerNote}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-error-600">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
        <Link
          href={`/jobs/${a.job.id}`}
          className="inline-flex h-8 items-center rounded-md border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
        >
          View posting
        </Link>
        {canWithdraw(a.status) && (
          <Button variant="outline" size="sm" onClick={() => setConfirm(true)} disabled={withdraw.isPending}>
            Withdraw
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        title="Withdraw this application?"
        body={`The employer will no longer see your application to "${a.job.title}". You can apply again while the posting is open.`}
        confirmLabel="Withdraw"
        destructive
        pending={withdraw.isPending}
        onConfirm={() =>
          withdraw.mutate(a.id, {
            onSuccess: () => setConfirm(false),
            onError: (err) => {
              setConfirm(false);
              setError(getRefusalMessage(err));
            },
          })
        }
        onCancel={() => setConfirm(false)}
      />
    </li>
  );
}

/** Everything the student has applied to, and how each application is going. */
export function MyApplications() {
  const [page, setPage] = useState(1);
  const query = useMyApplications(page);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">My applications</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Internships and vacancies you applied to with a CV, and where each one stands.
        </p>
      </div>

      {query.isPending ? (
        <div className="space-y-4" role="status" aria-label="Loading your applications">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border border-error-100 bg-error-50 p-4 text-sm text-error-700">
          {getFriendlyErrorMessage(query.error)}{" "}
          <button className="font-semibold underline" onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      ) : query.data.applications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-neutral-900">You haven&apos;t applied to anything yet</p>
          <p className="mt-1 text-xs text-neutral-500">
            Browse internships and vacancies, then apply with one of your saved CVs.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/jobs?type=internship"
              className="inline-flex h-9 items-center rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Find internships
            </Link>
            <Link
              href="/profile/cvs"
              className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
            >
              My CVs
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {query.data.applications.map((a) => (
              <ApplicationCard key={a.id} application={a} />
            ))}
          </ul>
          <JobsPagination
            page={query.data.page}
            totalPages={query.data.totalPages}
            total={query.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

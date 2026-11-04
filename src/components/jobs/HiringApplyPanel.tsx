"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Send, Settings2 } from "lucide-react";
import type { Opportunity } from "@/types/opportunity";
import { Badge, Button } from "@/components/ui";
import { APPLICANT_STATUS_META } from "@/config/cv";
import type { MyApplication } from "@/services/job-applications";
import { formatDate } from "@/lib/utils";
import { ApplyDialog } from "./ApplyDialog";

/**
 * The "Apply" box on a vacancy or internship. A person applies with a saved
 * CV rather than a bid. It shows when they already applied (and how that is
 * going), and the owner sees a link to manage the posting instead.
 */
export function HiringApplyPanel({
  job,
  isOwner,
  application,
  loading,
}: {
  job: Opportunity;
  isOwner: boolean;
  /** My live application to this posting, if I have one. */
  application: MyApplication | null | undefined;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const closed = job.status !== "open";
  const meta = application ? APPLICANT_STATUS_META[application.status] : null;

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
            {isOwner
              ? "This is your posting"
              : application
                ? "You've applied"
                : closed
                  ? "Applications are closed"
                  : "Ready to apply?"}
            {meta && <Badge variant={meta.tone}>{meta.label}</Badge>}
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            {isOwner
              ? "See who applied and manage this posting from your employer dashboard."
              : application
                ? `${meta?.hint} You applied on ${formatDate(application.createdAt)} with "${application.cvLabel}".`
                : closed
                  ? "This posting is no longer taking applications."
                  : "Apply with one of your saved CVs. It only takes a minute."}
          </p>
          {application?.employerNote && (
            <p className="mt-2 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
              <span className="font-medium">Message from the employer:</span> {application.employerNote}
            </p>
          )}
        </div>

        {isOwner ? (
          <Link href={`/employer/jobs/${job.id}/applications`} className="sm:shrink-0">
            <Button className="w-full sm:w-auto">
              <Settings2 className="mr-1.5 h-4 w-4" aria-hidden /> View applicants
            </Button>
          </Link>
        ) : application ? (
          <Link href="/profile/applications" className="sm:shrink-0">
            <Button variant="outline" className="w-full sm:w-auto">
              <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden /> My applications
            </Button>
          </Link>
        ) : (
          <Button
            className="sm:shrink-0"
            disabled={closed || loading}
            onClick={() => setOpen(true)}
          >
            <Send className="mr-1.5 h-4 w-4" aria-hidden /> Apply now
          </Button>
        )}
      </div>

      <ApplyDialog job={job} open={open} onClose={() => setOpen(false)} />
    </section>
  );
}

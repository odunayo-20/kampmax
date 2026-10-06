"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import {
  useFreelancerVerification,
  useRequestFreelancerVerification,
} from "@/hooks/use-verification";

const CONTENT = {
  verified: {
    icon: <ShieldCheck className="h-6 w-6" />,
    tone: "border-emerald-200 bg-emerald-50/50",
    iconTone: "bg-emerald-100 text-emerald-600",
    title: "Your freelancer profile is verified",
    body: "Your profile shows the verified badge, which helps clients hire you with confidence.",
  },
  pending_review: {
    icon: <Clock className="h-6 w-6" />,
    tone: "border-amber-200 bg-amber-50/50",
    iconTone: "bg-amber-100 text-amber-600",
    title: "Your profile is being reviewed",
    body: "Our team is reviewing your freelancer profile. You'll be notified when there's a decision.",
  },
  rejected: {
    icon: <XCircle className="h-6 w-6" />,
    tone: "border-red-200 bg-red-50/50",
    iconTone: "bg-red-100 text-red-600",
    title: "Your verification wasn't approved",
    body: "Improve your profile and portfolio, then ask for another review.",
  },
  suspended: {
    icon: <XCircle className="h-6 w-6" />,
    tone: "border-red-200 bg-red-50/50",
    iconTone: "bg-red-100 text-red-600",
    title: "Your account is suspended",
    body: "Contact support to find out why and how to resolve it.",
  },
  unverified: {
    icon: <ShieldAlert className="h-6 w-6" />,
    tone: "border-blue-200 bg-blue-50/50",
    iconTone: "bg-kampmax-blue/15 text-kampmax-blue",
    title: "Get your profile verified",
    body: "Ask our team to review your freelancer profile and earn the verified badge.",
  },
} as const;

export default function FreelancerVerificationPage() {
  const query = useFreelancerVerification();
  const request = useRequestFreelancerVerification();

  const header = (
    <div className="flex items-center gap-3">
      <Link
        href="/freelancer/dashboard"
        aria-label="Back to dashboard"
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-kampmax-muted text-kampmax-text hover:bg-neutral-200 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div>
        <h1 className="text-xl font-bold text-kampmax-navy">Profile verification</h1>
        <p className="text-xs text-kampmax-text-secondary mt-0.5">
          A verified badge helps clients trust your profile.
        </p>
      </div>
    </div>
  );

  if (query.isPending) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {header}
        <div className="flex items-center justify-center gap-2 py-16 text-kampmax-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <p className="text-sm">Loading your verification…</p>
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {header}
        <div role="alert" className="rounded-2xl border border-kampmax-border bg-white p-8 text-center">
          <p className="text-sm text-kampmax-text-secondary">{getFriendlyErrorMessage(query.error)}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const status = query.data.status;
  const content = CONTENT[status];
  const canRequest = status === "unverified" || status === "rejected";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {header}

      <div className={cn("rounded-2xl border p-6", content.tone)}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", content.iconTone)}>
              {content.icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-kampmax-navy">{content.title}</h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-kampmax-text-secondary">{content.body}</p>
            </div>
          </div>

          {canRequest && (
            <Button
              variant="primary"
              className="shrink-0 w-full sm:w-auto"
              disabled={request.isPending}
              onClick={() => request.mutate()}
            >
              {request.isPending ? "Sending…" : status === "rejected" ? "Ask for another review" : "Request verification"}
            </Button>
          )}
        </div>

        {request.isError && (
          <p role="alert" className="mt-4 text-xs text-red-600">
            {getFriendlyErrorMessage(request.error)}
          </p>
        )}
      </div>

      <section className="rounded-2xl border border-kampmax-border bg-white p-6 space-y-3">
        <h2 className="text-sm font-bold text-kampmax-navy">Before you ask</h2>
        <ul className="space-y-2 text-xs text-kampmax-text-secondary">
          {[
            "Complete your profile: photo, headline, skills and a clear bio.",
            "Add portfolio items that show real work.",
            "Make sure your services describe what you offer and what it costs.",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
              {tip}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-kampmax-text-secondary">
        Withdrawing earnings needs a bank account and identity check. Set those up in your{" "}
        <Link href="/profile/wallet" className="font-semibold text-kampmax-blue hover:underline">
          wallet
        </Link>
        .
      </p>
    </div>
  );
}

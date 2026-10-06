"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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
import { fetchSpApproval, type SpApproval } from "@/services/sp-verification";

const CONTENT: Record<
  SpApproval,
  { icon: React.ReactNode; tone: string; iconTone: string; title: string; body: string }
> = {
  verified: {
    icon: <ShieldCheck className="h-6 w-6" />,
    tone: "border-emerald-200 bg-emerald-50/50",
    iconTone: "bg-emerald-100 text-emerald-600",
    title: "You're a verified provider",
    body: "Your services are visible to customers and you can take bookings.",
  },
  pending: {
    icon: <Clock className="h-6 w-6" />,
    tone: "border-amber-200 bg-amber-50/50",
    iconTone: "bg-amber-100 text-amber-600",
    title: "Waiting for Kampmax to approve you",
    body: "New providers are reviewed by our team. Your services appear to customers once you're approved, and you'll be notified.",
  },
  suspended: {
    icon: <XCircle className="h-6 w-6" />,
    tone: "border-red-200 bg-red-50/50",
    iconTone: "bg-red-100 text-red-600",
    title: "Your provider account is suspended",
    body: "Your services are hidden from customers. Contact support to find out why and how to resolve it.",
  },
  deactivated: {
    icon: <ShieldAlert className="h-6 w-6" />,
    tone: "border-neutral-200 bg-neutral-50",
    iconTone: "bg-neutral-100 text-neutral-600",
    title: "Your provider account is deactivated",
    body: "Your services are hidden from customers. Contact support if you want to come back.",
  },
};

export default function ServiceProviderVerificationPage() {
  const query = useQuery({ queryKey: ["service-provider", "approval"], queryFn: fetchSpApproval, retry: false });

  const header = (
    <div className="flex items-center gap-3">
      <Link
        href="/service-provider"
        aria-label="Back to dashboard"
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-kampmax-muted text-kampmax-text hover:bg-neutral-200 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div>
        <h1 className="text-xl font-bold text-kampmax-navy">Provider verification</h1>
        <p className="text-xs text-kampmax-text-secondary mt-0.5">
          Whether Kampmax has approved you to offer services.
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
          <p className="text-sm">Loading your status…</p>
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

  const content = CONTENT[query.data];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {header}

      <div className={cn("rounded-2xl border p-6", content.tone)}>
        <div className="flex items-start gap-4">
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", content.iconTone)}>
            {content.icon}
          </div>
          <div>
            <h2 className="text-base font-bold text-kampmax-navy">{content.title}</h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-kampmax-text-secondary">{content.body}</p>
          </div>
        </div>
      </div>

      {query.data === "pending" && (
        <section className="rounded-2xl border border-kampmax-border bg-white p-6 space-y-3">
          <h2 className="text-sm font-bold text-kampmax-navy">While you wait</h2>
          <ul className="space-y-2 text-xs text-kampmax-text-secondary">
            {[
              "Make sure your profile is complete: a clear name, bio and photo.",
              "List each service with a description, price and how long it takes.",
              "Set the days and hours you're available.",
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                {tip}
              </li>
            ))}
          </ul>
          <div className="flex gap-3 pt-1 text-xs font-semibold text-kampmax-blue">
            <Link href="/service-provider/profile" className="hover:underline">Edit profile</Link>
            <Link href="/service-provider/services" className="hover:underline">Manage services</Link>
            <Link href="/service-provider/availability" className="hover:underline">Set availability</Link>
          </div>
        </section>
      )}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { useOrganizerStatus } from "@/hooks/use-events";

/**
 * Creating an event now needs the organizer role (with ticket types and
 * scanning), so this old entry point routes people to the right place.
 */
export default function CreateEventPage() {
  const router = useRouter();
  const status = useOrganizerStatus();

  useEffect(() => {
    if (status.data?.isOrganizer) router.replace("/organizer/events/new");
  }, [status.data?.isOrganizer, router]);

  return (
    <PageContainer narrow className="space-y-4">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-kampmax-text-secondary hover:text-kampmax-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {status.isPending ? (
        <div className="flex justify-center py-10 text-kampmax-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : status.data?.isOrganizer ? null : (
        <div className="space-y-3 rounded-2xl border border-kampmax-border bg-white p-5 text-center">
          <h1 className="text-lg font-bold text-kampmax-text">Want to host an event?</h1>
          <p className="text-sm text-kampmax-text-secondary">
            Events are run by approved organizers. Ask for organizer access and an admin will review
            your request.
          </p>
          <Link
            href="/organizer"
            className="inline-flex h-11 items-center rounded-xl bg-kampmax-navy px-5 text-sm font-bold text-white"
          >
            Become an organizer
          </Link>
        </div>
      )}
    </PageContainer>
  );
}

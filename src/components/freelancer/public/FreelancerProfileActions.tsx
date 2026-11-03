"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCandidateConversation } from "@/hooks";
import { asServiceId } from "@/services/service-share";
import { Button } from "@/components/ui";

/**
 * Auth-aware actions on the public freelancer profile.
 * - Owners (backend-derived: authenticated user id === profile owner) get an
 *   "Edit profile" link to their own private dashboard — never anywhere else.
 * - Everyone else gets a "Message" action that opens (or creates) the direct
 *   conversation. Guests are routed through login with a returnTo back here.
 */
export function FreelancerProfileActions({
  profileId,
  label = "Message",
  fullWidth = false,
  serviceId,
}: {
  profileId: string;
  label?: string;
  fullWidth?: boolean;
  /** The service being viewed; it is staged next to the message box in the chat. */
  serviceId?: string;
}) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const openConversation = useCandidateConversation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loading = status === "loading";
  const ownProfile = status === "authenticated" && user?.id === profileId;
  const isGuest = status === "unauthenticated";

  function handleMessage() {
    if (loading) return;
    if (isGuest) {
      const returnTo = encodeURIComponent(pathname || "/");
      router.push(`/login?returnTo=${returnTo}`);
      return;
    }
    setBusy(true);
    setError(null);
    openConversation(profileId)
      .then((conversationId) => {
        if (conversationId) {
          // Only a well-formed id ever reaches the address.
          const staged = asServiceId(serviceId);
          router.push(`/chat/${conversationId}${staged ? `?service=${staged}` : ""}`);
        } else {
          setError("We couldn't open a conversation with this freelancer.");
        }
      })
      .finally(() => setBusy(false));
  }

  if (ownProfile) {
    return (
      <Link
        href="/freelancer/profile"
        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100"
      >
        <Pencil className="h-4 w-4" aria-hidden />
        Edit profile
      </Link>
    );
  }

  return (
    <div className={fullWidth ? "flex w-full flex-col gap-2" : "flex flex-col items-start gap-2"}>
      <Button
        onClick={handleMessage}
        disabled={busy || loading}
        className={fullWidth ? "w-full" : undefined}
      >
        <MessageSquare className="mr-1.5 h-4 w-4" aria-hidden />
        {busy ? "Opening chat…" : label}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-error-600">
          {error}
        </p>
      )}
    </div>
  );
}
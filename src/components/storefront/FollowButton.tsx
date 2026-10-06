"use client";

import { useRouter, usePathname } from "next/navigation";
import { BellPlus, BellRing } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/atoms/Button";
import { useStoreFollow } from "@/hooks/use-store-follow";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  vendorId: string;
  storeSlug: string;
  className?: string;
}

/**
 * Auth-aware "Follow Store" button, backed by the real follow API.
 *
 * - Visitors who are signed out are sent through login with a `returnTo`
 *   back to this storefront.
 * - Shows loading / error states and never silently fails.
 */
export function FollowButton({ vendorId, storeSlug, className }: FollowButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user } = useAuth();
  const { following, isLoading, isUpdating, failed, setFollowing } = useStoreFollow(
    storeSlug,
    vendorId
  );

  function handleClick() {
    if (status !== "authenticated" || !user) {
      const returnTo = pathname || `/store/${storeSlug}`;
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    setFollowing(!following);
  }

  const busy = isUpdating || isLoading;

  return (
    <Button
      onClick={handleClick}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5",
        following
          ? "bg-kampmax-muted text-kampmax-text hover:bg-kampmax-muted/70 border border-kampmax-border"
          : "bg-kampmax-navy text-white hover:bg-kampmax-navy-light",
        className
      )}
      aria-pressed={following}
      aria-label={following ? `Unfollow ${storeSlug} store` : `Follow ${storeSlug} store`}
    >
      {busy ? (
        <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : following ? (
        <BellRing className="h-4 w-4" />
      ) : (
        <BellPlus className="h-4 w-4" />
      )}
      <span>
        {isUpdating ? "Working..." : failed ? "Try again" : following ? "Following" : "Follow Store"}
      </span>
    </Button>
  );
}

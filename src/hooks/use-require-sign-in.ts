"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/**
 * Sends a signed-out visitor to the login page, with this page as the place to
 * return to afterwards. For pages that are reached by link or bookmark but can't
 * do anything without an account, so they never sit on a spinner for a guest.
 */
export function useRequireSignIn() {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [status, pathname, router]);
}

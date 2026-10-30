"use client";

import { useLinkStatus } from "next/link";
import { Loader2, type LucideIcon } from "lucide-react";

/**
 * Sidebar icon that swaps to a spinner while its parent <Link> is navigating.
 * Must be rendered inside a next/link <Link> for `useLinkStatus` to work.
 */
export function NavLinkIcon({ icon: Icon }: { icon: LucideIcon }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <Loader2 className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
  ) : (
    <Icon className="h-4 w-4 shrink-0" aria-hidden />
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  FileCheck2,
  House,
  MessageSquareText,
  Wallet,
} from "lucide-react";
import { useAccommodationAgentStatus } from "@/hooks/use-accommodation";

const workspaceLinks = [
  { href: "#agent-profile", label: "Profile", icon: House },
  { href: "#agent-verification", label: "Verification", icon: FileCheck2 },
  { href: "#agent-properties", label: "Properties", icon: Building2 },
  { href: "#agent-listings", label: "Listings", icon: ClipboardList },
  { href: "#agent-enquiries", label: "Enquiries", icon: MessageSquareText },
  { href: "#agent-billing", label: "Billing", icon: Wallet },
];

export function AccommodationAgentPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const status = useAccommodationAgentStatus();
  const isApproved = status.data?.status === "APPROVED";
  const isOnboarding = pathname.endsWith("/onboarding");

  return (
    <div className="min-h-screen bg-kampmax-bg text-kampmax-text">
      <header className="border-b border-kampmax-border bg-kampmax-navy text-white">
        <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div>
            <Link href="/accommodation/agent" className="font-bold tracking-tight">
              Kampmax <span className="font-medium text-white/75">Accommodation</span>
            </Link>
            <p className="text-xs text-white/70">Agent portal</p>
          </div>
          <Link
            href="/accommodation"
            className="text-sm text-white/85 underline-offset-4 hover:underline"
          >
            Browse accommodation
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-col lg:min-h-[calc(100vh-4rem)] lg:flex-row">
        <aside className="border-b border-kampmax-border bg-white p-3 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-5">
          <p className="hidden px-3 pb-3 text-xs font-semibold uppercase tracking-wide text-kampmax-text-secondary lg:block">
            Agent workspace
          </p>
          <nav aria-label="Agent portal navigation" className="flex gap-2 overflow-x-auto lg:flex-col">
            <Link
              href="/accommodation/agent"
              aria-current={!isOnboarding ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
                !isOnboarding
                  ? "bg-kampmax-bg text-kampmax-blue"
                  : "text-kampmax-text-secondary hover:bg-kampmax-bg"
              }`}
            >
              Workspace
            </Link>
            <Link
              href="/accommodation/agent/onboarding"
              aria-current={isOnboarding ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
                isOnboarding
                  ? "bg-kampmax-bg text-kampmax-blue"
                  : "text-kampmax-text-secondary hover:bg-kampmax-bg"
              }`}
            >
              Application & verification
            </Link>
            {!isOnboarding &&
              isApproved &&
              workspaceLinks.map(({ href, label, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-kampmax-text-secondary hover:bg-kampmax-bg hover:text-kampmax-text"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </a>
              ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Pencil, Search, Settings } from "lucide-react";

interface Action {
  href: string;
  label: string;
  icon: typeof Pencil;
}

/** Welcome header + primary quick actions for the overview. */
export function FreelancerQuickActions({ displayName }: { displayName: string }) {
  const actions: Action[] = [
    { href: "/freelancer/profile", label: "Edit profile", icon: Pencil },
    { href: "/freelancer/settings", label: "Settings", icon: Settings },
    { href: "/freelancer/find-work", label: "Find work", icon: Search },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-kampmax-text">Welcome back, {displayName}</h1>
        <p className="mt-0.5 text-sm text-kampmax-text-secondary">
          Here&apos;s what&apos;s happening with your freelancer profile.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.label}
              href={a.href}
              className="inline-flex items-center gap-1.5 rounded-lg border border-kampmax-border bg-white px-3 py-2 text-sm font-medium text-kampmax-text hover:bg-neutral-50"
            >
              <Icon className="h-4 w-4" aria-hidden />
              {a.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

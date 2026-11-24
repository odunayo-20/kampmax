"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/layout/Breadcrumbs";

/** The frame every settings page shares: breadcrumbs, a back button and the title. */
export function SettingsPageShell({
  title,
  trail = [],
  children,
}: {
  title: string;
  /** The pages between Profile and this one, if any. */
  trail?: BreadcrumbItem[];
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <PageContainer className="space-y-4">
      <Breadcrumbs items={[{ label: "Profile", href: "/profile" }, ...trail, { label: title }]} />
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-kampmax-text" />
        </button>
        <h1 className="text-lg font-bold text-kampmax-text">{title}</h1>
      </div>
      {children}
    </PageContainer>
  );
}

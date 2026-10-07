"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { NotificationSettingsPanel } from "@/components/settings/NotificationSettingsPanel";

export default function NotificationSettingsPage() {
  const router = useRouter();

  return (
    <PageContainer className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Profile", href: "/profile" },
          { label: "Notification Settings" },
        ]}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-kampmax-text" />
        </button>
        <h1 className="text-lg font-bold text-kampmax-text">Notification Settings</h1>
      </div>

      <NotificationSettingsPanel />
    </PageContainer>
  );
}

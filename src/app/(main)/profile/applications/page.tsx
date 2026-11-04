"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { MyApplications } from "@/components/applications/MyApplications";

export default function MyApplicationsPage() {
  return (
    <PageContainer className="space-y-4">
      <Breadcrumbs items={[{ label: "Profile", href: "/profile" }, { label: "My applications" }]} />
      <MyApplications />
    </PageContainer>
  );
}

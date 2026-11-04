"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CvLibrary } from "@/components/cv/CvLibrary";

export default function MyCvsPage() {
  return (
    <PageContainer className="space-y-4">
      <Breadcrumbs items={[{ label: "Profile", href: "/profile" }, { label: "My CVs" }]} />
      <CvLibrary />
    </PageContainer>
  );
}

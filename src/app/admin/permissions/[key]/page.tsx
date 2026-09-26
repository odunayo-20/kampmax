"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RoleEditorPanel } from "@/components/admin/rbac/RoleEditorPanel";

export default function AdminRoleDetailPage() {
  const params = useParams<{ key: string }>();
  const key = decodeURIComponent((params?.key ?? "").trim()).toUpperCase();
  const title = key
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");

  return (
    <>
      <Link
        href="/admin/permissions"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-kampmax-text-secondary transition-colors hover:text-kampmax-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All roles
      </Link>
      <AdminPageHeader
        title={`${title} role`}
        description="Permissions this role holds. Changes apply on the next request."
      />
      <RoleEditorPanel roleKey={key} />
    </>
  );
}

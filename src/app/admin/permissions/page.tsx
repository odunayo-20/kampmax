"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { RoleEditorPanel } from "@/components/admin/rbac/RoleEditorPanel";
import { useAdminRoles } from "@/hooks/admin/use-admin-permissions";
import { cn } from "@/lib/utils";

export default function AdminPermissionsPage() {
  const roles = useAdminRoles();
  const [selected, setSelected] = useState("ADMIN");

  // Keep a valid selection whenever the list refreshes.
  useEffect(() => {
    const list = roles.data ?? [];
    if (list.length === 0) return;
    setSelected((prev) => (list.some((r) => r.key === prev) ? prev : list[0].key));
  }, [roles.data]);

  if (roles.isPending) return <LoadingSkeleton variant="cards" rows={3} />;
  if (roles.isError || !roles.data || roles.data.length === 0) {
    return <ErrorState onRetry={() => void roles.refetch()} />;
  }

  return (
    <>
      <AdminPageHeader
        title="Roles & Permissions"
        description="See exactly what each role can do. Changes are saved to the live permission tables and apply on the next request."
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {roles.data.map((role) => {
            const active = selected === role.key;
            return (
              <button
                key={role.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(role.key)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-all",
                  active
                    ? "border-kampmax-blue/50 bg-kampmax-blue/5 shadow-sm ring-1 ring-kampmax-blue/30"
                    : "border-kampmax-border bg-white hover:border-kampmax-blue/30"
                )}
              >
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-kampmax-text">
                  <ShieldCheck
                    className={cn(
                      "h-4 w-4",
                      active ? "text-kampmax-blue" : "text-kampmax-text-secondary"
                    )}
                    aria-hidden
                  />
                  {role.name}
                </span>
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-kampmax-text-secondary">
                  {role.description}
                </p>
                <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-kampmax-border pt-2 text-[11px] tabular-nums text-kampmax-text-secondary">
                  <Link
                    href={`/admin/users?role=${role.key.toLowerCase()}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 hover:text-kampmax-blue"
                  >
                    <Users className="h-3 w-3" aria-hidden />
                    {role.membersCount} member{role.membersCount === 1 ? "" : "s"}
                  </Link>
                  <span className="inline-flex items-center gap-1 font-medium text-kampmax-text">
                    <CheckCircle2 className="h-3 w-3 text-kampmax-success" aria-hidden />
                    {role.permissionsCount}/{role.totalPermissions}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <RoleEditorPanel key={selected} roleKey={selected} />
      </div>
    </>
  );
}

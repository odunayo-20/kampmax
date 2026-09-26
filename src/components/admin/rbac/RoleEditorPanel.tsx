"use client";

import { useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import {
  useAdminPermissionCatalog,
  useAdminRole,
  useResetRolePermissions,
  useSetRolePermissions,
} from "@/hooks/admin/use-admin-permissions";
import { RolePermissionsEditor } from "./RolePermissionsEditor";

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

/** Loads one role and its editor, with save / reset handling and toasts. */
export function RoleEditorPanel({ roleKey }: { roleKey: string }) {
  const { admin } = useAdminSession();
  const role = useAdminRole(roleKey);
  const catalog = useAdminPermissionCatalog();
  const save = useSetRolePermissions();
  const reset = useResetRolePermissions();

  const [resetOpen, setResetOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);
  function pushToast(tone: ToastMessage["tone"], text: string) {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }

  if (role.isPending || catalog.isPending) {
    return <LoadingSkeleton variant="cards" rows={3} />;
  }
  if (role.isError || catalog.isError || !role.data || !catalog.data) {
    return (
      <ErrorState
        title={role.data === null ? "Role not found" : undefined}
        onRetry={() => {
          void role.refetch();
          void catalog.refetch();
        }}
      />
    );
  }

  const data = role.data;

  async function doSave(slugs: string[]) {
    try {
      await save.mutateAsync({ key: data.key, slugs });
      pushToast("success", `${data.name} permissions saved. They apply on the next request.`);
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Couldn't save the permissions.");
    }
  }

  async function doReset() {
    try {
      await reset.mutateAsync(data.key);
      pushToast("success", `${data.name} was reset to its defaults.`);
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Couldn't reset the role.");
    } finally {
      setResetOpen(false);
    }
  }

  return (
    <>
      <RolePermissionsEditor
        role={data}
        catalog={catalog.data}
        canManage={admin?.role === "SUPER_ADMIN"}
        saving={save.isPending || reset.isPending}
        onSave={(slugs) => void doSave(slugs)}
        onReset={() => setResetOpen(true)}
      />

      <ConfirmDialog
        open={resetOpen}
        title={`Reset ${data.name}?`}
        message="This replaces the role's current permissions with the defaults defined for it, and takes effect immediately for everyone holding the role."
        confirmLabel="Reset to defaults"
        tone="warning"
        loading={reset.isPending}
        onConfirm={() => void doReset()}
        onCancel={() => setResetOpen(false)}
      />

      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex max-w-sm items-start gap-2 rounded-lg border border-kampmax-border bg-white px-3.5 py-2.5 text-sm shadow-lg"
          >
            {t.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-success" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-error" />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </>
  );
}

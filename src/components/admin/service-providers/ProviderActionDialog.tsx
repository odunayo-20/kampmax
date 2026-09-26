"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  useAdminServiceProviderApprove,
  useAdminServiceProviderReject,
  useAdminServiceProviderRestore,
  useAdminServiceProviderSuspend,
} from "@/hooks/admin/use-admin-service-providers";
import { PROVIDER_ACTION_COPY, type ProviderActionKind } from "./provider-meta";

export interface ProviderActionTarget {
  id: string;
  name: string;
  kind: ProviderActionKind;
}

/**
 * Confirmation dialog for approve / reject / suspend / restore. Reject and
 * suspend ask for a reason. Reports the outcome through `onDone`.
 */
export function ProviderActionDialog({
  target,
  onClose,
  onDone,
}: {
  target: ProviderActionTarget | null;
  onClose: () => void;
  onDone: (tone: "success" | "error", text: string) => void;
}) {
  const [working, setWorking] = useState(false);
  const approve = useAdminServiceProviderApprove();
  const reject = useAdminServiceProviderReject();
  const suspend = useAdminServiceProviderSuspend();
  const restore = useAdminServiceProviderRestore();

  const copy = target ? PROVIDER_ACTION_COPY[target.kind] : null;

  async function run(reason: string) {
    if (!target) return;
    setWorking(true);
    try {
      if (target.kind === "approve") await approve.mutateAsync(target.id);
      else if (target.kind === "restore") await restore.mutateAsync(target.id);
      else if (target.kind === "reject") await reject.mutateAsync({ id: target.id, reason });
      else await suspend.mutateAsync({ id: target.id, reason });
      onDone("success", PROVIDER_ACTION_COPY[target.kind].success);
    } catch (err) {
      onDone("error", err instanceof Error ? err.message : "The action failed. Try again.");
    } finally {
      setWorking(false);
      onClose();
    }
  }

  return (
    <ConfirmDialog
      open={target !== null}
      title={copy && target ? copy.title(target.name) : ""}
      message={copy?.message ?? ""}
      confirmLabel={copy?.confirm}
      tone={copy?.tone}
      reasonLabel={copy?.reasonLabel}
      loading={working}
      onConfirm={(reason) => void run(reason)}
      onCancel={onClose}
    />
  );
}

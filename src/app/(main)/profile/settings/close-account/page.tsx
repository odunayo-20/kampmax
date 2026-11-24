"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useAuth } from "@/lib/auth-context";
import type { ApiError } from "@/lib/api-client";
import { BLOCKER_FIX, CLOSE_LOSSES, canClose, closeFailure } from "@/lib/account-safety";
import { closeAccount, fetchClosureBlockers } from "@/services/account-safety";

/** Closing the account for good. Anything still open is listed first, with a way to clear it. */
export default function CloseAccountPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [closing, setClosing] = useState(false);
  const check = useQuery({ queryKey: ["closure-blockers"], queryFn: fetchClosureBlockers, enabled: status === "authenticated", staleTime: 0, gcTime: 0 });
  const blockers = check.data ?? [];

  async function submit() {
    setAsking(false);
    setClosing(true);
    setProblem(null);
    try {
      await closeAccount(password);
      // Everything in this browser that belonged to the person goes with the session.
      await logout();
      queryClient.clear();
      router.replace("/login");
    } catch (error) {
      setClosing(false);
      setProblem(closeFailure(error as ApiError));
      // Something may have changed since the check (a new order): look again.
      if ((error as ApiError).status === 409) void check.refetch();
    }
  }

  return (
    <SettingsPageShell title="Close my account" trail={[{ label: "Settings", href: "/profile/settings" }]}>
      {check.isPending ? (
        <div className="flex justify-center py-12" role="status" aria-label="Checking your account">
          <Loader2 className="h-6 w-6 animate-spin text-kampmax-blue" />
        </div>
      ) : check.isError ? (
        <p role="alert" className="text-sm text-kampmax-error">
          Could not check your account.{" "}
          <button className="underline" onClick={() => void check.refetch()}>
            Try again
          </button>
        </p>
      ) : blockers.length > 0 ? (
        <div className="space-y-3">
          <p className="text-base font-semibold text-kampmax-text">Before you can close your account, finish these:</p>
          {blockers.map((b) => (
            <div key={b.code} className="flex gap-3 rounded-xl border border-amber-200 bg-white p-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden />
              <div className="space-y-2">
                <p className="text-sm text-kampmax-text-secondary">{b.message}</p>
                <Link href={BLOCKER_FIX[b.code].href} className="inline-block rounded-lg border border-kampmax-border px-3 py-1.5 text-xs font-semibold text-kampmax-text hover:bg-kampmax-muted">
                  {BLOCKER_FIX[b.code].label}
                </Link>
              </div>
            </div>
          ))}
          <p className="text-xs text-kampmax-text-secondary">Withdraw your money to your bank first, so nothing is lost.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-base font-semibold text-kampmax-text">Closing your account is permanent. Here is what happens:</p>
          <ul className="space-y-2">
            {CLOSE_LOSSES.map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-sm text-kampmax-text-secondary">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
          {problem && (
            <p role="alert" className="text-sm text-kampmax-error">
              {problem}
            </p>
          )}
          <PasswordInput label="Your password" hint="To prove it is you." autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button
            disabled={!canClose(blockers, password) || closing}
            onClick={() => setAsking(true)}
            className="w-full rounded-xl bg-kampmax-error py-3 text-sm font-semibold text-white transition-colors hover:bg-kampmax-error/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {closing ? "Closing…" : "Close my account"}
          </button>
          <button onClick={() => router.back()} className="w-full rounded-xl py-3 text-sm font-semibold text-kampmax-text-secondary hover:bg-kampmax-muted">
            Keep my account
          </button>
        </div>
      )}

      <ConfirmDialog
        open={asking}
        title="Close your account for good?"
        body="This cannot be undone."
        confirmLabel="Close my account"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => void submit()}
        onCancel={() => setAsking(false)}
      />
    </SettingsPageShell>
  );
}

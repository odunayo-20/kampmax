"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/lib/auth-context";
import { orderSessions, otherSessions, sessionLine, type Session } from "@/lib/account-safety";
import { fetchSessions, signOutOtherSessions, signOutSession } from "@/services/account-safety";

const isPhone = (device: string) => /app|android|iphone/i.test(device);

/** Every device signed in to this account, so a stranger's sign-in can be ended. */
export default function SessionsPage() {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: fetchSessions, enabled: status === "authenticated" });
  const [asking, setAsking] = useState<Session | "others" | null>(null);

  const done = () => {
    setAsking(null);
    return queryClient.invalidateQueries({ queryKey: ["sessions"] });
  };
  const signOutOne = useMutation({ mutationFn: signOutSession, onSuccess: done });
  const signOutOthers = useMutation({ mutationFn: signOutOtherSessions, onSuccess: done });

  const list = orderSessions(sessions.data ?? []);
  const others = otherSessions(list);
  const failed = signOutOne.isError || signOutOthers.isError;

  return (
    <SettingsPageShell title="Where you're signed in" trail={[{ label: "Settings", href: "/profile/settings" }]}>
      <p className="text-sm text-kampmax-text-secondary">If you do not recognise a device, sign it out and then change your password.</p>

      {sessions.isPending ? (
        <div className="flex justify-center py-12" role="status" aria-label="Loading your sign-ins">
          <Loader2 className="h-6 w-6 animate-spin text-kampmax-blue" />
        </div>
      ) : sessions.isError ? (
        <p role="alert" className="text-sm text-kampmax-error">
          Could not load your sign-ins.{" "}
          <button className="underline" onClick={() => void sessions.refetch()}>
            Try again
          </button>
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((s) => {
            const Icon = isPhone(s.device) ? Smartphone : Monitor;
            return (
              <li key={s.id} className="flex items-center gap-3 rounded-xl border border-kampmax-border bg-white p-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-kampmax-blue/10 text-kampmax-blue">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-kampmax-text">{s.device}</p>
                    {s.current && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">This device</span>}
                  </div>
                  <p className="text-xs text-kampmax-text-secondary">{sessionLine(s)}</p>
                </div>
                {!s.current && (
                  <button onClick={() => setAsking(s)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-kampmax-error hover:bg-kampmax-error/10">
                    Sign out
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {failed && (
        <p role="alert" className="text-sm text-kampmax-error">
          That did not work. Check your connection and try again.
        </p>
      )}

      {others > 0 && (
        <button
          onClick={() => setAsking("others")}
          className="w-full rounded-xl border border-kampmax-border bg-white py-3 text-sm font-semibold text-kampmax-text hover:bg-kampmax-muted"
        >
          Sign out {others} other {others === 1 ? "device" : "devices"}
        </button>
      )}
      <p className="text-center text-xs text-kampmax-text-secondary">To leave this device, use Log Out in Settings.</p>

      <ConfirmDialog
        open={!!asking && asking !== "others"}
        title={`Sign out ${asking && asking !== "others" ? asking.device : "this device"}?`}
        body="It will need your password to sign in again."
        confirmLabel="Sign out"
        cancelLabel="Keep"
        destructive
        pending={signOutOne.isPending}
        onConfirm={() => asking && asking !== "others" && signOutOne.mutate(asking.id)}
        onCancel={() => setAsking(null)}
      />
      <ConfirmDialog
        open={asking === "others"}
        title="Sign out every other device?"
        body="This device stays signed in."
        confirmLabel="Sign out all"
        cancelLabel="Keep"
        destructive
        pending={signOutOthers.isPending}
        onConfirm={() => signOutOthers.mutate()}
        onCancel={() => setAsking(null)}
      />
    </SettingsPageShell>
  );
}

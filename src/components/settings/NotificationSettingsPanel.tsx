"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SettingsGroup, SettingsRow, SettingsToggle } from "@/components/profile/SettingsGroup";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import {
  fetchNotificationSettings,
  isTypeEnabled,
  NOTIFICATION_GROUPS,
  setChannelEnabled,
  setGroupChannel,
  type NotificationChannel,
} from "@/services/notification-settings";

const KEY = ["notification-settings"] as const;

const CHANNELS: { id: NotificationChannel; label: string; description: string }[] = [
  { id: "inApp", label: "In-app", description: "The bell and your notifications page" },
  { id: "email", label: "Email", description: "Emails to the address on your account" },
  { id: "push", label: "Push", description: "Alerts on your device" },
];

/** Real notification settings: a master switch per channel, then each kind of notification per channel. */
export function NotificationSettingsPanel() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: KEY, queryFn: fetchNotificationSettings, retry: false });

  const save = useMutation({
    mutationFn: async (change: { channel: NotificationChannel; enabled: boolean; types?: string[] }) => {
      if (change.types) await setGroupChannel(change.types, change.channel, change.enabled);
      else await setChannelEnabled(change.channel, change.enabled);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  if (query.isPending) {
    return <p className="py-10 text-center text-sm text-kampmax-text-secondary">Loading your settings…</p>;
  }

  if (query.isError) {
    return (
      <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-6 text-center">
        <p className="text-sm text-kampmax-text-secondary">{getFriendlyErrorMessage(query.error)}</p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-3 text-xs font-semibold text-kampmax-blue hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const settings = query.data;

  return (
    <div className="space-y-4">
      {save.isError && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
          {getFriendlyErrorMessage(save.error)}
        </p>
      )}

      <SettingsGroup title="Where to reach you" description="Turning a channel off silences it for everything.">
        {CHANNELS.map((c) => (
          <SettingsRow
            key={c.id}
            label={c.label}
            description={c.description}
            action={
              <SettingsToggle
                enabled={settings.channels[c.id]}
                onToggle={(enabled) => save.mutate({ channel: c.id, enabled })}
              />
            }
          />
        ))}
      </SettingsGroup>

      {CHANNELS.map((c) => (
        <SettingsGroup
          key={c.id}
          title={`${c.label} notifications`}
          description={
            settings.channels[c.id]
              ? "Choose which kinds of notification you get."
              : `${c.label} is switched off above, so none of these are sent.`}
          className={settings.channels[c.id] ? undefined : "opacity-60"}
        >
          {NOTIFICATION_GROUPS.map((g) => (
            <SettingsRow
              key={g.id}
              label={g.label}
              description={g.description}
              action={
                <SettingsToggle
                  enabled={isTypeEnabled(settings, g.types, c.id)}
                  onToggle={(enabled) => save.mutate({ channel: c.id, enabled, types: g.types })}
                />
              }
            />
          ))}
        </SettingsGroup>
      ))}
    </div>
  );
}

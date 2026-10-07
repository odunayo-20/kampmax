import { apiClient, type ApiError } from "@/lib/api-client";

// The user's real notification preferences (GET/PATCH /notification-preferences).
// A channel switch is the master for that channel; a per-type value overrides it
// for one kind of notification. Failures throw: nothing is saved locally.

export type NotificationChannel = "inApp" | "email" | "push";

const CHANNEL_TO_TYPE_KEY: Record<NotificationChannel, "inApp" | "email" | "push"> = {
  inApp: "inApp",
  email: "email",
  push: "push",
};

/** How the backend's notification types are grouped for the settings screen. */
export const NOTIFICATION_GROUPS: { id: string; label: string; description: string; types: string[] }[] = [
  { id: "orders", label: "Orders", description: "Status changes and delivery updates", types: ["ORDER"] },
  { id: "payments", label: "Payments & wallet", description: "Payments, refunds and withdrawals", types: ["PAYMENT"] },
  { id: "messages", label: "Messages", description: "New messages from other users", types: ["MESSAGE"] },
  { id: "store", label: "Your store", description: "Store alerts for sellers", types: ["VENDOR"] },
  { id: "work", label: "Jobs & contracts", description: "Proposals, jobs and engagements", types: ["JOB", "PROPOSAL", "ENGAGEMENT"] },
  { id: "reviews", label: "Reviews", description: "New reviews and replies", types: ["REVIEW"] },
  { id: "community", label: "Community", description: "Follows, likes and comments", types: ["FOLLOW", "LIKE", "COMMENT"] },
  { id: "events", label: "Events", description: "Tickets and event reminders", types: ["EVENT"] },
  { id: "rewards", label: "Rewards", description: "Loyalty points and offers", types: ["LOYALTY"] },
  { id: "account", label: "Account & safety", description: "Verification, profile and platform notices", types: ["VERIFICATION", "PROFILE", "ADMIN", "SYSTEM"] },
];

type TypeSettings = Record<string, Record<string, boolean>>;

export interface NotificationSettings {
  channels: Record<NotificationChannel, boolean>;
  typeSettings: TypeSettings;
}

interface BackendPreferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  typeSettings: TypeSettings | null;
}

function failure(error: ApiError | null, fallback: string): Error {
  return new Error(error?.message || fallback);
}

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const { data, error } = await apiClient.get<BackendPreferences>("/notification-preferences");
  if (error || !data) throw failure(error, "Could not load your notification settings.");
  return {
    channels: { inApp: data.inAppEnabled, email: data.emailEnabled, push: data.pushEnabled },
    typeSettings: data.typeSettings ?? {},
  };
}

const MASTER_FIELD: Record<NotificationChannel, keyof Pick<BackendPreferences, "inAppEnabled" | "emailEnabled" | "pushEnabled">> = {
  inApp: "inAppEnabled",
  email: "emailEnabled",
  push: "pushEnabled",
};

export async function setChannelEnabled(channel: NotificationChannel, enabled: boolean): Promise<void> {
  const { error } = await apiClient.patch("/notification-preferences", { [MASTER_FIELD[channel]]: enabled });
  if (error) throw failure(error, "Could not save that change.");
}

/** Whether a kind of notification is on for a channel (on unless it was switched off). */
export function isTypeEnabled(settings: NotificationSettings, types: string[], channel: NotificationChannel): boolean {
  return types.every((t) => settings.typeSettings[t]?.[CHANNEL_TO_TYPE_KEY[channel]] !== false);
}

export async function setGroupChannel(types: string[], channel: NotificationChannel, enabled: boolean): Promise<void> {
  const typeSettings: TypeSettings = {};
  for (const t of types) typeSettings[t] = { [CHANNEL_TO_TYPE_KEY[channel]]: enabled };
  const { error } = await apiClient.patch("/notification-preferences", { typeSettings });
  if (error) throw failure(error, "Could not save that change.");
}

"use client";

// ============================================================
// ADMIN PLATFORM SETTINGS HOOKS (Module 50)
// ============================================================
//
// TanStack Query wrappers over the settings-config service
// (`/admin/settings` console, backed by the live API). Keys are neither
// user- nor campus-scoped: the settings surface is restricted to full
// operators via nav permissions, so there is no campus shard. Mutations
// invalidate the whole `adminKeys.settings` tree so the console and any
// open section form refresh together.
//
// SECURITY NOTE: what the operator may edit is decided by the server and
// returned with the state (`access`); the API enforces it again on every
// write, so the UI gating here is only a convenience.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import { settingsConfigService } from "@/services/admin";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import type { PlatformSettingsConfig, SettingsSectionKey } from "@/types/admin";

function useActor() {
  const { admin } = useAdminSession();
  if (!admin) {
    throw new Error("Admin settings hooks require an authenticated admin session");
  }
  return admin;
}

/** Config, per-section versions and the operator's edit access. */
export function usePlatformSettings() {
  useActor();
  return useQuery({
    queryKey: adminKeys.settings.config(),
    queryFn: () => settingsConfigService.getState(),
  });
}

export function useSaveSettingsSection() {
  useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      section,
      value,
      expectedVersion,
    }: {
      section: SettingsSectionKey;
      value: PlatformSettingsConfig[SettingsSectionKey];
      expectedVersion?: number;
    }) => settingsConfigService.save(section, value, expectedVersion),
    mutationKey: adminKeys.settings.mutation(),
    // Refetch on failure too: a 409 means our versions are stale.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.settings.all });
    },
  });
}

export function useResetSettingsSection() {
  useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      section,
      expectedVersion,
    }: {
      section: SettingsSectionKey;
      expectedVersion?: number;
    }) => settingsConfigService.resetSection(section, expectedVersion),
    mutationKey: adminKeys.settings.mutation(),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.settings.all });
    },
  });
}

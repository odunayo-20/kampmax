"use client";

// TanStack Query wrappers over the live roles & permissions API.
// Saving a role invalidates the whole ["admin", "permissions"] tree.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { permissionsService } from "@/services/admin/permissions.api";

const ROOT = ["admin", "permissions"] as const;

export function useAdminRoles() {
  return useQuery({
    queryKey: [...ROOT, "roles"],
    queryFn: () => permissionsService.listRoles(),
  });
}

export function useAdminRole(key: string) {
  return useQuery({
    queryKey: [...ROOT, "role", key],
    queryFn: () => permissionsService.getRole(key),
    enabled: key.length > 0,
  });
}

export function useAdminPermissionCatalog() {
  return useQuery({
    queryKey: [...ROOT, "catalog"],
    queryFn: () => permissionsService.getCatalog(),
    staleTime: 5 * 60_000,
  });
}

export function useSetRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, slugs }: { key: string; slugs: string[] }) =>
      permissionsService.setPermissions(key, slugs),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROOT });
    },
  });
}

export function useResetRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => permissionsService.reset(key),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROOT });
    },
  });
}

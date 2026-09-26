"use client";

// ============================================================
// ADMIN USER DIRECTORY HOOKS (Module 35)
//
// TanStack Query wrappers over the hardened user-management service.
// Keys are scope-qualified by the acting operator's campus so a
// campus-scoped admin's cache can never leak rows/counts across campus
// boundaries. Mutations invalidate the whole `adminKeys.users` tree so
// list, counts, detail and activity stay consistent.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import {
  fetchUserCampusOptions,
  getUserActionPolicy,
  userManagementService,
  type UserActionPolicy,
  type ManagedUserListQuery,
} from "@/services/admin";
import type { ManagedUser, ManagedUserStatus, ManagedUserUpdateInput } from "@/types/admin";
import { useAdminSession } from "@/lib/admin/admin-auth-context";

function useActor() {
  const { admin } = useAdminSession();
  if (!admin) {
    throw new Error("Admin user hooks require an authenticated admin session");
  }
  return admin;
}

export function useAdminUsers(query: ManagedUserListQuery) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.users.list(query, admin.campusId),
    queryFn: () => userManagementService.list(query, { actor: admin }),
  });
}

export function useAdminUserCampuses() {
  return useQuery({
    queryKey: [...adminKeys.users.all, "campuses"],
    queryFn: fetchUserCampusOptions,
    staleTime: 5 * 60_000,
  });
}

export function useAdminUserCounts() {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.users.counts(admin.campusId),
    queryFn: () => userManagementService.getCounts({ actor: admin }),
  });
}

export function useAdminUser(id: string) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.users.detail(id, admin.campusId),
    queryFn: () => userManagementService.getById(id, { actor: admin }),
  });
}

export function useAdminUserActivity(id: string) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.users.activity(id, admin.campusId),
    queryFn: () => userManagementService.getActivity(id, { actor: admin }),
  });
}

/** Action policy for a directory row, derived from the acting operator. */
export function useAdminUserPolicy(target: {
  email: string;
  role: ManagedUser["role"];
  status: ManagedUserStatus;
}): UserActionPolicy {
  const admin = useActor();
  return getUserActionPolicy(admin, target);
}

export function useAdminUserSetStatusMutation() {
  const admin = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ManagedUserStatus }) =>
      userManagementService.setStatus(id, status, { actor: admin }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users.all });
    },
  });
}

export function useAdminUserUpdateMutation() {
  const admin = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ManagedUserUpdateInput }) =>
      userManagementService.update(id, patch, { actor: admin }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users.all });
    },
  });
}

export function useAdminUserResetStateMutation() {
  const admin = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userManagementService.resetAccountState(id, { actor: admin }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users.all });
    },
  });
}
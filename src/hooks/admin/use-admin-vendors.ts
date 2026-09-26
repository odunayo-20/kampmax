"use client";

// ============================================================
// ADMIN VENDOR MANAGEMENT HOOKS (Module 38)
// ============================================================
//
// TanStack Query wrappers over the vendor-management service.
// Keys are scope-qualified by the acting operator's campus so a
// campus-scoped admin's cache can never leak rows/counts across
// campus boundaries. Mutations invalidate the whole `adminKeys.vendors`
// tree so list, counts, detail and activity stay consistent.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import {
  fetchVendorCampusOptions,
  reviewVendorDocument,
  vendorManagementService,
} from "@/services/admin";
import type { ManagedVendorListQuery } from "@/services/admin/vendor-management.service";
import { useAdminSession } from "@/lib/admin/admin-auth-context";

function useActor() {
  const { admin } = useAdminSession();
  if (!admin) {
    throw new Error("Admin vendor hooks require an authenticated admin session");
  }
  return admin;
}

export function useAdminVendors(query: ManagedVendorListQuery) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.vendors.list(query, admin.campusId),
    queryFn: () => vendorManagementService.list(query),
  });
}

export function useAdminVendorCounts() {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.vendors.counts(admin.campusId),
    queryFn: () => vendorManagementService.getCounts(),
  });
}

export function useAdminVendorCampuses() {
  return useQuery({
    queryKey: [...adminKeys.vendors.all, "campuses"],
    queryFn: fetchVendorCampusOptions,
    staleTime: 5 * 60_000,
  });
}

export function useAdminVendorCategories() {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.vendors.categories(admin.campusId),
    queryFn: () => vendorManagementService.getCategories(),
  });
}

export function useAdminVendor(id: string) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.vendors.detail(id, admin.campusId),
    queryFn: () => vendorManagementService.getById(id),
  });
}

export function useAdminVendorActivity(id: string) {
  const admin = useActor();
  return useQuery({
    queryKey: adminKeys.vendors.activity(id, admin.campusId),
    queryFn: () => vendorManagementService.getActivity(id),
  });
}

function useVendorTreeInvalidator() {
  const queryClient = useQueryClient();
  return {
    invalidate: () => void queryClient.invalidateQueries({ queryKey: adminKeys.vendors.all }),
  };
}

/** Approve / reject one KYC document; resolves with the refreshed store. */
export function useAdminVendorDocumentReviewMutation() {
  const { invalidate } = useVendorTreeInvalidator();
  return useMutation({
    mutationFn: (input: {
      vendorId: string;
      documentId: string;
      decision: "approve" | "reject";
      reason?: string;
    }) =>
      reviewVendorDocument(
        input.vendorId,
        input.documentId,
        input.decision,
        input.reason
      ),
    onSuccess: invalidate,
  });
}

export function useAdminVendorApproveMutation() {
  const { invalidate } = useVendorTreeInvalidator();
  const admin = useActor();
  return useMutation({
    mutationFn: (id: string) => vendorManagementService.approve(id, { actor: admin }),
    onSuccess: invalidate,
  });
}

export function useAdminVendorRejectMutation() {
  const { invalidate } = useVendorTreeInvalidator();
  const admin = useActor();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      vendorManagementService.reject(id, reason, { actor: admin }),
    onSuccess: invalidate,
  });
}

export function useAdminVendorSuspendMutation() {
  const { invalidate } = useVendorTreeInvalidator();
  const admin = useActor();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      vendorManagementService.suspend(id, { actor: admin }, reason),
    onSuccess: invalidate,
  });
}

export function useAdminVendorActivateMutation() {
  const { invalidate } = useVendorTreeInvalidator();
  const admin = useActor();
  return useMutation({
    mutationFn: (id: string) => vendorManagementService.activate(id, { actor: admin }),
    onSuccess: invalidate,
  });
}

export function useAdminVendorDeactivateMutation() {
  const { invalidate } = useVendorTreeInvalidator();
  const admin = useActor();
  return useMutation({
    mutationFn: (id: string) => vendorManagementService.deactivate(id, { actor: admin }),
    onSuccess: invalidate,
  });
}
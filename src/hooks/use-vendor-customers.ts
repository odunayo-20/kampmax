"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { vendorCustomerKeys } from "@/lib/query-keys";
import {
  createVendorCustomerNote,
  editVendorCustomerNote,
  fetchVendorCustomer,
  fetchVendorCustomerCounts,
  fetchVendorCustomerNotes,
  fetchVendorCustomers,
  removeVendorCustomerNote,
} from "@/services/vendor-customers-api";
import type { VendorCustomerQuery } from "@/types/vendor-customers";

const STALE_MS = 15_000;

function useAuthenticated() {
  return useAuth().status === "authenticated";
}

export function useVendorCustomers(query: VendorCustomerQuery) {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorCustomerKeys.list(query),
    queryFn: () => fetchVendorCustomers(query),
    enabled,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useVendorCustomerCounts() {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorCustomerKeys.counts(),
    queryFn: fetchVendorCustomerCounts,
    enabled,
    staleTime: STALE_MS,
  });
}

export function useVendorCustomer(buyerId: string) {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorCustomerKeys.detail(buyerId),
    queryFn: () => fetchVendorCustomer(buyerId),
    enabled,
    staleTime: STALE_MS,
  });
}

export function useVendorCustomerNotes(buyerId: string) {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorCustomerKeys.notes(buyerId),
    queryFn: () => fetchVendorCustomerNotes(buyerId),
    enabled,
    staleTime: STALE_MS,
  });
}

function useInvalidateCustomers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: vendorCustomerKeys.all });
}

export function useAddCustomerNote(buyerId: string) {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: (body: string) => createVendorCustomerNote(buyerId, body.trim()),
    onSuccess: invalidate,
  });
}

export function useUpdateCustomerNote() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: ({ noteId, body }: { noteId: string; body: string }) =>
      editVendorCustomerNote(noteId, body.trim()),
    onSuccess: invalidate,
  });
}

export function useDeleteCustomerNote() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: (noteId: string) => removeVendorCustomerNote(noteId),
    onSuccess: invalidate,
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  fetchFreelancerVerification,
  fetchVendorVerification,
  requestFreelancerVerification,
  setVendorBusinessType,
  submitVendorVerification,
  uploadVendorDocument,
  type VendorBusinessType,
} from "@/services/verification";

const VENDOR_KEY = ["verification", "vendor"] as const;
const FREELANCER_KEY = ["verification", "freelancer"] as const;

/** The signed-in vendor's real verification state; shared by the page and the banner. */
export function useVendorVerification() {
  const { status } = useAuth();
  return useQuery({
    queryKey: VENDOR_KEY,
    queryFn: fetchVendorVerification,
    enabled: status === "authenticated",
    staleTime: 30_000,
    retry: false,
  });
}

export function useVendorVerificationActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: VENDOR_KEY });
  return {
    upload: useMutation({
      mutationFn: ({ type, file }: { type: string; file: File }) => uploadVendorDocument(type, file),
      onSuccess: refresh,
    }),
    changeBusinessType: useMutation({
      mutationFn: (type: VendorBusinessType) => setVendorBusinessType(type),
      onSuccess: refresh,
    }),
    submit: useMutation({ mutationFn: submitVendorVerification, onSuccess: refresh }),
  };
}

export function useFreelancerVerification() {
  const { status } = useAuth();
  return useQuery({
    queryKey: FREELANCER_KEY,
    queryFn: fetchFreelancerVerification,
    enabled: status === "authenticated",
    staleTime: 30_000,
    retry: false,
  });
}

export function useRequestFreelancerVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestFreelancerVerification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FREELANCER_KEY }),
  });
}

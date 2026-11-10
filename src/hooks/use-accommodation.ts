"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { publicAccommodationKeys } from "@/lib/query-keys";
import {
  accommodationApi,
  type AccommodationSearchQuery,
  type CreateAccommodationEnquiry,
  type CreateAccommodationListing,
  type CreateAccommodationProperty,
  type CreateAgentApplication,
  type CreateAccommodationUnit,
  type UpdateAccommodationListing,
  type UpdateAccommodationProperty,
} from "@/services/accommodation";
import type {
  AccommodationAgentStatus,
  AccommodationEnquiry,
  AgentDocumentType,
} from "@/types/accommodation";

export function useAccommodationListings(query: AccommodationSearchQuery) {
  return useQuery({
    queryKey: publicAccommodationKeys.search(query),
    queryFn: ({ signal }) => accommodationApi.search(query, signal),
  });
}

export function useAccommodationListing(id: string) {
  return useQuery({
    queryKey: publicAccommodationKeys.listing(id),
    queryFn: () => accommodationApi.listing(id),
    enabled: Boolean(id),
  });
}

export function useAccommodationCatalog() {
  return useQuery({
    queryKey: publicAccommodationKeys.catalog,
    queryFn: async () => {
      const [categories, amenities, packages] = await Promise.all([
        accommodationApi.categories(),
        accommodationApi.amenities(),
        accommodationApi.packages(),
      ]);
      return { categories, amenities, packages };
    },
  });
}

export function useAccommodationAgentStatus() {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: publicAccommodationKeys.agentStatus(user?.id),
    queryFn: () => accommodationApi.agentStatus(),
    enabled: status === "authenticated" && Boolean(user?.id),
  });
}

export function useAccommodationAgentProfile(enabled: boolean) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: publicAccommodationKeys.agentProfile(user?.id),
    queryFn: () => accommodationApi.agentProfile(),
    enabled: enabled && status === "authenticated" && Boolean(user?.id),
  });
}

export function useAccommodationProperties(page = 1, enabled = true) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: publicAccommodationKeys.properties(user?.id, page),
    queryFn: () => accommodationApi.properties(page),
    enabled: enabled && status === "authenticated" && Boolean(user?.id),
  });
}

export function useAccommodationSubscriptions(page = 1, enabled = true) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: ["accommodation", "subscriptions", user?.id, page],
    queryFn: () => accommodationApi.subscriptions(page),
    enabled: enabled && status === "authenticated" && Boolean(user?.id),
  });
}

export function useAccommodationPayments(page = 1, enabled = true) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: ["accommodation", "payments", user?.id, page],
    queryFn: () => accommodationApi.paymentHistory(page),
    enabled: enabled && status === "authenticated" && Boolean(user?.id),
  });
}

export function useAgentAccommodationListings(page = 1, enabled = true) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: publicAccommodationKeys.agentListings(user?.id, page),
    queryFn: () => accommodationApi.listings(page),
    enabled: enabled && status === "authenticated" && Boolean(user?.id),
  });
}

export function useSavedAccommodationListings(page = 1) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: publicAccommodationKeys.saved(user?.id, page),
    queryFn: () => accommodationApi.savedListings(page),
    enabled: status === "authenticated" && Boolean(user?.id),
  });
}

export function useAccommodationEnquiries(role: "USER" | "AGENT", page = 1) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: publicAccommodationKeys.enquiries(user?.id, role, page),
    queryFn: () =>
      role === "AGENT"
        ? accommodationApi.agentEnquiries(page)
        : accommodationApi.myEnquiries(page),
    enabled: status === "authenticated" && Boolean(user?.id),
  });
}

export function useAccommodationEnquiry(id: string) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: publicAccommodationKeys.enquiry(user?.id, id),
    queryFn: () => accommodationApi.enquiry(id),
    enabled: status === "authenticated" && Boolean(user?.id && id),
  });
}

function useRefreshAccommodation() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: publicAccommodationKeys.all });
}

export function useApplyAsAccommodationAgent() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (input: CreateAgentApplication) => accommodationApi.applyAsAgent(input),
    onSuccess: refresh,
  });
}

export function useUpdateAccommodationAgent() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (input: { phone?: string; email?: string; operatingLocation?: string; agencyName?: string; businessAddress?: string }) =>
      accommodationApi.updateAgent(input),
    onSuccess: refresh,
  });
}

export function useUploadAccommodationDocument() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ file, documentType }: { file: File; documentType: AgentDocumentType }) =>
      accommodationApi.uploadAgentDocument(file, documentType),
    onSuccess: refresh,
  });
}

export function useRemoveAccommodationDocument() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (id: string) => accommodationApi.removeAgentDocument(id),
    onSuccess: refresh,
  });
}

export function useCreateAccommodationProperty() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (input: CreateAccommodationProperty) =>
      accommodationApi.createProperty(input),
    onSuccess: refresh,
  });
}

export function useAddAccommodationUnit() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ propertyId, input }: { propertyId: string; input: CreateAccommodationUnit }) =>
      accommodationApi.addUnit(propertyId, input),
    onSuccess: refresh,
  });
}

export function useUpdateAccommodationProperty() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAccommodationProperty }) =>
      accommodationApi.updateProperty(id, input),
    onSuccess: refresh,
  });
}

export function useArchiveAccommodationProperty() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (id: string) => accommodationApi.archiveProperty(id),
    onSuccess: refresh,
  });
}

export function useUpdateAccommodationUnit() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({
      propertyId,
      unitId,
      input,
    }: {
      propertyId: string;
      unitId: string;
      input: Partial<CreateAccommodationUnit>;
    }) => accommodationApi.updateUnit(propertyId, unitId, input),
    onSuccess: refresh,
  });
}

export function useArchiveAccommodationUnit() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ propertyId, unitId }: { propertyId: string; unitId: string }) =>
      accommodationApi.archiveUnit(propertyId, unitId),
    onSuccess: refresh,
  });
}

export function useCreateAccommodationListing() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (input: CreateAccommodationListing) =>
      accommodationApi.createListing(input),
    onSuccess: refresh,
  });
}

export function useUpdateAccommodationListing() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAccommodationListing }) =>
      accommodationApi.updateListing(id, input),
    onSuccess: refresh,
  });
}

export function useArchiveAccommodationListing() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (id: string) => accommodationApi.archiveListing(id),
    onSuccess: refresh,
  });
}

export function useConfirmAccommodationAvailability() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({
      id,
      availabilityStatus,
    }: {
      id: string;
      availabilityStatus?: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "UNAVAILABLE";
    }) => accommodationApi.confirmAvailability(id, availabilityStatus),
    onSuccess: refresh,
  });
}

export function useSubmitAccommodationListing() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (id: string) => accommodationApi.submitListing(id),
    onSuccess: refresh,
  });
}

export function useSubscribeAccommodationListing() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({
      id,
      packageId,
      autoRenew,
    }: {
      id: string;
      packageId?: string;
      autoRenew: boolean;
    }) =>
      accommodationApi.subscribeListing(id, {
        acceptBillingTerms: true,
        autoRenew,
        packageId,
        callbackUrl:
          typeof window === "undefined"
            ? undefined
            : `${window.location.origin}/accommodation/agent?payment=return`,
      }),
    onSuccess: refresh,
  });
}

export function useCreateAccommodationEnquiry() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({
      listingId,
      input,
    }: {
      listingId: string;
      input: CreateAccommodationEnquiry;
    }) => accommodationApi.createEnquiry(listingId, input),
    onSuccess: refresh,
  });
}

export function useReportAccommodationListing() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({
      id,
      reason,
      description,
    }: {
      id: string;
      reason: "FRAUD" | "FAKE_LISTING" | "UNAVAILABLE" | "INCORRECT_INFO" | "DUPLICATE" | "OTHER";
      description?: string;
    }) => accommodationApi.reportListing(id, { reason, description }),
    onSuccess: refresh,
  });
}

export function useSaveAccommodationListing() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (id: string) => accommodationApi.saveListing(id),
    onSuccess: refresh,
  });
}

export function useUnsaveAccommodationListing() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (id: string) => accommodationApi.unsaveListing(id),
    onSuccess: refresh,
  });
}

export function useReplyToAccommodationEnquiry() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      accommodationApi.replyToEnquiry(id, body),
    onSuccess: refresh,
  });
}

export function useSetAccommodationEnquiryStatus() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AccommodationEnquiry["status"] }) =>
      accommodationApi.setEnquiryStatus(id, status),
    onSuccess: refresh,
  });
}

export function useRequestAccommodationInspection() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ id, requestedDate, notes }: { id: string; requestedDate: string; notes?: string }) =>
      accommodationApi.requestInspection(id, requestedDate, notes),
    onSuccess: refresh,
  });
}

export function useRespondToAccommodationInspection() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({
      id,
      action,
      date,
      note,
    }: {
      id: string;
      action: "CONFIRM" | "REJECT" | "PROPOSE";
      date?: string;
      note?: string;
    }) => accommodationApi.respondToInspection(id, { action, date, note }),
    onSuccess: refresh,
  });
}

export function useAnswerAccommodationInspection() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "ACCEPT" | "DECLINE" }) =>
      accommodationApi.answerInspection(id, action),
    onSuccess: refresh,
  });
}

export function useCancelAccommodationInspection() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (id: string) => accommodationApi.cancelInspection(id),
    onSuccess: refresh,
  });
}

export function useCompleteAccommodationInspection() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (id: string) => accommodationApi.completeInspection(id),
    onSuccess: refresh,
  });
}

export function useCancelAccommodationRenewal() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (id: string) => accommodationApi.cancelRenewal(id),
    onSuccess: refresh,
  });
}

export function useEnableAccommodationRenewal() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: (id: string) => accommodationApi.enableRenewal(id),
    onSuccess: refresh,
  });
}

export function useRenewAccommodationSubscription() {
  const refresh = useRefreshAccommodation();
  return useMutation({
    mutationFn: ({ id, autoRenew }: { id: string; autoRenew: boolean }) =>
      accommodationApi.renewSubscription(id, {
        acceptBillingTerms: true,
        autoRenew,
        callbackUrl:
          typeof window === "undefined"
            ? undefined
            : `${window.location.origin}/accommodation/agent?payment=return`,
      }),
    onSuccess: refresh,
  });
}

export function isApprovedAccommodationAgent(status: AccommodationAgentStatus | null | undefined) {
  return status === "APPROVED";
}

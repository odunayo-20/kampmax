"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { publicAccommodationKeys } from "@/lib/query-keys";
import { isFinalEnquiry } from "@/lib/accommodation-enquiry";
import { afterPaymentText, CHECK_DELAYS, CHECKING_TEXT, paymentOutcome, STILL_WAITING_TEXT, TOO_MANY_CHECKS } from "@/lib/agent-billing";
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
  AccommodationPayment,
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
    queryFn: () => accommodationApi.subscriptions(page, 100),
    enabled: enabled && status === "authenticated" && Boolean(user?.id),
  });
}

export function useAccommodationPayments(page = 1, enabled = true) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: ["accommodation", "payments", user?.id, page],
    queryFn: () => accommodationApi.paymentHistory(page, 100),
    enabled: enabled && status === "authenticated" && Boolean(user?.id),
  });
}

export function useAccommodationAgentOverview(enabled = true) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: [...publicAccommodationKeys.all, "overview", user?.id] as const,
    queryFn: () => accommodationApi.agentOverview(),
    enabled: enabled && status === "authenticated" && Boolean(user?.id),
  });
}

/** The agent's listings, up to 100 at once as on mobile, so the filters count all of them. */
export function useAgentAccommodationListings(page = 1, enabled = true) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: publicAccommodationKeys.agentListings(user?.id, page),
    queryFn: () => accommodationApi.listings(page, 100),
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

/** `pollMs` re-checks while the page is open (and in view), so a reply shows without a reload. */
export function useAccommodationEnquiries(role: "USER" | "AGENT", page = 1, pollMs?: number) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: publicAccommodationKeys.enquiries(user?.id, role, page),
    queryFn: () =>
      role === "AGENT"
        ? accommodationApi.agentEnquiries(page)
        : accommodationApi.myEnquiries(page),
    enabled: status === "authenticated" && Boolean(user?.id),
    refetchInterval: pollMs,
  });
}

/** The agent's visits; `pollMs` re-checks for new requests while the page is open. */
export function useAgentAccommodationInspections(pollMs?: number) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: [...publicAccommodationKeys.all, "agent-inspections", user?.id] as const,
    queryFn: () => accommodationApi.agentInspections(),
    enabled: status === "authenticated" && Boolean(user?.id),
    refetchInterval: pollMs,
  });
}

/** `pollMs` checks an open enquiry for replies; a closed one takes no more, so it stops. */
export function useAccommodationEnquiry(id: string, pollMs?: number) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: publicAccommodationKeys.enquiry(user?.id, id),
    queryFn: () => accommodationApi.enquiry(id),
    enabled: status === "authenticated" && Boolean(user?.id && id),
    refetchInterval: pollMs ? (query) => (query.state.data && isFinalEnquiry(query.state.data.status) ? false : pollMs) : undefined,
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
            : `${window.location.origin}/agent/billing`,
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
            : `${window.location.origin}/agent/billing`,
      }),
    onSuccess: refresh,
  });
}

export type AccommodationPaymentNotice = {
  tone: "ok" | "wait" | "error";
  text: string;
  /** The payment this is about, so "Check again" can ask about it. */
  reference?: string;
  /** Its listing, for "View my listing". */
  listingId?: string;
  /** True once automatic checks have stopped without an answer. */
  canRetry?: boolean;
};

/** What to tell the agent about a payment the server has answered for. */
export function paymentReturnNotice(
  payment: Pick<AccommodationPayment, "status" | "paymentType"> & { amount?: number; failureReason?: string | null }
): AccommodationPaymentNotice {
  const outcome = paymentOutcome(payment.status);
  if (outcome === "paid") {
    return {
      tone: "ok",
      text: payment.paymentType === "INITIAL" ? afterPaymentText(payment.amount ?? 1) : "Payment received. Your listing has been renewed.",
    };
  }
  if (outcome === "waiting") return { tone: "wait", text: STILL_WAITING_TEXT };
  const why = payment.failureReason?.trim();
  return { tone: "error", text: `${why ? `${why}. ` : ""}That payment did not go through, so nothing was charged. You can try again from the listing.` };
}

/**
 * Paystack sends the agent back with ?reference=ACC-…; this asks the server about that payment, tidies the URL, and
 * keeps asking at growing intervals while the bank has not answered, then stops and offers "Check again". `check`
 * starts the same for any payment (a pending row on Billing). Other payments' references are ignored.
 */
export function useAccommodationPaymentReturn(delays: number[] = CHECK_DELAYS) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<AccommodationPaymentNotice | null>(null);
  const handled = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const round = useRef(0);

  const check = useCallback(
    (reference: string) => {
      clearTimeout(timer.current);
      const mine = ++round.current;
      let i = 0;
      const refresh = () => void queryClient.invalidateQueries({ queryKey: publicAccommodationKeys.all });
      setNotice({ tone: "wait", text: CHECKING_TEXT, reference });
      const run = async () => {
        try {
          const payment = await accommodationApi.verifyPayment(reference);
          if (mine !== round.current) return;
          const base = { reference, listingId: payment.listingId };
          if (paymentOutcome(payment.status) !== "waiting") {
            setNotice({ ...paymentReturnNotice(payment), ...base });
            return refresh();
          }
          if (i >= delays.length) {
            setNotice({ tone: "wait", text: STILL_WAITING_TEXT, ...base, canRetry: true });
            return refresh();
          }
          timer.current = setTimeout(() => void run(), delays[i++] * 1000);
        } catch (error) {
          if (mine !== round.current) return;
          const limited = (error as { status?: number }).status === 429;
          setNotice({ tone: limited ? "wait" : "error", text: limited ? TOO_MANY_CHECKS : getFriendlyErrorMessage(error), reference, canRetry: true });
          refresh();
        }
      };
      void run();
    },
    [delays, queryClient]
  );

  useEffect(() => {
    if (handled.current) return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") ?? params.get("trxref");
    if (!reference?.startsWith("ACC-")) return;
    handled.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    check(reference);
  }, [check]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { notice, check };
}

export function isApprovedAccommodationAgent(status: AccommodationAgentStatus | null | undefined) {
  return status === "APPROVED";
}

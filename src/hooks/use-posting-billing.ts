"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { postingKeys } from "@/lib/query-keys";
import {
  getPostingBillingSummary,
  getPostingPricing,
  getPublishQuote,
  getRenewalQuote,
  listPostingCharges,
  type PostingBillingSummary,
  type PostingCharge,
  type PostingPricing,
  type PostingQuote,
  type RenewalQuote,
} from "@/services/jobs";

/** What posting costs, and how many free postings this employer has left. */
export function usePostingPricing() {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: postingKeys.pricing(userId),
    enabled: status === "authenticated" && !!userId,
    queryFn: async (): Promise<PostingPricing> => {
      const { pricing, error } = await getPostingPricing();
      if (error || !pricing) throw error ?? new Error("The backend returned no data.");
      return pricing;
    },
  });
}

/** Free postings left and the wallet balance. */
export function usePostingBillingSummary() {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: postingKeys.summary(userId),
    enabled: status === "authenticated" && !!userId,
    queryFn: async (): Promise<PostingBillingSummary> => {
      const { summary, error } = await getPostingBillingSummary();
      if (error || !summary) throw error ?? new Error("The backend returned no data.");
      return summary;
    },
  });
}

export interface PostingChargesPage {
  items: PostingCharge[];
  total: number;
  page: number;
  totalPages: number;
}

/** Posting fees paid, free postings used and refunds, newest first. */
export function usePostingCharges(page: number) {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: postingKeys.charges(userId, page),
    enabled: status === "authenticated" && !!userId,
    queryFn: async (): Promise<PostingChargesPage> => {
      const { charges, total, page: current, totalPages, error } = await listPostingCharges({
        page,
        limit: 10,
      });
      if (error) throw error;
      return { items: charges, total, page: current, totalPages };
    },
  });
}

/**
 * What publishing this draft would cost right now. Only asked for while the
 * confirm dialog is open (`enabled`), and never cached stale: the answer
 * depends on the wallet and the free postings left at that moment.
 */
export function usePublishQuote(jobId: string, enabled: boolean) {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: postingKeys.publishQuote(userId, jobId),
    enabled: enabled && status === "authenticated" && !!userId && !!jobId,
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<PostingQuote> => {
      const { quote, error } = await getPublishQuote(jobId);
      if (error || !quote) throw error ?? new Error("The backend returned no data.");
      return quote;
    },
  });
}

/** What renewing this expired posting would cost right now. */
export function useRenewalQuote(jobId: string, enabled: boolean) {
  const { status, user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: postingKeys.renewalQuote(userId, jobId),
    enabled: enabled && status === "authenticated" && !!userId && !!jobId,
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<RenewalQuote> => {
      const { quote, error } = await getRenewalQuote(jobId);
      if (error || !quote) throw error ?? new Error("The backend returned no data.");
      return quote;
    },
  });
}

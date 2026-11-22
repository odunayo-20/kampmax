"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  answerQuestion,
  askQuestion,
  fetchInbox,
  fetchQuestions,
  hideQuestion,
  removeQuestion,
  type InboxFilter,
} from "@/services/product-questions";

const ROOT = ["product-questions"] as const;

/** Answered questions on a product, plus the signed-in person's own waiting ones. */
export function useProductQuestions(productId: string, limit: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...ROOT, "product", productId, user?.id ?? "", limit],
    queryFn: () => fetchQuestions(productId, limit),
  });
}

/** Ask, or take back, a question. Either way every list of questions is refreshed. */
export function useQuestionActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ROOT });
  return {
    ask: useMutation({
      mutationFn: ({ productId, text }: { productId: string; text: string }) => askQuestion(productId, text),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: removeQuestion, onSuccess: refresh }),
  };
}

/** The seller's questions. Nothing is requested for people who are not signed in. */
export function useQuestionInbox(status: InboxFilter, limit = 20) {
  const { status: auth, user } = useAuth();
  return useQuery({
    queryKey: [...ROOT, "inbox", status, limit],
    queryFn: () => fetchInbox(status, limit),
    enabled: auth === "authenticated" && !!user,
  });
}

/** Answer (or edit an answer to) and remove questions as the seller. */
export function useSellerQuestionActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ROOT });
  return {
    answer: useMutation({
      mutationFn: ({ id, text }: { id: string; text: string }) => answerQuestion(id, text),
      onSuccess: refresh,
    }),
    hide: useMutation({ mutationFn: hideQuestion, onSuccess: refresh }),
  };
}

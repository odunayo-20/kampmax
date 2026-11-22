/** Questions shoppers ask about a product, and the seller's answers. Reading is public; asking and answering need sign-in. */

import { apiClient } from "@/lib/api-client";

export interface Question {
  id: string;
  question: string;
  answer: string | null;
  askedAt: string;
  answeredAt: string | null;
  /** "Ada O.", never a full name. */
  asker: string;
  /** The signed-in person asked it. Only their own question shows before it is answered. */
  mine: boolean;
}

/** A question in the seller's inbox, with the product it is about. */
export interface InboxQuestion extends Question {
  product: { id: string; name: string; image: string | null };
}

export type InboxFilter = "open" | "all";

interface Page<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** Returns the data, or throws the API's error so the page can say what went wrong. */
async function result<T>(request: Promise<{ data: T; error: Error | null }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

/** GET /products/:id/questions (public) */
export function fetchQuestions(productId: string, limit: number): Promise<Page<Question>> {
  return result(apiClient.get<Page<Question>>(`/products/${productId}/questions?limit=${limit}`));
}

/** POST /products/:id/questions */
export function askQuestion(productId: string, question: string): Promise<Question> {
  return result(apiClient.post<{ question: string }, Question>(`/products/${productId}/questions`, { question }));
}

/** DELETE /product-questions/:id (the asker takes it back) */
export function removeQuestion(id: string): Promise<unknown> {
  return result(apiClient.delete(`/product-questions/${id}`));
}

/** GET /product-questions/inbox: the seller's questions with how many are still waiting. */
export function fetchInbox(status: InboxFilter, limit = 20): Promise<Page<InboxQuestion> & { open: number }> {
  return result(apiClient.get<Page<InboxQuestion> & { open: number }>(`/product-questions/inbox?status=${status}&limit=${limit}`));
}

/** PATCH /product-questions/:id/answer: the first answer tells the asker; editing does not. */
export function answerQuestion(id: string, answer: string): Promise<Question> {
  return result(apiClient.patch<{ answer: string }, Question>(`/product-questions/${id}/answer`, { answer }));
}

/** POST /product-questions/:id/hide: removes a question (spam, off topic) for everyone. */
export function hideQuestion(id: string): Promise<unknown> {
  return result(apiClient.post(`/product-questions/${id}/hide`, {}));
}

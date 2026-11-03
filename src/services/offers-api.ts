import { apiClient, type ApiError } from "@/lib/api-client";
import type { ProposalMilestone } from "@/types/opportunity";

// ============================================================
// OFFERS — LIVE API LAYER
// ============================================================
//   POST /offers                  freelancer sends a priced offer in a direct chat
//   GET  /offers/:id              either party reads it
//   POST /offers/:id/accept       recipient accepts → creates the engagement
//   POST /offers/:id/decline      recipient declines
//   POST /offers/:id/withdraw     freelancer takes it back
//
// The backend posts every offer into the chat as a message whose last line is
// "Offer: /offers/<id>"; parseOfferId() turns that line back into a card.

export type OfferStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "EXPIRED";

export interface Offer {
  id: string;
  conversationId: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  deliveryDays: number | null;
  /** The payment plan, paid one milestone at a time; empty means one payment for the whole price. */
  milestones: { title: string; description: string | null; amount: number; dueDate: string | null }[];
  /** A pending offer past its expiry already reads as EXPIRED. */
  status: OfferStatus;
  expiresAt: string;
  respondedAt: string | null;
  engagementId: string | null;
  /** Which side of the offer the signed-in user is on. */
  viewerRole: "FREELANCER" | "RECIPIENT";
  createdAt: string;
}

export interface CreateOfferInput {
  conversationId: string;
  title: string;
  description: string;
  amount: number;
  deliveryDays?: number;
  /** Optional payment plan; it must add up to `amount` (the backend checks). */
  milestones?: ProposalMilestone[];
  expiresInDays?: number;
}

const OFFER_LINE =
  /^Offer: \/offers\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*$/im;

/**
 * The offer a chat message points at, or null for ordinary text. Anyone can
 * type this line, but the card it opens is fetched with the viewer's own
 * session, so an offer they are not a party to simply fails to load.
 */
export function parseOfferId(text: string): string | null {
  return OFFER_LINE.exec(text)?.[1] ?? null;
}

async function unwrap<T>(request: Promise<{ data: T; error: ApiError | null }>): Promise<T> {
  const { data, error } = await request;
  if (error || data == null) throw error ?? new Error("Empty response from server");
  return data;
}

export const fetchOffer = (id: string) => unwrap(apiClient.get<Offer>(`/offers/${id}`));

export const createOfferApi = (input: CreateOfferInput) =>
  unwrap(apiClient.post<CreateOfferInput, Offer>("/offers", input));

export const acceptOfferApi = (id: string) =>
  unwrap(apiClient.post<undefined, { id: string }>(`/offers/${id}/accept`));

export const declineOfferApi = (id: string) =>
  unwrap(apiClient.post<undefined, Offer>(`/offers/${id}/decline`));

export const withdrawOfferApi = (id: string) =>
  unwrap(apiClient.post<undefined, Offer>(`/offers/${id}/withdraw`));

import { apiClient, type ApiError } from "@/lib/api-client";
import type { SavedAddress } from "@/types";

// ============================================================
// SAVED DELIVERY ADDRESSES — LIVE API
// ============================================================
//   GET/POST /addresses, PATCH/DELETE /addresses/:id
// Always scoped to the signed-in user on the server.

export type AddressInput = Omit<SavedAddress, "id">;

async function unwrap<T>(request: Promise<{ data: T; error: ApiError | null }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export async function fetchAddresses(): Promise<SavedAddress[]> {
  return (await unwrap(apiClient.get<SavedAddress[]>("/addresses"))) ?? [];
}

export async function createAddressApi(input: AddressInput): Promise<SavedAddress> {
  return unwrap(apiClient.post<AddressInput, SavedAddress>("/addresses", input));
}

export async function updateAddressApi(id: string, patch: Partial<AddressInput>): Promise<SavedAddress> {
  return unwrap(apiClient.patch<Partial<AddressInput>, SavedAddress>(`/addresses/${id}`, patch));
}

export async function deleteAddressApi(id: string): Promise<void> {
  const { error } = await apiClient.delete(`/addresses/${id}`);
  if (error) throw error;
}

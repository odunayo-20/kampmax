"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { addressKeys } from "@/lib/query-keys";
import {
  createAddressApi,
  deleteAddressApi,
  fetchAddresses,
  updateAddressApi,
  type AddressInput,
} from "@/services/addresses-api";

export function useAddresses() {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: addressKeys.list(user?.id ?? ""),
    enabled: status === "authenticated" && !!user?.id,
    staleTime: 60_000,
    queryFn: fetchAddresses,
  });
}

function useAddressMutation<V, R>(fn: (v: V) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: addressKeys.all }),
  });
}

export const useCreateAddress = () => useAddressMutation((input: AddressInput) => createAddressApi(input));
export const useUpdateAddress = () =>
  useAddressMutation((v: { id: string; patch: Partial<AddressInput> }) => updateAddressApi(v.id, v.patch));
export const useDeleteAddress = () => useAddressMutation((id: string) => deleteAddressApi(id));

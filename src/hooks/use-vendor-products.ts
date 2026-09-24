"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { vendorDashboardKeys, vendorProductKeys } from "@/lib/query-keys";
import {
  archiveVendorProductApi,
  deleteVendorProductApi,
  getCategoriesForVendorApi,
  getVendorProductByIdApi,
  getVendorProductCountsApi,
  getVendorProductsApi,
  restoreVendorProductApi,
  setProductPublishedStatusApi,
} from "@/services/vendor-products";
import type { Product } from "@/types";
import type { ProductPublishStatus, VendorProductQuery } from "@/types/vendor-products";

const STALE_MS = 15_000;

function useAuthenticated() {
  return useAuth().status === "authenticated";
}

export function useVendorProductList(query: VendorProductQuery) {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorProductKeys.list(query),
    queryFn: () => getVendorProductsApi(query),
    enabled,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useVendorProductCounts() {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorProductKeys.counts(),
    queryFn: getVendorProductCountsApi,
    enabled,
    staleTime: STALE_MS,
  });
}

export function useVendorProductCategories() {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorProductKeys.categories(),
    queryFn: getCategoriesForVendorApi,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useVendorProduct(id: string) {
  const enabled = useAuthenticated();
  return useQuery({
    queryKey: vendorProductKeys.detail(id),
    queryFn: () => getVendorProductByIdApi(id),
    enabled,
    staleTime: STALE_MS,
  });
}

/** Any product mutation refreshes lists, counts, details and the dashboard. */
function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: vendorProductKeys.all });
    queryClient.invalidateQueries({ queryKey: vendorDashboardKeys.all });
  };
}

export function usePublishProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProductPublishStatus }) => {
      const result = await setProductPublishedStatusApi(id, status);
      if (!result.success) throw new Error(result.reason ?? "Could not update the product");
    },
    onSuccess: invalidate,
  });
}

export function useArchiveProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (product: Pick<Product, "id">) => archiveVendorProductApi(product.id),
    onSuccess: invalidate,
  });
}

export function useRestoreProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (product: Pick<Product, "id">) => restoreVendorProductApi(product.id),
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (product: Pick<Product, "id">) => deleteVendorProductApi(product.id),
    onSuccess: invalidate,
  });
}

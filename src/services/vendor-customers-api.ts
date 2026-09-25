import { apiClient, type ApiError } from "@/lib/api-client";
import { mapVendorOrderListItem } from "@/services/vendor-orders-api";
import { mapBackendReview } from "@/services/vendor-reviews-api";
import type {
  VendorCustomer,
  VendorCustomerActivity,
  VendorCustomerCounts,
  VendorCustomerDetails,
  VendorCustomerNote,
  VendorCustomerPage,
  VendorCustomerQuery,
} from "@/types/vendor-customers";

// ============================================================
// VENDOR CUSTOMERS — LIVE API LAYER
// ============================================================
//   GET    /vendor/customers                      list (search, segment, sort, page)
//   GET    /vendor/customers/counts               counts by segment
//   GET    /vendor/customers/:buyerId             customer + reviews + activity
//   GET    /orders/vendor?customerId=…            the customer's orders
//   GET/POST /vendor/customers/:buyerId/notes     private notes
//   PATCH/DELETE /vendor/customers/notes/:noteId
//
// Customers are derived server-side from the vendor's own orders; the vendor
// is resolved from the JWT.

interface BackendPage<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

async function unwrap<T>(
  request: Promise<{ data: T; error: ApiError | null }>
): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export async function fetchVendorCustomers(
  query: VendorCustomerQuery = {}
): Promise<VendorCustomerPage<VendorCustomer>> {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.segment && query.segment !== "all") params.set("segment", query.segment);
  if (query.sort) params.set("sort", query.sort);
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.pageSize ?? 12));

  const page = await unwrap(apiClient.get<BackendPage<VendorCustomer>>(`/vendor/customers?${params}`));
  return {
    items: page.items,
    total: page.meta.total,
    page: page.meta.page,
    pageSize: page.meta.limit,
    totalPages: Math.max(1, page.meta.totalPages),
  };
}

export function fetchVendorCustomerCounts(): Promise<VendorCustomerCounts> {
  return unwrap(apiClient.get<VendorCustomerCounts>("/vendor/customers/counts"));
}

export async function fetchVendorCustomer(buyerId: string): Promise<VendorCustomerDetails> {
  const [detail, orders] = await Promise.all([
    unwrap(
      apiClient.get<{
        customer: VendorCustomer;
        reviews: Parameters<typeof mapBackendReview>[0][];
        activity: VendorCustomerActivity[];
      }>(`/vendor/customers/${buyerId}`)
    ),
    unwrap(
      apiClient.get<BackendPage<Parameters<typeof mapVendorOrderListItem>[0]>>(
        `/orders/vendor?customerId=${buyerId}&limit=50`
      )
    ),
  ]);
  return {
    customer: detail.customer,
    orders: orders.items.map(mapVendorOrderListItem),
    reviews: detail.reviews.map(mapBackendReview),
    activity: detail.activity,
  };
}

export function fetchVendorCustomerNotes(buyerId: string): Promise<VendorCustomerNote[]> {
  return unwrap(apiClient.get<VendorCustomerNote[]>(`/vendor/customers/${buyerId}/notes`));
}

export async function createVendorCustomerNote(buyerId: string, body: string): Promise<void> {
  await unwrap(apiClient.post<{ body: string }, VendorCustomerNote>(`/vendor/customers/${buyerId}/notes`, { body }));
}

export async function editVendorCustomerNote(noteId: string, body: string): Promise<void> {
  await unwrap(apiClient.patch<{ body: string }, VendorCustomerNote>(`/vendor/customers/notes/${noteId}`, { body }));
}

export async function removeVendorCustomerNote(noteId: string): Promise<void> {
  await unwrap(apiClient.delete<void>(`/vendor/customers/notes/${noteId}`));
}

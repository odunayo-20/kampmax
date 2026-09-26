import { apiClient, type ApiError } from "@/lib/api-client";
import type { Paginated, SortDir } from "@/types/admin";

/**
 * Live /admin/service-providers client backed by
 * AdminServiceProvidersController (GET /, /counts, /filters, /:id,
 * /:id/activity; PATCH /:id/{approve,reject,suspend,restore}).
 *
 * Console status maps the provider's own verification state:
 * pending review, approved, suspended, rejected (deactivated). Rejecting and
 * suspending need a reason, which is emailed to the provider.
 */

export type ServiceProviderStatus =
  | "approved"
  | "pending_review"
  | "suspended"
  | "rejected";

export interface ManagedServiceProvider {
  id: string;
  userId: string;
  displayName: string;
  slug: string;
  providerType: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  categories: string[];
  status: ServiceProviderStatus;
  isActive: boolean;
  servicesCount: number;
  activeServices: number;
  bookingsTotal: number;
  bookingsCompleted: number;
  revenue: number;
  statusReason: string | null;
  joinedAt: string;
  lastActiveAt: string;
}

export interface ServiceProviderService {
  id: string;
  title: string;
  category: string;
  pricingModel: string;
  price: number;
  durationMinutes: number | null;
  locationType: string | null;
  status: string;
  createdAt: string;
}

export interface ServiceProviderBooking {
  id: string;
  customerName: string;
  serviceTitle: string;
  status: string;
  scheduledAt: string;
  price: number;
  cancellationReason: string | null;
  createdAt: string;
}

export interface ServiceProviderActivityEvent {
  id: string;
  kind: string;
  message: string;
  meta: string;
  at: string;
}

export interface ManagedServiceProviderDetail {
  provider: ManagedServiceProvider;
  profile: {
    avatar: string | null;
    bio: string;
    yearsOfExperience: number | null;
    serviceRadius: string | null;
    statusReason: string | null;
  };
  services: ServiceProviderService[];
  bookings: ServiceProviderBooking[];
  availability: { id: string; day: string; start: string; end: string }[];
  activity: ServiceProviderActivityEvent[];
}

export interface ServiceProviderCounts {
  all: number;
  approved: number;
  pending_review: number;
  suspended: number;
  rejected: number;
}

export interface ServiceProviderFilters {
  providerTypes: string[];
  categories: string[];
}

export type ServiceProviderSortField =
  | "displayName"
  | "joinedAt"
  | "servicesCount"
  | "bookingsTotal"
  | "revenue";

export interface ServiceProviderListQuery {
  search?: string;
  status?: ServiceProviderStatus | "all";
  providerType?: string;
  category?: string;
  sortBy?: ServiceProviderSortField;
  sortDir?: SortDir;
  page?: number;
  pageSize?: number;
}

interface BackendPage<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function fail(error: ApiError, fallback: string): never {
  if (error.status === 401) {
    throw new Error("You're signed out. Sign in again to continue.");
  }
  if (error.status === 403) {
    throw new Error("You don't have permission to do that.");
  }
  throw new Error(error.message || fallback);
}

function queryString(query: ServiceProviderListQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("providerType", query.providerType);
  set("category", query.category);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function patch(
  id: string,
  action: string,
  body: Record<string, string>,
  fallback: string
): Promise<ManagedServiceProvider> {
  const { data, error } = await apiClient.patch<
    Record<string, string>,
    ManagedServiceProvider
  >(`/admin/service-providers/${id}/${action}`, body);
  if (error) fail(error, fallback);
  return data;
}

export const serviceProviderManagementService = {
  async list(
    query: ServiceProviderListQuery = {}
  ): Promise<Paginated<ManagedServiceProvider>> {
    const { data, error } = await apiClient.get<
      BackendPage<ManagedServiceProvider>
    >(`/admin/service-providers${queryString(query)}`);
    if (error) fail(error, "Couldn't load service providers.");
    return {
      items: data.items,
      page: data.meta.page,
      pageSize: data.meta.limit,
      total: data.meta.total,
      totalPages: Math.max(1, data.meta.totalPages),
    };
  },

  async getById(id: string): Promise<ManagedServiceProviderDetail | null> {
    const { data, error } = await apiClient.get<ManagedServiceProviderDetail>(
      `/admin/service-providers/${id}`
    );
    if (error?.status === 404) return null;
    if (error) fail(error, "Couldn't load the provider.");
    return data;
  },

  async getCounts(): Promise<ServiceProviderCounts> {
    const { data, error } = await apiClient.get<ServiceProviderCounts>(
      "/admin/service-providers/counts"
    );
    if (error) fail(error, "Couldn't load provider counts.");
    return data;
  },

  async getFilters(): Promise<ServiceProviderFilters> {
    const { data, error } = await apiClient.get<ServiceProviderFilters>(
      "/admin/service-providers/filters"
    );
    if (error) fail(error, "Couldn't load filters.");
    return data;
  },

  approve: (id: string) =>
    patch(id, "approve", {}, "Couldn't approve the provider."),
  restore: (id: string) =>
    patch(id, "restore", {}, "Couldn't restore the provider."),

  reject(id: string, reason: string) {
    if (!reason.trim()) throw new Error("A rejection reason is required.");
    return patch(id, "reject", { reason: reason.trim() }, "Couldn't reject the provider.");
  },

  suspend(id: string, reason: string) {
    if (!reason.trim()) throw new Error("A suspension reason is required.");
    return patch(id, "suspend", { reason: reason.trim() }, "Couldn't suspend the provider.");
  },
};

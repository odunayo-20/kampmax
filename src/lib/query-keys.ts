import { NotificationCategory } from "@/types";
import type { EmployerApplicationStatus } from "@/types/opportunity";
import type { GlobalSearchQuery } from "@/types";
import type { AdminRoleKey, SettingsSectionKey } from "@/types/admin";

/**
 * Structured TanStack Query key factory for Kampmax.
 *
 * Keys are scoped per user so caches never leak data between sessions.
 * The `notifications` preview is deliberately flat and shareable — the
 * NotificationSyncBridge invalidates the top-level `all` key whenever the
 * notification store changes, so every dependent query refreshes together.
 * Keys are scoped per user so caches never leak between sessions.
 */
export interface NotificationListFilters {
  category: NotificationCategory | "all";
}

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (userId: string, filters: NotificationListFilters) =>
    ["notifications", "list", userId, filters] as const,
  unreadCount: (userId: string) =>
    ["notifications", "unread-count", userId] as const,
  categorySummaries: (userId: string) =>
    ["notifications", "category-summaries", userId] as const,
};

/**
 * Messaging key factory. Conversation and thread keys are scoped per user so
 * message content can never leak between sessions or accounts. The Message
 * SyncBridge invalidates the top-level `all` key whenever the messaging store
 * changes (send / mark-as-read) so the list, thread, previews and unread badge
 * all refresh together — the same pattern as notifications.
 */
export interface MessageListFilters {
  search: string;
}

export const messageKeys = {
  all: ["messages"] as const,
  conversations: (userId: string, filters: MessageListFilters) =>
    ["messages", "conversations", userId, filters] as const,
  unreadCount: (userId: string) =>
    ["messages", "unread-count", userId] as const,
  conversation: (conversationId: string, userId: string) =>
    ["messages", "conversation", conversationId, userId] as const,
  thread: (conversationId: string, userId: string) =>
    ["messages", "thread", conversationId, userId] as const,
};

/**
 * Customer support portal key factory (Module 26A, customer side of Module
 * 56). Keys are scoped per user so one customer's cases can never leak into
 * another session's cache. Mutations invalidate the whole `support` tree so
 * the list, detail and any fresh resource reads stay consistent after a
 * request is created or a reply is posted.
 */
export const supportKeys = {
  all: ["support"] as const,
  list: (userId: string) => ["support", "list", userId] as const,
  detail: (userId: string, id: string) =>
    ["support", "detail", userId, id] as const,
};

/**
 * Jobs key factory (Module 27).
 *
 * The public marketplace list/detail are NOT user-scoped (only OPEN,
 * discoverable jobs). Employer lists, counts and details are scoped per
 * user so owner-only records can never leak between sessions. Saved-job ids
 * are per user.
 */
export interface JobListQuery {
  search?: string;
  categoryId?: string;
  experience?: string;
  arrangement?: string;
  sort?: string;
  page?: number;
  size?: number;
}

export interface EmployerJobListQuery {
  status?: string;
  sort?: string;
  page?: number;
  size?: number;
}

export const jobKeys = {
  all: ["jobs"] as const,
  list: (filters: JobListQuery) => ["jobs", "list", filters] as const,
  detail: (id: string) => ["jobs", "detail", id] as const,
  employerList: (userId: string, filters: EmployerJobListQuery) =>
    ["jobs", "employer", userId, "list", filters] as const,
  employerDetail: (userId: string, id: string) =>
    ["jobs", "employer", userId, "detail", id] as const,
  employerCounts: (userId: string) =>
    ["jobs", "employer", userId, "counts"] as const,
  saved: (userId: string) => ["jobs", "saved", userId] as const,
};

/**
 * Applications & hiring key factory (Module 28). Employer-scoped per user so
 * owner-only proposal records and public candidate profiles can never leak
 * between sessions. The employer-facing mutations invalidate the flat `all`
 * key AND the jobs keys (accepting an application closes the job), so list,
 * counts and job detail all refresh together.
 */
export interface EmployerApplicationListQuery {
  jobId?: string;
  status?: EmployerApplicationStatus | "all";
  sort?: string;
  search?: string;
  page?: number;
  size?: number;
}

export const applicationKeys = {
  all: ["applications"] as const,
  list: (userId: string, filters: EmployerApplicationListQuery) =>
    ["applications", "list", userId, filters] as const,
  detail: (userId: string, id: string) =>
    ["applications", "detail", userId, id] as const,
  summary: (userId: string) =>
    ["applications", "summary", userId] as const,
};

/**
 * Employer dashboard key factory (Module 29). The dashboard is an
 * orchestration layer, so its summary aggregates owner-scoped data from
 * the existing modules; every relevant mutation additionally invalidates
 * the flat `all` key so the dashboard refreshes together with its sources.
 */
export const dashboardKeys = {
  all: ["employer-dashboard"] as const,
  summary: (userId: string) =>
    ["employer-dashboard", "summary", userId] as const,
  contracts: (userId: string) =>
    ["employer-dashboard", "contracts", userId] as const,
};

/**
 * Employer profile key factory (Module 29A). Profile queries are per-user
 * so owner-only data never leaks between sessions. Profile updates invalidate
 * both `employerKeys.all` (profile reads) and `dashboardKeys.all` (dashboard
 * summary, header and completion).
 */
export const employerKeys = {
  all: ["employer"] as const,
  profile: (userId: string) => ["employer", "profile", userId] as const,
  publicProfile: (slug: string) =>
    ["employer", "public", slug] as const,
};

/**
 * Settings key factory (Module 30). Reads are scoped per user so cached
 * account/settings data can never leak between sessions. Mutations
 * invalidate the flat `all` key — since the platform preference stores
 * (notification / privacy / security) are shared records, every settings
 * query refreshes together after a change.
 */
export const settingsKeys = {
  all: ["settings"] as const,
  account: (userId: string) => ["settings", "account", userId] as const,
  notificationPreferences: (userId: string) =>
    ["settings", "notification-preferences", userId] as const,
  privacySettings: (userId: string) =>
    ["settings", "privacy", userId] as const,
  securitySettings: (userId: string) =>
    ["settings", "security", userId] as const,
};

/**
 * Global search key factory (Module 31).
 *
 * Results and suggestion keys embed the FULL normalized search query
 * (term + type + sort + page + campus + price range) so every unique
 * search carries its own cached response — the same convention as the
 * vertical list keys. Results are public discovery data (not user
 * scoped), so keys stay user-agnostic.
 */
export interface GlobalSearchQueryKey extends GlobalSearchQuery {}

export const searchKeys = {
  all: ["search"] as const,
  results: (query: GlobalSearchQuery) => ["search", "results", query] as const,
  suggestions: (q: string) => ["search", "suggestions", q] as const,
};

/**
 * Admin console key factory (Module 34). Dashboard keys are scoped per
 * campus so a campus-scoped operator's cached aggregates can never be
 * mistaken for platform-wide data. Session/identity is owned by the
 * admin-session store, not by react-query — the dashboard tree invalidates
 * flat under `adminKeys.all` on logout.
 */
export const adminKeys = {
  all: ["admin"] as const,
  dashboard: {
    overview: (scopeCampusId?: string | null) =>
      ["admin", "dashboard", "overview", scopeCampusId ?? "platform"] as const,
    revenue: (range: string) => ["admin", "dashboard", "revenue", range] as const,
    growth: (kind: string) => ["admin", "dashboard", "growth", kind] as const,
    campusSales: () => ["admin", "dashboard", "campus-sales"] as const,
    topProducts: (limit: number) =>
      ["admin", "dashboard", "top-products", limit] as const,
    lowStock: (limit: number) =>
      ["admin", "dashboard", "low-stock", limit] as const,
    recentOrders: (limit: number) =>
      ["admin", "dashboard", "recent-orders", limit] as const,
    activity: (pageSize: number) =>
      ["admin", "dashboard", "activity", pageSize] as const,
    stats: (scopeCampusId?: string | null) =>
      ["admin", "dashboard", "stats", scopeCampusId ?? "platform"] as const,
  },
  /**
   * User directory (Module 35). Keys are scope-qualified by the acting
   * operator's campus so a campus-scoped admin's cache can never leak
   * rows/counts across campus boundaries. `list` embeds the full query
   * object; React Query structural-hashes it, so identical params share
   * one cache entry.
   */
  users: {
    all: ["admin", "users"] as const,
    list: (
      query: {
        search?: string;
        role?: string;
        campusId?: string;
        status?: string;
        sortBy?: string;
        sortDir?: "asc" | "desc";
        page?: number;
        pageSize?: number;
      },
      scopeCampusId?: string | null
    ) => ["admin", "users", "list", scopeCampusId ?? "platform", query] as const,
    counts: (scopeCampusId?: string | null) =>
      ["admin", "users", "counts", scopeCampusId ?? "platform"] as const,
    detail: (id: string, scopeCampusId?: string | null) =>
      ["admin", "users", "detail", id, scopeCampusId ?? "platform"] as const,
    activity: (id: string, scopeCampusId?: string | null) =>
      ["admin", "users", "activity", id, scopeCampusId ?? "platform"] as const,
  },
  /**
   * Freelancer management key factory (Module 36). Keys are scoped per
   * admin session (via campusId) so campus-scoped operators never see
   * freelancers outside their scope. Mutations invalidate the whole
   * `freelancers` tree so list, counts, detail and activity stay consistent.
   */
  freelancers: {
    all: ["admin", "freelancers"] as const,
    list: (
      query: {
        search?: string;
        status?: string;
        categoryId?: string;
        campusId?: string;
        sortBy?: string;
        sortDir?: "asc" | "desc";
        page?: number;
        pageSize?: number;
      },
      scopeCampusId?: string | null
    ) => ["admin", "freelancers", "list", scopeCampusId ?? "platform", query] as const,
    counts: (scopeCampusId?: string | null) =>
      ["admin", "freelancers", "counts", scopeCampusId ?? "platform"] as const,
    detail: (id: string, scopeCampusId?: string | null) =>
      ["admin", "freelancers", "detail", id, scopeCampusId ?? "platform"] as const,
    activity: (id: string, scopeCampusId?: string | null) =>
      ["admin", "freelancers", "activity", id, scopeCampusId ?? "platform"] as const,
  } as const,
  /**
   * Employer management key factory (Module 37). Keys are scoped per
   * admin session (via campusId) so campus-scoped operators never see
   * employers outside their scope. Mutations invalidate the whole
   * `employers` tree so list, counts, detail and activity stay consistent.
   */
  employers: {
    all: ["admin", "employers"] as const,
    list: (
      query: {
        search?: string;
        status?: string;
        verification?: string;
        campusId?: string;
        industry?: string;
        sortBy?: string;
        sortDir?: "asc" | "desc";
        page?: number;
        pageSize?: number;
      },
      scopeCampusId?: string | null
    ) => ["admin", "employers", "list", scopeCampusId ?? "platform", query] as const,
    counts: (scopeCampusId?: string | null) =>
      ["admin", "employers", "counts", scopeCampusId ?? "platform"] as const,
    detail: (id: string, scopeCampusId?: string | null) =>
      ["admin", "employers", "detail", id, scopeCampusId ?? "platform"] as const,
    activity: (id: string, scopeCampusId?: string | null) =>
      ["admin", "employers", "activity", id, scopeCampusId ?? "platform"] as const,
  } as const,
  /**
   * Vendor management key factory (Module 38). Keys are scoped per
   * admin session (via campusId) so campus-scoped operators never see
   * vendors outside their scope. Mutations invalidate the whole
   * `vendors` tree so list, counts, detail and activity stay consistent.
   */
  vendors: {
    all: ["admin", "vendors"] as const,
    list: (
      query: {
        search?: string;
        queue?: string;
        campusId?: string;
        category?: string;
        sortBy?: string;
        sortDir?: "asc" | "desc";
        page?: number;
        pageSize?: number;
      },
      scopeCampusId?: string | null
    ) => ["admin", "vendors", "list", scopeCampusId ?? "platform", query] as const,
    counts: (scopeCampusId?: string | null) =>
      ["admin", "vendors", "counts", scopeCampusId ?? "platform"] as const,
    categories: (scopeCampusId?: string | null) =>
      ["admin", "vendors", "categories", scopeCampusId ?? "platform"] as const,
    detail: (id: string, scopeCampusId?: string | null) =>
      ["admin", "vendors", "detail", id, scopeCampusId ?? "platform"] as const,
    activity: (id: string, scopeCampusId?: string | null) =>
      ["admin", "vendors", "activity", id, scopeCampusId ?? "platform"] as const,
  } as const,
  /**
   * Marketplace management key factory (Module 39). Read-only
   * listing-oversight console built on the real product store.
   * Keys are campus-scoped like the other admin resources; there
   * is no mutation namespace because the console exposes no
   * moderation actions until the backend-adds them.
   */
  marketplace: {
    all: ["admin", "marketplace"] as const,
    list: (
      query: {
        search?: string;
        status?: string;
        visibility?: string;
        publication?: string;
        categoryId?: string;
        campusId?: string;
        vendorId?: string;
        stock?: string;
        sortBy?: string;
        sortDir?: "asc" | "desc";
        page?: number;
        pageSize?: number;
      },
      scopeCampusId?: string | null
    ) => ["admin", "marketplace", "list", scopeCampusId ?? "platform", query] as const,
    counts: (scopeCampusId?: string | null) =>
      ["admin", "marketplace", "counts", scopeCampusId ?? "platform"] as const,
    facets: (scopeCampusId?: string | null) =>
      ["admin", "marketplace", "facets", scopeCampusId ?? "platform"] as const,
    detail: (id: string, scopeCampusId?: string | null) =>
      ["admin", "marketplace", "detail", id, scopeCampusId ?? "platform"] as const,
    activity: (id: string, scopeCampusId?: string | null) =>
      ["admin", "marketplace", "activity", id, scopeCampusId ?? "platform"] as const,
  } as const,
  /**
   * Jobs & hiring management key factory (Module 40). Read-only
   * oversight console built on the real opportunity store. Keys are
   * campus-scoped like the other admin resources; there is no mutation
   * namespace because the store exposes no admin moderation actions.
   */
  jobs: {
    all: ["admin", "jobs"] as const,
    list: (
      query: {
        search?: string;
        status?: string;
        publication?: string;
        categoryId?: string;
        campusId?: string;
        employerId?: string;
        arrangement?: string;
        sortBy?: string;
        sortDir?: "asc" | "desc";
        page?: number;
        pageSize?: number;
      },
      scopeCampusId?: string | null
    ) => ["admin", "jobs", "list", scopeCampusId ?? "platform", query] as const,
    counts: (scopeCampusId?: string | null) =>
      ["admin", "jobs", "counts", scopeCampusId ?? "platform"] as const,
    facets: (scopeCampusId?: string | null) =>
      ["admin", "jobs", "facets", scopeCampusId ?? "platform"] as const,
    detail: (id: string, scopeCampusId?: string | null) =>
      ["admin", "jobs", "detail", id, scopeCampusId ?? "platform"] as const,
    activity: (id: string, scopeCampusId?: string | null) =>
      ["admin", "jobs", "activity", id, scopeCampusId ?? "platform"] as const,
  } as const,
  /**
   * Review management key factory (Module 41). Read-only oversight console
   * built on the real review stores. Keys are campus-scoped like the other
   * admin resources; there is no mutation namespace because no store
   * exposes admin review moderation transitions.
   */
  reviews: {
    all: ["admin", "reviews"] as const,
    list: (
      query: {
        search?: string;
        status?: string;
        rating?: number | "all";
        targetType?: string;
        vendorId?: string;
        response?: string;
        reportedOnly?: boolean;
        sortBy?: string;
        sortDir?: "asc" | "desc";
        page?: number;
        pageSize?: number;
      },
      scopeCampusId?: string | null
    ) => ["admin", "reviews", "list", scopeCampusId ?? "platform", query] as const,
    counts: (scopeCampusId?: string | null) =>
      ["admin", "reviews", "counts", scopeCampusId ?? "platform"] as const,
    facets: (scopeCampusId?: string | null) =>
      ["admin", "reviews", "facets", scopeCampusId ?? "platform"] as const,
    detail: (id: string, scopeCampusId?: string | null) =>
      ["admin", "reviews", "detail", id, scopeCampusId ?? "platform"] as const,
  } as const,
  /**
   * Trust & Safety key factory (Module 42). Read-only oversight console
   * over the real report stores. Keys are campus-scoped like the other
   * admin resources; there is no mutation namespace because no store
   * exposes report-level triage transitions.
   */
  trustSafety: {
    all: ["admin", "trust-safety"] as const,
    list: (
      query: {
        search?: string;
        status?: string;
        source?: string;
        reason?: string;
        targetType?: string;
        campusId?: string;
        sortBy?: string;
        sortDir?: "asc" | "desc";
        page?: number;
        pageSize?: number;
      },
      scopeCampusId?: string | null
    ) => ["admin", "trust-safety", "list", scopeCampusId ?? "platform", query] as const,
    counts: (scopeCampusId?: string | null) =>
      ["admin", "trust-safety", "counts", scopeCampusId ?? "platform"] as const,
    facets: (scopeCampusId?: string | null) =>
      ["admin", "trust-safety", "facets", scopeCampusId ?? "platform"] as const,
    detail: (id: string, scopeCampusId?: string | null) =>
      ["admin", "trust-safety", "detail", id, scopeCampusId ?? "platform"] as const,
  } as const,
  /**
   * Admin verification & KYC key factory (Module 43). Unified read view
   * over the real vendor/employer/freelancer verification state. Keys are
   * campus-scoped like the other admin resources. Vendor approve/reject
   * mutations delegate to the vendor management service, so the mutation
   * namespace invalidates BOTH the `verifications` tree AND the `vendors`
   * tree — the verdict lands in the shared overlay both consoles read.
   */
  verifications: {
    all: ["admin", "verifications"] as const,
    list: (
      query: {
        search?: string;
        status?: string;
        applicantType?: string;
        verificationType?: string;
        campusId?: string;
        sortBy?: string;
        sortDir?: "asc" | "desc";
        page?: number;
        pageSize?: number;
      },
      scopeCampusId?: string | null
    ) => ["admin", "verifications", "list", scopeCampusId ?? "platform", query] as const,
    counts: (scopeCampusId?: string | null) =>
      ["admin", "verifications", "counts", scopeCampusId ?? "platform"] as const,
    types: (scopeCampusId?: string | null) =>
      ["admin", "verifications", "types", scopeCampusId ?? "platform"] as const,
    detail: (id: string, scopeCampusId?: string | null) =>
      ["admin", "verifications", "detail", id, scopeCampusId ?? "platform"] as const,
  } as const,
  /**
   * Admin transactions & payments key factory (Module 44). ONE financial
   * ledger derived from real order + wallet records. Keys are NOT
   * campus-scoped: financial records are restricted to full operators
   * (ADMIN/SUPER_ADMIN) via nav permissions, so no campus shard exists.
   * Read-only namespace — the backend exposes no transaction-level actions
   * (refunds are order/wallet-level only).
   */
  transactions: {
    all: ["admin", "transactions"] as const,
    list: (query: {
      search?: string;
      status?: string;
      type?: string;
      method?: string;
      sortBy?: string;
      sortDir?: "asc" | "desc";
      page?: number;
      pageSize?: number;
    }) => ["admin", "transactions", "list", query] as const,
    counts: () => ["admin", "transactions", "counts"] as const,
    facets: () => ["admin", "transactions", "facets"] as const,
    detail: (id: string) => ["admin", "transactions", "detail", id] as const,
  } as const,
  /**
   * Admin vendor/freelancer payout key factory (Module 45). Recipient payout
   * ledger derived from the real wallet + vendor + freelancer payout stores.
   * Keys are NOT campus-scoped (same as transactions): payout records are
   * restricted to full operators (ADMIN/SUPER_ADMIN) via nav permissions,
   * so no campus shard exists. Read-only namespace — the backend exposes no
   * payout-level actions (approve/process/retry/cancel/reverse).
   */
  payouts: {
    all: ["admin", "payouts"] as const,
    list: (query: {
      search?: string;
      status?: string;
      type?: string;
      method?: string;
      sortBy?: string;
      sortDir?: "asc" | "desc";
      page?: number;
      pageSize?: number;
    }) => ["admin", "payouts", "list", query] as const,
    counts: () => ["admin", "payouts", "counts"] as const,
    facets: () => ["admin", "payouts", "facets"] as const,
    detail: (id: string) => ["admin", "payouts", "detail", id] as const,
  } as const,
  /**
   * Admin finance reconciliation & reports key factory (Module 46).
   * Read-only platform finance surface derived from the real orders,
   * wallet, vendor/freelancer/service-provider financials stores.
   * Keys are NOT campus-scoped (same as transactions/payouts): finance
   * records are restricted to full operators (ADMIN/SUPER_ADMIN) via nav
   * permissions, so no campus shard exists. Read-only namespace — the
   * backend exposes no fee/settlement/invoice ledger and no payout or
   * refund actions, so there are no mutation keys.
   */
  finance: {
    all: ["admin", "finance"] as const,
    overview: () => ["admin", "finance", "overview"] as const,
    reconciliation: () => ["admin", "finance", "reconciliation"] as const,
    report: (id: string) => ["admin", "finance", "report", id] as const,
  } as const,
  /**
   * Admin communications key factory (Module 47). Read-only console +
   * one real dispatch (create) over the shared Module 26A in-app
   * notification store. Keys are NOT campus-scoped: communications are
   * restricted to full operators (ADMIN/SUPER_ADMIN) via nav permissions
   * and CAMPUS_ADMIN no longer sees the console. The MutationKey invalidates
   * list + overview together; the shared notification store also emits its
   * own change bridge, so user-facing feeds refresh independently.
   */
  notifications: {
    all: ["admin", "notifications"] as const,
    overview: () => ["admin", "notifications", "overview"] as const,
    list: (query: {
      search?: string;
      type?: string;
      category?: string;
      read?: string;
      from?: string;
      to?: string;
      sortBy?: string;
      sortDir?: "asc" | "desc";
      page?: number;
      pageSize?: number;
    }) => ["admin", "notifications", "list", query] as const,
    detail: (id: string) =>
      ["admin", "notifications", "detail", id] as const,
    audiencePreview: (audience: string, campusId?: string | null, userId?: string | null) =>
      ["admin", "notifications", "preview", audience, campusId ?? "all", userId ?? "none"] as const,
    mutation: () => ["admin", "notifications", "mutation"] as const,
  } as const,
  /**
   * Admin audit trail key factory (Module 48). READ-ONLY, append-only
   * namespace over the shared audit store. Keys are neither user- nor
   * campus-scoped: the console is restricted to SUPER_ADMIN/ADMIN via
   * nav permissions. There are NO mutation keys — audit records are
   * immutable. Hooks keep gcTime short so sensitive activity is not
   * retained in the browser cache, and normal mount/window-focus
   * refetch (no polling) surfaces events recorded elsewhere.
   */
  auditTrail: {
    all: ["admin", "audit-trail"] as const,
    list: (query: {
      search?: string;
      actorId?: string;
      action?: string;
      resourceType?: string;
      result?: string;
      severity?: string;
      dateFrom?: string;
      dateTo?: string;
      sortBy?: string;
      sortDir?: "asc" | "desc";
      page?: number;
      pageSize?: number;
    }) => ["admin", "audit-trail", "list", query] as const,
    detail: (id: string) => ["admin", "audit-trail", "detail", id] as const,
    metrics: () => ["admin", "audit-trail", "metrics"] as const,
    actors: () => ["admin", "audit-trail", "actors"] as const,
  } as const,
  /**
   * Admin roles & permissions key factory (Module 49). The RBAC
   * console (`/admin/permissions`) is restricted to full operators
   * (SUPER_ADMIN/ADMIN) via nav permissions, so keys are neither
   * user- nor campus-scoped — the same stance as auditTrail. Roles
   * are few (system-seeded), so the list key returns the whole set;
   * `detail` keys a single role and `mutation` marks in-flight edits.
   * Mutations invalidate the whole `rbac` tree so list + detail stay
   * consistent after a matrix edit or reset.
   */
  rbac: {
    all: ["admin", "rbac"] as const,
    roles: () => ["admin", "rbac", "roles"] as const,
    detail: (key: AdminRoleKey) => ["admin", "rbac", "detail", key] as const,
    mutation: () => ["admin", "rbac", "mutation"] as const,
  } as const,
  /**
   * Admin platform settings key factory (Module 50). The settings
   * console (`/admin/settings`) is restricted to full operators
   * (SUPER_ADMIN/ADMIN) via nav permissions, so keys are neither
   * user- nor campus-scoped — the same stance as auditTrail/rbac.
   * The sectioned config is one record (`config`), and mutations
   * invalidate the whole `settings` tree so the console plus any
   * open form refresh together after a section save or reset.
   */
  settings: {
    all: ["admin", "settings"] as const,
    config: () => ["admin", "settings", "config"] as const,
    section: (key: SettingsSectionKey) =>
      ["admin", "settings", "section", key] as const,
    mutation: () => ["admin", "settings", "mutation"] as const,
  } as const,
  /**
   * Admin Security Center key factory (Module 51). Restricted to full
   * operators (SUPER_ADMIN/ADMIN) via nav permissions — the same
   * stance as auditTrail/rbac/settings, and CAMPUS_ADMIN is excluded.
   * Keys are neither user- nor campus-scoped because the surface is
   * platform-wide, and there IS no `security` RBAC resource today
   * (see MODULE-51-BACKEND-GAPS.md). `events` embeds the full query so
   * every unique filter combination gets its own cache entry. Short
   * `gcTime` (set in the hook) so sensitive telemetry is not retained
   * in the browser cache; logout removes `adminKeys.all` anyway.
   */
  security: {
    all: ["admin", "security"] as const,
    metrics: () => ["admin", "security", "metrics"] as const,
    events: (query: {
      search?: string;
      actorId?: string;
      action?: string;
      resourceType?: string;
      result?: string;
      severity?: string;
      dateFrom?: string;
      dateTo?: string;
      securityOnly?: boolean;
      sortBy?: string;
      sortDir?: "asc" | "desc";
      page?: number;
      pageSize?: number;
    }) => ["admin", "security", "events", query] as const,
  } as const,
  /**
   * Admin support & customer service key factory (Module 56). The
   * /admin/support console is campus-scoped for CAMPUS_ADMIN operators
   * (their list, detail and metrics never cross campus boundaries) and
   * mutation-capable for SUPER_ADMIN/ADMIN. Mutations invalidate the
   * whole `support` tree so list, detail and metrics stay consistent
   * after respond / note / assign / status / priority / escalate.
   */
  support: {
    all: ["admin", "support"] as const,
    list: (
      query: {
        search?: string;
        status?: string;
        priority?: string;
        category?: string;
        assigneeId?: string;
        campusId?: string;
        escalated?: boolean;
        sortBy?: string;
        sortDir?: "asc" | "desc";
        page?: number;
        pageSize?: number;
      },
      scopeCampusId?: string | null
    ) => ["admin", "support", "list", scopeCampusId ?? "platform", query] as const,
    metrics: (scopeCampusId?: string | null) =>
      ["admin", "support", "metrics", scopeCampusId ?? "platform"] as const,
    staff: (scopeCampusId?: string | null) =>
      ["admin", "support", "staff", scopeCampusId ?? "platform"] as const,
    detail: (id: string, scopeCampusId?: string | null) =>
      ["admin", "support", "detail", id, scopeCampusId ?? "platform"] as const,
  } as const,
};
/** Vendor dashboard (owner-scoped; identity comes from the JWT server-side). */
export const vendorDashboardKeys = {
  all: ["vendor-dashboard"] as const,
  profile: () => ["vendor-dashboard", "profile"] as const,
  analytics: () => ["vendor-dashboard", "analytics"] as const,
  orderStatus: () => ["vendor-dashboard", "order-status"] as const,
  recentOrders: (limit: number) => ["vendor-dashboard", "recent-orders", limit] as const,
  lowStock: (vendorId: string) => ["vendor-dashboard", "low-stock", vendorId] as const,
};

/** Vendor orders (owner-scoped; identity comes from the JWT server-side). */
export const vendorOrderKeys = {
  all: ["vendor-orders"] as const,
  list: (filters: { search?: string; status?: string; page: number }) =>
    ["vendor-orders", "list", filters] as const,
  detail: (id: string) => ["vendor-orders", "detail", id] as const,
  counts: () => ["vendor-orders", "counts"] as const,
};

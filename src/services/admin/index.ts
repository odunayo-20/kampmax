// ============================================================
// ADMIN SERVICE CONTAINER
//
// SINGLE SWAP POINT for the future NestJS backend.
//
// Every admin page/component consumes services through this
// module. When the real API lands:
//   1. Implement each `Admin*Service` interface in
//      `<resource>.http.ts` files (fetch/axios against NestJS).
//   2. Replace the factory calls below with the HTTP variants.
//   3. Delete `src/data/admin/*` mock modules.
// No component or page code changes required.
// ============================================================

import { mockActivityItems, mockDailyMetrics, mockGrowthSeries, mockNotifications, mockSettings, mockTopProducts, mockCampusSales, mockLowStock } from "@/data/admin/system";
import { mockCampuses } from "@/data/admin/campuses";
import { mockUsers, mockVendors } from "@/data/admin/people";
import { mockCategories, mockProducts } from "@/data/admin/catalog";
import { mockOrders, mockPayments, mockWithdrawals } from "@/data/admin/commerce";
import { mockPromotions } from "@/data/admin/growth";
import { mockDisputes, mockPosts, mockReports, mockReviews } from "@/data/admin/content";
import { DashboardService, createMockDashboardService } from "./dashboard.service";

export type { ChartRange } from "./dashboard.service";
import type { AdminAuthService } from "./auth.service";
import { createApiAdminAuthService } from "./auth.api";

export type {
  AdminAuthFailCode,
  AdminAuthResult,
  AdminLoginInput,
} from "./auth.service";

/** Live operator auth: POST /admin/auth/login, GET /admin/auth/session. */
export const adminAuthService: AdminAuthService = createApiAdminAuthService();
import { AdminUserService, createMockUserService } from "./users.service";
import type { AdminUserManagementService } from "./user-management.service";
import { createApiUserManagementService } from "./user-management.api";
import type { AdminCampusManagementService } from "./campus-management.service";
import { createApiCampusManagementService } from "./campus-management.api";
import { AdminCampusService, createMockCampusService } from "./campuses.service";
import { AdminVendorService, createMockVendorService } from "./vendors.service";
import type { AdminVendorManagementService } from "./vendor-management.service";
import { createApiVendorManagementService } from "./vendor-management.api";
import type { AdminProductManagementService } from "./product-management.service";
import { createApiProductManagementService } from "./product-management.api";
import {
  AdminCategoryService,
  AdminProductService,
  createMockCategoryService,
  createMockProductService,
} from "./catalog.service";
import { AdminOrderService, createMockOrderService } from "./orders.service";
import { AdminPaymentService, createMockPaymentService } from "./payments.service";
import {
  AdminWithdrawalService,
  createMockWithdrawalService,
} from "./withdrawals.service";
import {
  AdminPromotionService,
  createMockPromotionService,
} from "./promotions.service";
import {
  AdminContentService,
  AdminDisputeService,
  AdminReportService,
  AdminReviewService,
  createMockDisputeService,
  createMockPostService,
  createMockReportService,
  createMockReviewService,
} from "./content.service";
import {
  AdminNotificationService,
  createMockNotificationService,
} from "./notifications.service";
import { AdminSettingService, createMockSettingService } from "./settings.service";

export const dashboardService: DashboardService =
  createMockDashboardService({
    users: mockUsers,
    vendors: mockVendors,
    products: mockProducts,
    orders: mockOrders,
    payments: mockPayments,
    withdrawals: mockWithdrawals,
    disputes: mockDisputes,
    reviews: mockReviews,
    reports: mockReports,
    campuses: mockCampuses,
    dailyMetrics: mockDailyMetrics,
    growthSeries: mockGrowthSeries,
    campusSales: mockCampusSales,
    topProducts: mockTopProducts,
    lowStock: mockLowStock,
    recentOrders: mockOrders.slice(0, 12),
    activity: mockActivityItems,
  });

export const userService: AdminUserService = createMockUserService(mockUsers);

/** /admin/users console: live directory API (staff, vendors, customers). */
export const userManagementService: AdminUserManagementService =
  createApiUserManagementService();

export { fetchUserCampusOptions } from "./user-management.api";

export type { ManagedUserSortField } from "./user-management.service";
export type {
  AdminActingContext,
  ManagedUserListQuery,
  ManagedUserDetailResult,
  UserActivityResult,
  UserCommandFailure,
  UserCommandFailureCode,
  UserCommandResult,
  UserActionPolicy,
  UserActionPolicyTarget,
  UserManageLevel,
} from "./user-management.service";
export { getUserActionPolicy } from "./user-management.service";

/** /admin/campuses console: live campus directory + management API. */
export const campusManagementService: AdminCampusManagementService =
  createApiCampusManagementService();

export type { ManagedCampusSortField } from "./campus-management.service";

export const campusService: AdminCampusService =
  createMockCampusService(mockCampuses);

export const vendorService: AdminVendorService =
  createMockVendorService(mockVendors);

/** /admin/vendors console: live store directory + lifecycle API. */
export const vendorManagementService: AdminVendorManagementService =
  createApiVendorManagementService();

export {
  fetchVendorCampusOptions,
  reviewVendorDocument,
} from "./vendor-management.api";

export type { ManagedVendorSortField } from "./vendor-management.service";

/** /admin/products console (live moderation + listing lifecycle). */
export const productManagementService: AdminProductManagementService =
  createApiProductManagementService();

export type {
  ManagedProductSortField,
  ProductStockFilter,
} from "./product-management.service";

import type { AdminCategoryManagementService } from "./category-management.service";
import { createApiCategoryManagementService } from "./category-management.api";

/** /admin/categories console: live taxonomy API (scope with setCategoryTaxonomy). */
export const categoryManagementService: AdminCategoryManagementService =
  createApiCategoryManagementService();
export { setCategoryTaxonomy } from "./category-management.api";

import type { AdminOrderManagementService } from "./order-management.service";
import { createApiOrderManagementService } from "./order-management.api";

/** /admin/orders console: live inspection plus cancel/advance/dispute actions. */
export const orderManagementService: AdminOrderManagementService =
  createApiOrderManagementService();

import {
  AdminPaymentManagementService,
  createPaymentManagementService,
} from "./payment-management.service";

/** /admin/payments console (ledger + settlement inspection). */
export const paymentManagementService: AdminPaymentManagementService =
  createPaymentManagementService();

import {
  AdminFinanceManagementService,
  createFinanceManagementService,
} from "./wallet-management.service";

/** /admin/wallet + /admin/withdrawals console (funds overview, ledger, payouts). */
export const financeManagementService: AdminFinanceManagementService =
  createFinanceManagementService();

import type { AdminWalletAccountsService } from "./wallet-accounts.api";
import { createApiWalletAccountsService } from "./wallet-accounts.api";

/** /admin/wallet console: live vendor/customer wallet accounts, freeze/unfreeze and manual adjustments (GET/PATCH/POST /admin/wallets/accounts/*). */
export const walletAccountsService: AdminWalletAccountsService =
  createApiWalletAccountsService();

import type { AdminPromotionManagementService } from "./promotion-management.service";
import { createApiPromotionManagementService } from "./promotion-management.api";

import type { AdminFreelancerManagementService } from "./freelancer-management.service";
import { createApiFreelancerManagementService } from "./freelancer-management.api";

/** /admin/promotions console (campaigns, codes, featured placements). */
export const promotionManagementService: AdminPromotionManagementService =
  createApiPromotionManagementService();

export const productService: AdminProductService =
  createMockProductService(mockProducts);

export const categoryService: AdminCategoryService =
  createMockCategoryService(mockCategories);

export const orderService: AdminOrderService = createMockOrderService(mockOrders);

export const paymentService: AdminPaymentService =
  createMockPaymentService(mockPayments);

export const withdrawalService: AdminWithdrawalService =
  createMockWithdrawalService(mockWithdrawals);

export const promotionService: AdminPromotionService =
  createMockPromotionService(mockPromotions);

export const postService: AdminContentService = createMockPostService(mockPosts);
export const reportService: AdminReportService = createMockReportService(mockReports);
export const reviewService: AdminReviewService = createMockReviewService(mockReviews);
export const disputeService: AdminDisputeService =
  createMockDisputeService(mockDisputes);

import type { AdminCommunityService } from "./community.service";
import { createApiCommunityService } from "./community.api";

/** /admin/campus console: live moderation API (posts, comments, events, announcements, reports, polls). */
export const communityService: AdminCommunityService =
  createApiCommunityService();

import type { AdminReviewManagementService } from "./review-management.service";
import { createApiReviewManagementService } from "./review-management.api";

/** /admin/reviews console: live read-only ledger (GET /admin/reviews) plus real moderation (PATCH /:id/moderate). */
export const reviewManagementService: AdminReviewManagementService =
  createApiReviewManagementService();

export type { ManagedReviewSortField } from "./review-management.service";

import type { AdminTrustSafetyService } from "./report-management.service";
import { createApiTrustSafetyService } from "./report-management.api";

/** /admin/safety console: live ledger (GET /admin/safety) over flagged reviews and campus-post reports, with real post-report status moves. */
export const trustSafetyService: AdminTrustSafetyService =
  createApiTrustSafetyService();

export type { TrustSafetySortField } from "./report-management.service";

import type { AdminVerificationManagementService } from "./verification-management.service";
import { createApiVerificationManagementService } from "./verification-management.api";

/** /admin/verifications console (Admin Verification & KYC - unified view over real vendor/employer/freelancer verification state). */
export const verificationManagementService: AdminVerificationManagementService =
  createApiVerificationManagementService();

import type { AdminTransactionManagementService } from "./transaction-management.service";
import { createApiTransactionManagementService } from "./transaction-management.api";

/** /admin/transactions console: live read-only ledger (GET /admin/transactions) over order payments, wallet funding and refunds. */
export const transactionManagementService: AdminTransactionManagementService =
  createApiTransactionManagementService();

import type { AdminPayoutManagementService } from "./payout-management.service";
import { createApiPayoutManagementService } from "./payout-management.api";

/** /admin/payouts console: live read-only ledger (GET /admin/payouts) over wallet settlements and withdrawals owned by vendors and freelancers. */
export const payoutManagementService: AdminPayoutManagementService =
  createApiPayoutManagementService();

import type { FinanceManagementService } from "@/types/admin";
import { createApiFinanceConsoleService } from "./finance-management.api";

/** /admin/finance console: live read-only overview, reconciliation checks and CSV-exportable reports (GET /admin/finance/*). */
export const financeConsoleService: FinanceManagementService =
  createApiFinanceConsoleService();

export type { ManagedFinanceReportId } from "@/types/admin";

import {
  AdminCommunicationService,
  createAdminCommunicationService,
} from "./communication-management.service";

/** /admin/notifications console (Admin Communications - read-only over the real Module 26A in-app notification store + real user registry, with real in-app dispatch via pushNotificationRecord). */
export const adminCommunicationService: AdminCommunicationService =
  createAdminCommunicationService();

import type { AdminDisputeManagementService } from "./dispute-management.service";
import { createApiDisputeManagementService } from "./dispute-management.api";

/** /admin/disputes console: live case log (GET /admin/disputes) over disputed orders — open/resolve happens on the Orders console. */
export const disputeManagementService: AdminDisputeManagementService =
  createApiDisputeManagementService();

/** /admin/freelancers console: live directory + moderation API. */
export const freelancerManagementService: AdminFreelancerManagementService =
  createApiFreelancerManagementService();

export type { ManagedFreelancerSortField } from "./freelancer-management.service";

import type { AdminEmployerManagementService } from "./employer-management.service";
import { createApiEmployerManagementService } from "./employer-management.api";

/** /admin/employers console: live directory + moderation API. */
export const employerManagementService: AdminEmployerManagementService =
  createApiEmployerManagementService();

export { fetchEmployerCampusOptions } from "./employer-management.api";

export type { ManagedEmployerSortField } from "./employer-management.service";

import type { AdminMarketplaceManagementService } from "./marketplace-management.service";
import { createApiMarketplaceManagementService } from "./marketplace-management.api";

/** /admin/marketplace console (live listing oversight, read-only). */
export const marketplaceManagementService: AdminMarketplaceManagementService =
  createApiMarketplaceManagementService();

export type { MarketplaceSortField } from "./marketplace-management.service";

import type { AdminJobManagementService } from "./job-management.service";
import { createApiJobManagementService } from "./job-management.api";

/** /admin/jobs console (jobs & hiring oversight - live /admin/jobs, read-only). */
export const jobManagementService: AdminJobManagementService =
  createApiJobManagementService();

export type { ManagedJobSortField } from "./job-management.service";

import {
  AdminAnalyticsService,
  createMockAnalyticsService,
} from "./analytics.service";

/** /admin/reports console (platform analytics). */
export const analyticsService: AdminAnalyticsService =
  createMockAnalyticsService();

import {
  AdminNotificationManagementService,
  createMockNotificationManagementService,
} from "./notification-management.service";

/** /admin/notifications console (broadcast composer + history). */
export const notificationManagementService: AdminNotificationManagementService =
  createMockNotificationManagementService();

import type { AdminSettingsConfigService } from "./settings-config.service";
import { createApiSettingsConfigService } from "./settings-config.api";

/** /admin/settings console: live, versioned, audit-logged platform configuration. */
export const settingsConfigService: AdminSettingsConfigService =
  createApiSettingsConfigService();

import {
  AdminRbacService,
  createMockRbacService,
} from "./rbac.service";

/** /admin/permissions console (role matrices, in-memory persistence). */
export const rbacService: AdminRbacService = createMockRbacService();

import {
  AdminAuditTrailService,
  createAdminAuditTrailService,
} from "./audit-trail.service";

/**
 * /admin/audit-logs console (Module 48). READ-ONLY window over the
 * append-only audit trail; records are written by the real mutation
 * services, never by the UI.
 */
export const adminAuditTrailService: AdminAuditTrailService =
  createAdminAuditTrailService();

export const notificationService: AdminNotificationService =
  createMockNotificationService(mockNotifications);

export const settingService: AdminSettingService =
  createMockSettingService(mockSettings);

import type { AdminSupportManagementService } from "./support-management.service";
import { createApiSupportManagementService } from "./support-management.api";

/**
 * /admin/support console (Module 56): live ticket store
 * (GET/PATCH/POST /admin/support/tickets/*). Mutations audit via Module 48
 * and customer-visible replies dispatch real in-app notifications.
 *
 * The SAME database rows back the customer support portal (`/support`,
 * services/support.ts) through its own real endpoint
 * (GET/POST /support/tickets) — one record, two real HTTP surfaces.
 */
export const supportManagementService: AdminSupportManagementService =
  createApiSupportManagementService();

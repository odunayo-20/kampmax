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
import {
  mockOrders,
  mockPayments,
  mockWalletAccounts,
  mockWalletTxns,
  mockWithdrawals,
} from "@/data/admin/commerce";
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
import {
  AdminCampusManagementService,
  createCampusManagementService,
} from "./campus-management.service";
import { AdminCampusService, createMockCampusService } from "./campuses.service";
import { AdminVendorService, createMockVendorService } from "./vendors.service";
import type { AdminVendorManagementService } from "./vendor-management.service";
import { createApiVendorManagementService } from "./vendor-management.api";
import {
  AdminProductManagementService,
  createProductManagementService,
} from "./product-management.service";
import {
  AdminCategoryService,
  AdminProductService,
  createMockCategoryService,
  createMockProductService,
} from "./catalog.service";
import { AdminOrderService, createMockOrderService } from "./orders.service";
import { AdminPaymentService, createMockPaymentService } from "./payments.service";
import { AdminWalletService, createMockWalletService } from "./wallet.service";
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

/** /admin/campuses console (campus lifecycle + admin assignments). */
export const campusManagementService: AdminCampusManagementService =
  createCampusManagementService();

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

/** /admin/products console (moderation + listing lifecycle). */
export const productManagementService: AdminProductManagementService =
  createProductManagementService();

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

import {
  AdminOrderManagementService,
  createOrderManagementService,
} from "./order-management.service";

/** /admin/orders console (lifecycle inspection). */
export const orderManagementService: AdminOrderManagementService =
  createOrderManagementService();

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

import {
  AdminPromotionManagementService,
  createPromotionManagementService,
} from "./promotion-management.service";

import type { AdminFreelancerManagementService } from "./freelancer-management.service";
import { createApiFreelancerManagementService } from "./freelancer-management.api";

/** /admin/promotions console (campaigns, codes, featured placements). */
export const promotionManagementService: AdminPromotionManagementService =
  createPromotionManagementService();

export const productService: AdminProductService =
  createMockProductService(mockProducts);

export const categoryService: AdminCategoryService =
  createMockCategoryService(mockCategories);

export const orderService: AdminOrderService = createMockOrderService(mockOrders);

export const paymentService: AdminPaymentService =
  createMockPaymentService(mockPayments);

export const walletService: AdminWalletService = createMockWalletService(
  mockWalletAccounts,
  mockWalletTxns
);

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

import {
  AdminReviewManagementService,
  createReviewManagementService,
} from "./review-management.service";

/** /admin/reviews console (read-only, real-data review oversight). */
export const reviewManagementService: AdminReviewManagementService =
  createReviewManagementService();

export type { ManagedReviewSortField } from "./review-management.service";

import {
  AdminTrustSafetyService,
  createTrustSafetyService,
} from "./report-management.service";

/** /admin/safety console (Trust & Safety - read-only, real report data). */
export const trustSafetyService: AdminTrustSafetyService =
  createTrustSafetyService();

export type { TrustSafetySortField } from "./report-management.service";

import {
  AdminVerificationManagementService,
  createVerificationManagementService,
} from "./verification-management.service";

/** /admin/verifications console (Admin Verification & KYC - unified view over real vendor/employer/freelancer verification state). */
export const verificationManagementService: AdminVerificationManagementService =
  createVerificationManagementService();

import {
  AdminTransactionManagementService,
  createTransactionManagementService,
} from "./transaction-management.service";

/** /admin/transactions console (Admin Transactions & Payments - single real-data financial ledger; replaces the fabricated /admin/payments console). */
export const transactionManagementService: AdminTransactionManagementService =
  createTransactionManagementService();

import {
  AdminPayoutManagementService,
  createPayoutManagementService,
} from "./payout-management.service";

/** /admin/payouts console (Admin Vendor/Freelancer Payouts - read-only recipient payout ledger over the real wallet/vendor/freelancer payout stores). */
export const payoutManagementService: AdminPayoutManagementService =
  createPayoutManagementService();

import {
  FinanceManagementService,
  createFinanceConsoleService,
} from "./finance-management.service";

/** /admin/finance console (Admin Finance Reconciliation & Reports - read-only platform overview, reconciliation checks and CSV-exportable reports over the real orders/wallet/financials stores). */
export const financeConsoleService: FinanceManagementService =
  createFinanceConsoleService();

export type { ManagedFinanceReportId } from "@/types/admin";

import {
  AdminCommunicationService,
  createAdminCommunicationService,
} from "./communication-management.service";

/** /admin/notifications console (Admin Communications - read-only over the real Module 26A in-app notification store + real user registry, with real in-app dispatch via pushNotificationRecord). */
export const adminCommunicationService: AdminCommunicationService =
  createAdminCommunicationService();

import {
  AdminDisputeManagementService,
  createMockDisputeManagementService,
} from "./dispute-management.service";

/** /admin/disputes console (case resolution + refund placeholders). */
export const disputeManagementService: AdminDisputeManagementService =
  createMockDisputeManagementService();

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

import {
  AdminMarketplaceManagementService,
  createMarketplaceManagementService,
} from "./marketplace-management.service";

/** /admin/marketplace console (listing lifecycle oversight - derived from the real product store, read-only). */
export const marketplaceManagementService: AdminMarketplaceManagementService =
  createMarketplaceManagementService();

export type { MarketplaceSortField } from "./marketplace-management.service";

import {
  AdminJobManagementService,
  createJobManagementService,
} from "./job-management.service";

/** /admin/jobs console (jobs & hiring oversight - derived from the real opportunity store, read-only). */
export const jobManagementService: AdminJobManagementService =
  createJobManagementService();

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

import {
  AdminSettingsConfigService,
  createMockSettingsConfigService,
} from "./settings-config.service";

/** /admin/settings console (sectioned config, in-memory persistence). */
export const settingsConfigService: AdminSettingsConfigService =
  createMockSettingsConfigService();

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

import {
  AdminSupportManagementService,
  createMockSupportManagementService,
} from "./support-management.service";
import type { SupportCustomerService } from "@/types/admin";

/**
 * /admin/support console (Module 56). Ticket resolution built on a
 * deterministic dataset referencing the real user, order, vendor and
 * job stores. All mutations audit via Module 48 and customer-visible
 * replies dispatch real in-app notifications (Module 26A).
 *
 * The SAME store instance backs the customer support portal
 * (`/support`, Customer Support module): customer-created cases and
 * replies land here and appear in the admin console immediately.
 */
export const supportManagementService: AdminSupportManagementService &
  SupportCustomerService = createMockSupportManagementService();

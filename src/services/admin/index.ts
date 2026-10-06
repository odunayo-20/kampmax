// ============================================================
// ADMIN SERVICE CONTAINER
//
// Every admin page/component consumes services through this module,
// and every service here talks to the live NestJS API.
// ============================================================

import { DashboardService } from "./dashboard.service";
import { createApiDashboardService } from "./dashboard.api";

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
import type { AdminUserManagementService } from "./user-management.service";
import { createApiUserManagementService } from "./user-management.api";
import type { AdminCampusManagementService } from "./campus-management.service";
import { createApiCampusManagementService } from "./campus-management.api";
import { AdminCampusService } from "./campuses.service";
import { createApiCampusService } from "./campuses.api";
import type { AdminVendorManagementService } from "./vendor-management.service";
import { createApiVendorManagementService } from "./vendor-management.api";
import type { AdminProductManagementService } from "./product-management.service";
import { createApiProductManagementService } from "./product-management.api";
import {
  AdminNotificationService,
} from "./notifications.service";
import { createApiNotificationService } from "./notifications.api";

// Live API dashboard service — calls NestJS backend analytics + admin endpoints.
export const dashboardService: DashboardService = createApiDashboardService();


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
  createApiCampusService();


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

import type { AdminCustomerWithdrawalManagementService } from "./withdrawal-management.api";
import { createApiWithdrawalManagementService } from "./withdrawal-management.api";

/** /admin/withdrawals console: live customer wallet withdrawals (GET/PATCH /admin/withdrawals/*) — the slice of bank-transfer withdrawals Payouts excludes (vendor/freelancer earnings only). */
export const withdrawalManagementService: AdminCustomerWithdrawalManagementService =
  createApiWithdrawalManagementService();

import type { AdminPromotionManagementService } from "./promotion-management.service";
import { createApiPromotionManagementService } from "./promotion-management.api";

import type { AdminFreelancerManagementService } from "./freelancer-management.service";
import { createApiFreelancerManagementService } from "./freelancer-management.api";

/** /admin/promotions console (campaigns, codes, featured placements). */
export const promotionManagementService: AdminPromotionManagementService =
  createApiPromotionManagementService();








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

import type { AdminNotificationBroadcastService } from "@/types/admin";
import { createApiNotificationBroadcastService } from "./notification-broadcast.api";

/**
 * /admin/notifications console: live read-only ledger (GET /admin/notifications)
 * over the real in-app notification store, plus a real broadcast action
 * (POST /admin/notifications, in-app only — no email/push).
 *
 * Superseds the old `communication-management.service.ts` mock, whose
 * comments claimed to already be real but never made a network call — that
 * file is kept in place only because an audit-trail test still imports it
 * directly to exercise a real console action in isolation.
 */
export const adminCommunicationService: AdminNotificationBroadcastService =
  createApiNotificationBroadcastService();

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
} from "./analytics.service";
import { createApiAnalyticsService } from "./analytics.api";

export const analyticsService: AdminAnalyticsService =
  createApiAnalyticsService();

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

import type { AdminAuditLogService } from "@/types/admin";
import { createApiAuditLogService } from "./audit-log.api";

/**
 * /admin/audit-logs + /admin/security consoles: live, read-only window
 * over the real, SHA-256 hash-chained audit_logs table (GET
 * /admin/audit-logs/*). Records are written by the real mutation
 * services via AuditService, never by the UI.
 *
 * Supersedes the old `audit-trail.service.ts` mock (an in-memory,
 * per-session store) — that file is kept in place only because several
 * other still-mock consoles and its own dedicated test still write to it
 * directly via recordAdminAuditEvent().
 */
export const adminAuditTrailService: AdminAuditLogService = createApiAuditLogService();

export const notificationService: AdminNotificationService =
  createApiNotificationService();


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

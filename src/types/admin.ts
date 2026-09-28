// ============================================================
// KAMPMAX ADMIN - CENTRALIZED TYPES
// Single source of truth for the admin panel domain model.
// Mirrors the future NestJS API resource shapes 1:1.
// ============================================================

import type { MarketplaceProviderPortfolioItem, MarketplaceServiceReview } from "./service-marketplace";
import type { ProfileReviewSummary } from "./platform-reviews";
import type { EmployerApplicationStatus } from "./opportunity";
import type {
  OpportunityStatus,
  OpportunityWorkArrangement,
} from "./opportunity";
import type { NotificationCategory, NotificationType } from "./index";

// ------------------------------------------------------------
// AUTH & ROLES
// ------------------------------------------------------------

export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "CAMPUS_ADMIN";

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  campusId: string | null; // scoped campus for CAMPUS_ADMIN
  avatar: string;
  title: string;
  lastLoginAt: string;
  /** Backend permission slugs (live sessions only; mock profiles omit this). */
  permissions?: string[];
}

// ------------------------------------------------------------
// LIST / PAGINATION CONTRACT (mirrors NestJS pagination DTOs)
// ------------------------------------------------------------

export type SortDir = "asc" | "desc";

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDir;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RangeFilter {
  from?: string; // ISO date
  to?: string; // ISO date
}

// ------------------------------------------------------------
// CAMPUSES
// ------------------------------------------------------------

export type CampusStatus = "active" | "inactive";

export interface Campus {
  id: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  status: CampusStatus;
  studentCount: number;
  activeVendors: number;
  activeListings: number;
  ordersThisMonth: number;
  gmvThisMonth: number;
  launchDate: string;
}

// ------------------------------------------------------------
// USERS (customers + vendor owners, as seen by admin)
// ------------------------------------------------------------

export type PlatformUserKind = "student" | "vendor";
export type PlatformUserStatus = "active" | "suspended" | "banned";

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  kind: PlatformUserKind;
  campusId: string;
  status: PlatformUserStatus;
  isVerified: boolean;
  joinedAt: string;
  lastActiveAt: string;
  ordersCount: number;
  totalSpent: number;
  walletBalance: number;
  disputeCount: number;
}

// ------------------------------------------------------------
// USER MANAGEMENT (/admin/users console)
// Full platform directory - customers, vendors and staff accounts -
// governed from the dedicated users module.
// ------------------------------------------------------------

export type ManagedUserRole =
  | "customer"
  | "vendor"
  | "moderator"
  | "support"
  | "campus_admin"
  | "admin"
  | "super_admin";

export type ManagedUserStatus =
  | "active"
  | "suspended"
  | "pending_verification"
  | "deactivated";

/**
 * Row DTO for directory list endpoints (Module 35).
 * The backend surrogate strips sensitive wallet details from list payloads
 * (spec §9); readable rows are `Omit<ManagedUser, "walletBalance">`. The full
 * `ManagedUser` shape is only returned by detail endpoints, and only to
 * roles authorized to inspect it.
 */
export type ManagedUserListItem = Omit<ManagedUser, "walletBalance">;

/** Store details attached when role === "vendor". */
export interface ManagedVendorProfile {
  storeName: string;
  /** Stores have no category on the platform yet. */
  category: string | null;
  status: VendorStatus;
  rating: number;
  reviewsCount: number;
  productsCount: number;
  totalSales: number;
  /** Delivered / (delivered + cancelled) orders; null until a store has any. */
  fulfillmentRate: number | null;
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: ManagedUserRole;
  campusId: string;
  status: ManagedUserStatus;
  isVerified: boolean;
  joinedAt: string;
  lastActiveAt: string;
  ordersCount: number;
  totalSpent: number;
  walletBalance: number;
  disputeCount: number;
  reportsCount: number;
  vendorProfile: ManagedVendorProfile | null;
}

/**
 * Identity-only patch surface (Module 35). Role and campus are NOT editable
 * here: assignment requires the dedicated RBAC/permissions module on the
 * backend (spec §11). The service defensively strips role/campus fields even
 * if a future client attempts to send them (no mass assignment, §43/§44).
 */
export interface ManagedUserUpdateInput {
  name?: string;
  email?: string;
  phone?: string;
}

export interface UserStatusCounts {
  all: number;
  active: number;
  suspended: number;
  pending_verification: number;
  deactivated: number;
}

export type UserActivityKind =
  | "order"
  | "auth"
  | "wallet"
  | "listing"
  | "moderation"
  | "profile"
  | "admin";

export interface UserActivityEvent {
  id: string;
  kind: UserActivityKind;
  message: string;
  meta: string;
  at: string;
}

export interface UserOrderSummary {
  id: string;
  itemsSummary: string;
  itemsCount: number;
  total: number;
  status: AdminOrderStatus;
  /** Not recorded per order on the platform yet. */
  paymentMethod: AdminOrder["paymentMethod"] | null;
  paymentStatus: AdminOrder["paymentStatus"] | null;
  createdAt: string;
}

export interface UserWalletTxn {
  id: string;
  direction: WalletTxnDirection;
  type: AdminWalletTxn["type"];
  amount: number;
  reference: string;
  status: WalletTxnStatus;
  createdAt: string;
}

export interface UserWalletSummary {
  accountId: string;
  balance: number;
  totalCredited: number;
  totalDebited: number;
  status: WalletAccountStatus;
  lastActivityAt: string;
  recentTransactions: UserWalletTxn[];
}

export interface UserProfileReport {
  id: string;
  reason: ContentReport["reason"];
  detail: string;
  reporterName: string;
  status: ReportStatus;
  priority: ReportPriority;
  createdAt: string;
}

/** Full payload backing the user profile drawer. */
export interface ManagedUserDetail {
  user: ManagedUser;
  campus: Pick<Campus, "id" | "name" | "shortName" | "city" | "state"> | null;
  wallet: UserWalletSummary;
  orders: UserOrderSummary[];
  activity: UserActivityEvent[];
  reports: UserProfileReport[];
}

// ------------------------------------------------------------
// CAMPUS MANAGEMENT (/admin/campuses console)
// Campuses supported by Kampmax - governed from the dedicated
// campuses module. Ids mirror `Campus` so every campus-scoped
// record in the platform keeps resolving.
// ------------------------------------------------------------

export type CampusAdminAssignmentStatus = "active" | "invited";

export interface CampusAdminAssignment {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CampusAdminAssignmentStatus;
  assignedAt: string;
}

export interface ManagedCampus {
  id: string;
  /** Campus name (e.g. "RUGIPO Main Campus"). */
  name: string;
  /** Owning institution (e.g. "Rufus Giwa Polytechnic"). */
  institution: string;
  shortName: string;
  state: string;
  city: string;
  address: string;
  description: string;
  /** Logo URL or text monogram; null falls back to shortName initials. */
  logo: string | null;
  status: CampusStatus;
  usersCount: number;
  activeUsersCount: number;
  vendorsCount: number;
  productsCount: number;
  ordersCount: number;
  revenue: number;
  admins: CampusAdminAssignment[];
  createdAt: string;
}

export type CampusActivityKind =
  | "order"
  | "vendor"
  | "user"
  | "listing"
  | "moderation"
  | "admin";

export interface CampusActivityEvent {
  id: string;
  kind: CampusActivityKind;
  message: string;
  meta: string;
  at: string;
}

export interface CampusOverviewStats {
  totalStudents: number;
  totalUsers: number;
  activeUsers: number;
  vendors: number;
  products: number;
  orders: number;
  revenue: number;
  adminsCount: number;
}

export interface CampusStatusCounts {
  all: number;
  active: number;
  inactive: number;
}

export interface CampusCreateInput {
  institution: string;
  name: string;
  state: string;
  city: string;
  address?: string;
  description?: string;
  logo?: string | null;
  status: CampusStatus;
}

export interface CampusAdminInput {
  name: string;
  email: string;
  phone: string;
}

export interface ManagedCampusDetail {
  campus: ManagedCampus;
  stats: CampusOverviewStats;
  activity: CampusActivityEvent[];
}

// ------------------------------------------------------------
// VENDORS
// ------------------------------------------------------------

export type VendorStatus = "pending" | "approved" | "suspended" | "rejected";

export interface AdminVendor {
  id: string;
  storeName: string;
  ownerId: string;
  ownerName: string;
  email: string;
  phone: string;
  campusId: string;
  category: string;
  status: VendorStatus;
  rating: number;
  reviewsCount: number;
  productsCount: number;
  totalSales: number;
  walletBalance: number;
  fulfillmentRate: number;
  joinedAt: string;
}

// ------------------------------------------------------------
// VENDOR MANAGEMENT (/admin/vendors console)
// Two-axis lifecycle: verification (documents) x store status
// (trading). The five console buckets are mutually exclusive:
//   pending_verification | verified(active) | rejected |
//   suspended | deactivated
// ------------------------------------------------------------

export type VendorVerificationStatus =
  | "pending_verification"
  | "verified"
  | "rejected";

export type VendorStoreLifecycle = "active" | "suspended" | "deactivated";

/** Console bucket - collapses both axes into one of five queues. */
export type VendorBucket =
  | "pending_verification"
  | "verified"
  | "rejected"
  | "suspended"
  | "deactivated";

export type VendorVerificationDocKind =
  | "cac_certificate"
  | "business_registration"
  | "government_id"
  | "address_proof"
  | "tax_certificate"
  | "store_photo"
  | "bank_details"
  | "campus_permit";

export type VendorDocState = "submitted" | "approved" | "rejected" | "missing";

export interface VendorVerificationDocument {
  id: string;
  kind: VendorVerificationDocKind;
  label: string;
  reference: string;
  state: VendorDocState;
  note?: string;
}

export interface VendorVerificationRecord {
  emailVerified: boolean;
  phoneVerified: boolean;
  /** BVN is not collected on the platform yet, so this is null. */
  bvnVerified: boolean | null;
  documents: VendorVerificationDocument[];
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
}

export interface ManagedVendorOwner {
  id: string;
  name: string;
  email: string;
  phone: string;
  isIdVerified: boolean;
  joinedAt: string;
  ordersCount: number;
  totalSpent: number;
}

export interface ManagedVendor {
  id: string;
  storeName: string;
  ownerId: string;
  owner: ManagedVendorOwner;
  campusId: string;
  category: string;
  description: string;
  verificationStatus: VendorVerificationStatus;
  storeStatus: VendorStoreLifecycle;
  verification: VendorVerificationRecord;
  productsCount: number;
  ordersCount: number;
  /** Lifetime GMV through the store. Null when the backend has no ledger rows. */
  totalSales: number | null;
  /** Net after platform commission. */
  earnings: number;
  walletBalance: number;
  /** Share of orders fulfilled on time. Null when the store has no order records. */
  fulfillmentRate: number | null;
  rating: number;
  reviewsCount: number;
  complaintsCount: number;
  registeredAt: string;
  lastActiveAt: string;
}

export type VendorActivityKind =
  | "order"
  | "product"
  | "wallet"
  | "moderation"
  | "admin"
  | "auth";

export interface VendorActivityEvent {
  id: string;
  kind: VendorActivityKind;
  message: string;
  meta: string;
  at: string;
}

export interface VendorProductRow {
  id: string;
  title: string;
  price: number;
  /** Null when the catalog row carries no inventory count. */
  stock: number | null;
  status: AdminProduct["status"];
  /** Null when the backend records no per-listing sales figures. */
  soldCount: number | null;
  createdAt: string;
}

export interface VendorOrderRow {
  id: string;
  customerName: string;
  itemsSummary: string;
  itemsCount: number;
  total: number;
  status: AdminOrder["status"];
  /** Not recorded per order on the platform yet. */
  paymentStatus: AdminOrder["paymentStatus"] | null;
  createdAt: string;
}

export interface VendorReviewRow {
  id: string;
  customerName: string;
  targetName: string;
  rating: number;
  comment: string;
  status: AdminReviewStatus;
  createdAt: string;
}

export interface VendorComplaintRow {
  id: string;
  orderId: string;
  customerName: string;
  subject: string;
  category: DisputeCategory;
  priority: DisputePriority;
  amountInDispute: number;
  status: DisputeStatus;
  openedAt: string;
}

export interface VendorEarningsSummary {
  /** Gross sales; null when no ledger exists for the store. */
  grossSales: number | null;
  commissionRate: number;
  /** Null when there is no ledger to compute against. */
  commissionPaid: number | null;
  netEarnings: number | null;
  pendingPayout: number | null;
  lastPayoutAt: string | null;
}

export interface VendorStatusCounts {
  all: number;
  pending_verification: number;
  verified: number;
  rejected: number;
  suspended: number;
  deactivated: number;
}

export interface ManagedVendorDetail {
  vendor: ManagedVendor;
  campus: Pick<Campus, "id" | "name" | "shortName" | "city" | "state"> | null;
  earnings: VendorEarningsSummary;
  products: VendorProductRow[];
  orders: VendorOrderRow[];
  reviews: VendorReviewRow[];
  complaints: VendorComplaintRow[];
  activity: VendorActivityEvent[];
}

// ------------------------------------------------------------
// CATEGORIES
// ------------------------------------------------------------

export type CategoryStatus = "active" | "archived";

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  icon: string; // lucide icon name key resolved in UI layer
  parentId: string | null;
  productCount: number;
  activeListings: number;
  sortOrder: number;
  status: CategoryStatus;
}

// ------------------------------------------------------------
// PRODUCTS
// ------------------------------------------------------------

export type AdminProductStatus =
  | "available"
  | "pending_review"
  | "flagged"
  | "sold"
  | "removed";

export interface AdminProduct {
  id: string;
  title: string;
  vendorId: string;
  vendorName: string;
  categoryId: string;
  categoryName: string;
  campusId: string;
  price: number;
  originalPrice: number | null;
  condition: "New" | "Used" | "Fair";
  status: AdminProductStatus;
  stock: number;
  views: number;
  saves: number;
  reportsCount: number;
  createdAt: string;
}

// ------------------------------------------------------------
// PRODUCT MANAGEMENT (/admin/products moderation console)
// Lifecycle: pending_approval -> active -> suspended/archived,
// with out_of_stock as a trading state and rejected for listings
// that never passed review.
// ------------------------------------------------------------

export type ManagedProductStatus =
  | "active"
  | "pending_approval"
  | "rejected"
  | "out_of_stock"
  | "suspended"
  | "archived";

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface ProductModerationRecord {
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  suspensionReason: string | null;
}

export interface ManagedProduct {
  id: string;
  title: string;
  /** Remote showcase images (first entry = primary thumbnail). */
  images: string[];
  slug: string;
  description: string;
  specifications: ProductSpecification[];
  vendorId: string;
  vendorName: string;
  categoryId: string;
  categoryName: string;
  campusId: string;
  price: number;
  originalPrice: number | null;
  condition: AdminProduct["condition"] | "Refurbished";
  status: ManagedProductStatus;
  moderation: ProductModerationRecord;
  stock: number;
  views: number;
  saves: number;
  /** Units sold lifetime. */
  salesCount: number;
  /** Lifetime gross revenue through this listing. */
  revenue: number;
  rating: number;
  reviewsCount: number;
  reportsCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ProductActivityKind =
  | "listing"
  | "order"
  | "moderation"
  | "admin"
  | "pricing";

export interface ProductActivityEvent {
  id: string;
  kind: ProductActivityKind;
  message: string;
  meta: string;
  at: string;
}

export interface ProductReviewRow {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  status: AdminReviewStatus;
  helpfulCount: number;
  createdAt: string;
}

export interface ProductFacets {
  categories: { id: string; name: string }[];
  campuses: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
}

export interface ProductStatusCounts {
  all: number;
  active: number;
  pending_approval: number;
  rejected: number;
  out_of_stock: number;
  suspended: number;
  archived: number;
}

export interface ManagedProductDetail {
  product: ManagedProduct;
  vendor: {
    id: string;
    storeName: string;
    campusId: string;
    rating: number;
    productsCount: number;
  };
  campus: Pick<Campus, "id" | "name" | "shortName"> | null;
  reviews: ProductReviewRow[];
  reports: ContentReport[];
  activity: ProductActivityEvent[];
}

// ------------------------------------------------------------
// ORDERS
// ------------------------------------------------------------

export type AdminOrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface AdminOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vendorId: string;
  vendorName: string;
  campusId: string;
  itemsCount: number;
  itemsSummary: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: "paystack" | "bank_transfer" | "wallet" | "cod";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  status: AdminOrderStatus;
  deliveryMethod: "campus_pickup" | "meetup" | "delivery";
  createdAt: string;
}

// ------------------------------------------------------------
// PAYMENTS
// ------------------------------------------------------------

export type PaymentType =
  | "order_payment"
  | "wallet_funding"
  | "vendor_payout"
  | "refund"
  | "commission";

export type PaymentStatus = "successful" | "pending" | "failed" | "refunded";

export interface PaymentRecord {
  id: string;
  reference: string;
  userId: string;
  userName: string;
  counterparty: string | null; // vendor/store for order payments & payouts
  type: PaymentType;
  method: "paystack" | "wallet" | "bank_transfer" | "cod";
  amount: number;
  fee: number;
  status: PaymentStatus;
  createdAt: string;
}

// ------------------------------------------------------------
// WALLET
// ------------------------------------------------------------

export type WalletOwnerType = "user" | "vendor";
export type WalletAccountStatus = "active" | "frozen";

export interface WalletAccount {
  id: string;
  ownerType: WalletOwnerType;
  ownerName: string;
  ownerEmail: string;
  campusId: string;
  balance: number;
  totalCredited: number;
  totalDebited: number;
  status: WalletAccountStatus;
  lastActivityAt: string;
}

export type WalletTxnDirection = "credit" | "debit";
export type WalletTxnStatus = "completed" | "pending" | "failed";

export interface AdminWalletTxn {
  id: string;
  accountId: string;
  ownerName: string;
  ownerType: WalletOwnerType;
  direction: WalletTxnDirection;
  type:
    | "deposit"
    | "withdrawal"
    | "purchase"
    | "refund"
    | "vendor_payout"
    | "commission"
    | "adjustment";
  amount: number;
  balanceAfter: number;
  reference: string;
  status: WalletTxnStatus;
  createdAt: string;
}

// ------------------------------------------------------------
// WITHDRAWALS
// ------------------------------------------------------------

export type WithdrawalStatus =
  | "pending"
  | "processing"
  | "approved"
  | "rejected"
  | "failed"
  | "completed";

/** Admin-side lifecycle transitions shared by console + service layers. */
export type WithdrawalAction =
  | "approve"
  | "reject"
  | "start_processing"
  | "mark_completed"
  | "mark_failed";

export interface ManagedWithdrawalTimelineEvent {
  id: string;
  kind:
    | "requested"
    | "review"
    | "decision"
    | "completed"
    | "rejected"
    | "failed";
  label: string;
  detail?: string | null;
  at: string;
}

/** Everything the /admin/withdrawals/[id] screen renders. */
export interface ManagedWithdrawalDetail {
  request: WithdrawalRequest;
  /** Vendor's available wallet balance at inspection time. */
  vendorBalance: number | null;
  vendorWalletId: string | null;
  campusId: string | null;
  timeline: ManagedWithdrawalTimelineEvent[];
  /** This vendor's recent wallet activity. */
  history: ManagedFinanceTxn[];
  /** Same vendor's other payout requests, newest first. */
  previous: WithdrawalRequest[];
}

export interface WithdrawalRequest {
  id: string;
  vendorId: string;
  vendorName: string;
  bankName: string;
  accountNumberMasked: string;
  accountName: string;
  amount: number;
  fee: number;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt: string | null;
  note: string | null;
}

// ------------------------------------------------------------
// PROMOTIONS
// ------------------------------------------------------------

export type PromotionType =
  | "discount"
  | "flash_sale"
  | "free_delivery"
  | "coupon";
export type PromotionScope = "platform" | "campus" | "vendor";
export type PromotionStatus = "scheduled" | "active" | "paused" | "ended";

export interface Promotion {
  id: string;
  title: string;
  type: PromotionType;
  scope: PromotionScope;
  code: string | null;
  discountValue: number | null; // percent or naira depending on type
  campusId: string | null;
  vendorName: string | null;
  usageCount: number;
  usageLimit: number | null;
  budget: number | null;
  spend: number;
  startsAt: string;
  endsAt: string;
  status: PromotionStatus;
}

// ------------------------------------------------------------
// CAMPUS CONTENT (feed moderation)
// ------------------------------------------------------------

export type CampusPostStatus = "published" | "flagged" | "removed" | "pending";
export type CampusPostType =
  | "discussion"
  | "question"
  | "event"
  | "marketplace"
  | "announcement"
  | "lost_found"
  | "poll";

export interface CampusPost {
  id: string;
  authorId: string;
  authorName: string;
  campusId: string;
  type: CampusPostType;
  excerpt: string;
  status: CampusPostStatus;
  reportsCount: number;
  likes: number;
  comments: number;
  createdAt: string;
}

// ------------------------------------------------------------
// REPORTS (abuse/content reports)
// ------------------------------------------------------------

export type ReportTargetType = "post" | "product" | "user" | "review";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type ReportPriority = "low" | "medium" | "high";

export interface ContentReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetPreview: string;
  reason: "spam" | "inappropriate" | "scam" | "harassment" | "counterfeit" | "other";
  detail: string;
  reporterName: string;
  reportedName: string;
  status: ReportStatus;
  priority: ReportPriority;
  createdAt: string;
}

// ------------------------------------------------------------
// REVIEWS
// ------------------------------------------------------------

export type AdminReviewStatus = "published" | "pending" | "flagged" | "removed";

export interface AdminReview {
  id: string;
  targetType: "product" | "vendor";
  targetName: string;
  customerId: string;
  customerName: string;
  vendorName: string;
  campusId: string;
  rating: number;
  comment: string;
  status: AdminReviewStatus;
  helpfulCount: number;
  createdAt: string;
}

// ------------------------------------------------------------
// DISPUTES
// ------------------------------------------------------------

export type DisputeStatus =
  | "open"
  | "under_review"
  | "awaiting_customer"
  | "resolved"
  | "closed";
export type DisputePriority = "low" | "medium" | "high" | "urgent";
export type DisputeCategory =
  | "item_not_received"
  | "item_not_as_described"
  | "damaged_item"
  | "late_delivery"
  | "refund_issue"
  | "other";

export interface Dispute {
  id: string;
  orderId: string;
  customerName: string;
  vendorName: string;
  subject: string;
  category: DisputeCategory;
  priority: DisputePriority;
  amountInDispute: number;
  status: DisputeStatus;
  messagesCount: number;
  openedAt: string;
  resolvedAt: string | null;
}

// ------------------------------------------------------------
// NOTIFICATIONS (broadcast console)
// ------------------------------------------------------------

export type BroadcastAudience =
  | "all"
  | "students"
  | "vendors"
  | "campus";
export type BroadcastStatus = "sent" | "scheduled" | "draft";

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  campusId: string | null;
  sentBy: string;
  sentAt: string;
  recipients: number;
  openRate: number;
  status: BroadcastStatus;
}

// ------------------------------------------------------------
// SETTINGS
// ------------------------------------------------------------

export type SettingValueType = "text" | "toggle" | "select" | "number";

export interface PlatformSetting {
  key: string;
  label: string;
  description?: string;
  group: "general" | "commerce" | "wallet" | "moderation";
  valueType: SettingValueType;
  value: string | boolean | number;
  options?: { label: string; value: string }[];
}

// ------------------------------------------------------------
// DASHBOARD ANALYTICS
// ------------------------------------------------------------

export interface DashboardStats {
  gmvToday: number;
  gmvDeltaPct: number;
  ordersToday: number;
  ordersDeltaPct: number;
  activeUsers: number;
  activeUsersDeltaPct: number;
  pendingWithdrawals: number;
  pendingWithdrawalsAmount: number;
  openDisputes: number;
  flaggedContent: number;
  commissionToday: number;
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface TopVendorRow {
  vendorId: string;
  storeName: string;
  campusShortName: string;
  orders: number;
  revenue: number;
  rating: number;
}

export interface ActivityEvent {
  id: string;
  kind: "order" | "vendor" | "dispute" | "withdrawal" | "user" | "report";
  message: string;
  meta: string;
  at: string;
}

// ------------------------------------------------------------
// PLATFORM OVERVIEW (full /admin dashboard payload)
// ------------------------------------------------------------

export interface OverviewTotals {
  users: number;
  activeUsers: number;
  vendors: number;
  verifiedVendors: number;
  campuses: number;
  products: number;
  orders: number;
  revenue: number;
}

export interface FinancialMetrics {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  pendingPaymentsCount: number;
  pendingPaymentsAmount: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmount: number;
  platformEarnings: number;
}

export interface MarketplaceMetrics {
  ordersToday: number;
  ordersThisWeek: number;
}

export interface OperationsQueue {
  pendingVendorVerification: number;
  pendingProductApproval: number;
  pendingWithdrawalRequests: number;
  reportedProducts: number;
  reportedUsers: number;
  openDisputes: number;
}

export interface PlatformOverview {
  totals: OverviewTotals;
  financial: FinancialMetrics;
  marketplace: MarketplaceMetrics;
  operations: OperationsQueue;
}

/** Generic labeled series point for charts. */
export interface SeriesPoint {
  label: string;
  value: number;
  secondary?: number;
}

/** Cumulative growth series (users/vendors) over weeks. */
export interface GrowthPoint {
  label: string;
  total: number;
  added: number;
}

export interface TopProductRow {
  productId: string;
  title: string;
  vendorName: string;
  campusShortName: string;
  unitsSold: number;
  revenue: number;
}

export interface CampusSalesRow {
  campusId: string;
  shortName: string;
  orders: number;
  revenue: number;
  sharePct: number;
}

export interface LowStockRow {
  productId: string;
  title: string;
  vendorName: string;
  stock: number;
  status: AdminProductStatus;
}

export type ActivityKind =
  | "order"
  | "registration"
  | "vendor_application"
  | "report";

export interface ActivityFeedItem {
  id: string;
  kind: ActivityKind;
  message: string;
  meta: string;
  at: string;
}

// ------------------------------------------------------------
// CATEGORY MANAGEMENT (/admin/categories)
// ------------------------------------------------------------

export type ManagedCategoryStatus = "active" | "inactive";

export interface ManagedCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string; // lucide icon name key resolved in UI layer
  parentId: string | null;
  parentName: string | null;
  productCount: number; // products directly assigned to this category
  activeListings: number;
  subcategoryCount: number;
  totalProductCount: number; // includes descendants
  sortOrder: number; // position among siblings, 1-based
  status: ManagedCategoryStatus;
  createdAt: string;
  updatedAt: string;
}

export type CategorySortField = "sortOrder" | "name" | "productCount";

export type CategoryReorderDirection = "up" | "down";

export interface CategoryListQuery extends ListQuery {
  search?: string;
  status?: ManagedCategoryStatus | "all";
  sortBy?: CategorySortField;
  sortDir?: SortDir;
}

export interface CategoryStatusCounts {
  total: number;
  active: number;
  inactive: number;
  productsCovered: number;
}

export interface CategoryParentOption {
  id: string;
  name: string;
}

export interface CategoryInput {
  name: string;
  description: string;
  icon: string;
  parentId: string | null;
}

// ------------------------------------------------------------
// ORDER MANAGEMENT (/admin/orders)
// ------------------------------------------------------------

export type ManagedOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "disputed";

export type ManagedOrderPaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export interface ManagedOrderItem {
  id: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  thumbnail?: string | null;
  variant?: string | null;
}

export interface ManagedOrderPayment {
  method: AdminOrder["paymentMethod"] | "flutterwave";
  status: ManagedOrderPaymentStatus;
  transactionId: string; // links to /admin/payments ledger
  paidAt: string | null;
  refundedAmount: number;
}

export interface ManagedOrderDeliveryInfo {
  method: AdminOrder["deliveryMethod"];
  address?: string | null;
  meetupSpot?: string | null;
  pickupPoint?: string | null;
  riderName?: string | null;
  riderPhone?: string | null;
}

export interface ManagedOrderTimelineEvent {
  id: string;
  kind:
    | "placed"
    | "payment"
    | "confirmation"
    | "preparation"
    | "ready"
    | "dispatch"
    | "delivery"
    | "cancellation"
    | "dispute";
  label: string;
  detail?: string | null;
  at: string;
}

export interface ManagedOrderNote {
  id: string;
  authorRole: "customer" | "vendor" | "admin";
  authorName: string;
  body: string;
  createdAt: string;
}

export interface ManagedOrder
  extends Omit<AdminOrder, "status" | "paymentStatus" | "paymentMethod"> {
  paymentMethod: AdminOrder["paymentMethod"] | "flutterwave";
  status: ManagedOrderStatus;
  paymentStatus: ManagedOrderPaymentStatus;
}

export interface ManagedOrderDetail {
  order: ManagedOrder;
  items: ManagedOrderItem[];
  payment: ManagedOrderPayment;
  delivery: ManagedOrderDeliveryInfo;
  timeline: ManagedOrderTimelineEvent[];
  notes: ManagedOrderNote[];
  /** Present once a dispute has been opened; open while resolvedAt is null. */
  dispute?: {
    reason: string;
    openedAt: string;
    resolvedAt: string | null;
    resolution: string | null;
  } | null;
}

export type OrderSortField = "orderNumber" | "createdAt" | "total";

export interface OrderListQuery extends ListQuery {
  search?: string;
  status?: ManagedOrderStatus | "all";
  paymentStatus?: ManagedOrderPaymentStatus | "all";
  fulfillment?: AdminOrder["deliveryMethod"] | "all";
  campusId?: string;
  vendorId?: string;
  sortBy?: OrderSortField;
  sortDir?: SortDir;
}

export interface OrderFacets {
  campuses: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
}

export interface OrderStatusCounts {
  all: number;
  byStatus: Record<ManagedOrderStatus, number>;
  paymentIssues: number; // pending + failed payments awaiting action
}

// ------------------------------------------------------------
// PAYMENT MANAGEMENT (/admin/payments)
// ------------------------------------------------------------

export type ManagedPaymentStatus =
  | "pending"
  | "successful"
  | "failed"
  | "reversed"
  | "refunded"
  | "partially_refunded";

/** Grouped for the admin console; raw rails stay visible on records. */
export type ManagedPaymentMethod = "wallet" | "paystack" | "other";

export interface ManagedPayment {
  id: string;
  type: PaymentType;
  orderId: string | null; // set for order-linked flows
  customerId: string;
  customerName: string;
  vendorId: string | null;
  vendorName: string | null;
  campusId: string;
  amount: number;
  platformFee: number;
  vendorAmount: number; // what lands on the vendor's ledger
  method: ManagedPaymentMethod;
  status: ManagedPaymentStatus;
  reference: string; // internal reference
  gatewayRef: string; // provider-side reference (mock)
  refundedAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedPaymentTimelineEvent {
  id: string;
  kind:
    | "initiated"
    | "processing"
    | "settled"
    | "failure"
    | "refund"
    | "partial_refund"
    | "reversal";
  label: string;
  detail?: string | null;
  at: string;
}

export interface ManagedPaymentDetail {
  payment: ManagedPayment;
  order: Pick<
    ManagedOrder,
    "id" | "customerName" | "vendorName" | "total" | "status" | "createdAt"
  > | null;
  timeline: ManagedPaymentTimelineEvent[];
}

export type PaymentSortField = "createdAt" | "amount";

export interface PaymentListQuery extends ListQuery {
  search?: string;
  status?: ManagedPaymentStatus | "all";
  method?: ManagedPaymentMethod | "all";
  campusId?: string;
  vendorId?: string;
  sortBy?: PaymentSortField;
  sortDir?: SortDir;
}

export interface PaymentFacets {
  campuses: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
}

export interface PaymentStatusCounts {
  all: number;
  byStatus: Record<ManagedPaymentStatus, number>;
  totalVolume: number;
  settlementPending: number; // naira awaiting clearance
}

// ------------------------------------------------------------
// WALLET & FINANCE (/admin/wallet, /admin/withdrawals)
// ------------------------------------------------------------

export type ManagedFinanceTxnType =
  | "purchase"
  | "refund"
  | "vendor_payout"
  | "wallet_funding"
  | "withdrawal"
  | "platform_fee"
  | "loyalty_reward";

/** Which books a transaction touches - kept explicit so the console
 *  can always separate platform float from vendor and customer money.
 *  Reconciliation on the backend keys off this field. */
export type FinanceFundPool = "platform" | "vendor" | "customer";

export interface ManagedFinanceTxn {
  id: string;
  type: ManagedFinanceTxnType;
  pool: FinanceFundPool;
  ownerName: string;
  ownerType: WalletOwnerType;
  direction: WalletTxnDirection; // relative to the owning wallet
  amount: number;
  status: WalletTxnStatus;
  reference: string;
  balanceAfter: number;
  orderId: string | null;
  createdAt: string;
}

export interface FinanceTxnQuery extends ListQuery {
  search?: string;
  type?: ManagedFinanceTxnType | "all";
  status?: WalletTxnStatus | "all";
  pool?: FinanceFundPool | "all";
  sortBy?: "createdAt" | "amount";
  sortDir?: SortDir;
}

export interface FinanceOverview {
  /** Kampmax operating float - money the platform itself holds. */
  platform: {
    balance: number; // available + pending
    available: number; // settled, spendable
    pending: number; // in-flight transactions
    earnings: number; // commissions + platform fees collected
  };
  /** Money that belongs to vendors but sits on platform rails. */
  vendor: {
    payable: number; // owed to vendors incl. approved-but-unpaid withdrawals
    walletHeld: number; // aggregate vendor wallet balances
  };
  /** Money customers keep inside Kampmax wallets - a liability. */
  customer: {
    liability: number; // aggregate user wallet balances
    accounts: number;
  };
  revenue: {
    gross: number; // successful order payments
    refunds: number; // refunded back to customers
    net: number; // gross - refunds
  };
  withdrawals: {
    completedAmount: number;
    pendingCount: number;
    pendingAmount: number;
  };
}

export interface WithdrawalStatusCounts {
  all: number;
  byStatus: Record<WithdrawalStatus, number>;
  pendingAmount: number;
  completedAmount: number;
}

// ------------------------------------------------------------
// PROMOTION MANAGEMENT (/admin/promotions)
// Discounts, deals, promo codes, featured placements and
// campus campaigns. Live promotions are percentage or fixed-amount
// promo codes redeemed at checkout; the other types are not supported.
// ------------------------------------------------------------

export type ManagedPromotionType =
  | "percentage_discount"
  | "fixed_discount"
  | "promo_code"
  | "featured_product"
  | "featured_vendor"
  | "campus_promotion";

export type ManagedPromotionStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "ended";

/** Where Kampmax surfaces the promotion in the storefront. */
export type PromotionPlacement =
  | "homepage_banner"
  | "deals_page"
  | "category_strip"
  | "search_boost"
  | "none";

/**
 * Audience + catalogue scoping. An empty array means "no restriction"
 * (e.g. all campuses) except where a type requires an explicit target.
 */
export interface PromotionTargeting {
  campusIds: string[];
  vendorIds: string[];
  productIds: string[];
  categoryIds: string[];
}

export type PromotionReview = "approved" | "pending" | "rejected";

/** Who a promo code is open to. "New" / "returning" is per store. */
export type PromotionEligibility =
  | "all_customers"
  | "new_customers"
  | "returning_customers";

export interface ManagedPromotion {
  id: string; // prm-###
  name: string;
  description: string;
  type: ManagedPromotionType;
  status: ManagedPromotionStatus;
  /** Redeemable code - promo_code type only. */
  code: string | null;
  /** Percent (percentage_discount) or naira (fixed_discount / promo_code). */
  discountValue: number | null;
  minSpend: number | null;
  placement: PromotionPlacement;
  targeting: PromotionTargeting;
  usageCount: number;
  usageLimit: number | null;
  /** Cap on the discount for one order (percentage codes). */
  maxDiscount?: number | null;
  /** Times one customer may redeem it. */
  perUserLimit?: number | null;
  eligibility?: PromotionEligibility;
  startsAt: string;
  /** null = no end date. */
  endsAt: string | null;
  /** Set when a vendor (not the platform) runs the promotion. */
  vendorName?: string | null;
  /** Times its storefront slot was shown / clicked. */
  views?: number;
  clicks?: number;
  /** A vendor's promotion is pending until an admin approves it. */
  review?: PromotionReview;
  /** Why a vendor promotion was rejected. */
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Editable payload for create/update. */
export interface PromotionInput {
  name: string;
  description: string;
  type: ManagedPromotionType;
  code: string | null;
  discountValue: number | null;
  minSpend: number | null;
  placement: PromotionPlacement;
  targeting: PromotionTargeting;
  usageLimit: number | null;
  maxDiscount?: number | null;
  perUserLimit?: number | null;
  eligibility?: PromotionEligibility;
  startsAt: string;
  endsAt: string;
}

export interface PromotionListQuery extends ListQuery {
  search?: string;
  type?: ManagedPromotionType | "all";
  status?: ManagedPromotionStatus | "all";
  campusId?: string | "all";
  review?: PromotionReview | "all";
  sortBy?: "name" | "startsAt" | "endsAt" | "usageCount";
  sortDir?: SortDir;
}

export interface PromotionStatusCounts {
  all: number;
  byStatus: Record<ManagedPromotionStatus, number>;
  /** Active right now by calendar window. */
  liveNow: number;
  /** Vendor promotions waiting for an admin's approval. */
  needsReview?: number;
}

export interface PromotionTargetingOptions {
  campuses: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  products: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

// ------------------------------------------------------------
// COMMUNITY MANAGEMENT (/admin/campus)
// ------------------------------------------------------------

export type CommunityPostStatus =
  | "published"
  | "hidden"
  | "reported"
  | "removed"
  | "under_review";

export interface CommunityAuthor {
  /** PlatformUser id (usr-###) so the author profile deep-links. */
  id: string;
  name: string;
}

export interface CommunityPost {
  id: string;
  author: CommunityAuthor;
  campusId: string;
  type: CampusPostType;
  content: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  reportsCount: number;
  status: CommunityPostStatus;
  createdAt: string;
}

export type CommunityCommentStatus = "published" | "hidden" | "removed";

export interface CommunityComment {
  id: string;
  postId: string;
  postExcerpt: string;
  author: CommunityAuthor;
  content: string;
  campusId: string;
  likeCount: number;
  status: CommunityCommentStatus;
  createdAt: string;
}

export type CommunityEventStatus =
  | "upcoming"
  | "live"
  | "completed"
  | "cancelled";

export interface CommunityEvent {
  id: string;
  title: string;
  organizer: CommunityAuthor;
  campusId: string;
  venue: string;
  startsAt: string;
  /** The platform doesn't record an end time or capacity for events. */
  endsAt: string | null;
  attendeeCount: number;
  capacity: number | null;
  status: CommunityEventStatus;
  createdAt: string;
}

export type AnnouncementStatus = "published" | "archived";
export type AnnouncementPriority = "info" | "warning" | "urgent";

export interface ManagedAnnouncement {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  /** Empty array = network-wide (no campus). */
  campusIds: string[];
  publishAt: string | null;
  createdBy: string;
  status: AnnouncementStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementInput {
  title: string;
  body: string;
  priority: AnnouncementPriority;
  /** Empty array = network-wide (no campus). Ignored when editing. */
  campusIds: string[];
}

export type CommunityReportTargetType = "post" | "comment" | "event" | "poll";
export type CommunityReportReason =
  | "spam"
  | "harassment"
  | "misinformation"
  | "scam"
  | "inappropriate"
  | "other";
export type CommunityReportStatus = "open" | "reviewing" | "actioned" | "dismissed";

export interface CommunityReport {
  id: string;
  targetType: CommunityReportTargetType;
  targetId: string;
  targetPreview: string;
  reason: CommunityReportReason;
  detail: string;
  reporterName: string;
  priority: "low" | "medium" | "high";
  status: CommunityReportStatus;
  createdAt: string;
}

export interface ManagedPollOption {
  label: string;
  votes: number;
}

export type ManagedPollStatus = "active" | "closed";

export interface ManagedPoll {
  id: string;
  question: string;
  options: ManagedPollOption[];
  campusId: string;
  totalVotes: number;
  endsAt: string;
  status: ManagedPollStatus;
  createdAt: string;
}

export interface CommunityPostDetail {
  post: CommunityPost;
  comments: CommunityComment[];
  reports: CommunityReport[];
}

export interface PostListQuery extends ListQuery {
  search?: string;
  status?: CommunityPostStatus | "all";
  type?: CampusPostType | "all";
  campusId?: string | "all";
}

export interface CommentListQuery extends ListQuery {
  search?: string;
  status?: CommunityCommentStatus | "all";
  campusId?: string | "all";
}

export interface EventListQuery extends ListQuery {
  search?: string;
  status?: CommunityEventStatus | "all";
  campusId?: string | "all";
}

export interface AnnouncementListQuery extends ListQuery {
  search?: string;
  status?: AnnouncementStatus | "all";
}

export interface ReportListQuery extends ListQuery {
  status?: CommunityReportStatus | "all";
  targetType?: CommunityReportTargetType | "all";
}

export interface PollListQuery extends ListQuery {
  search?: string;
  status?: ManagedPollStatus | "all";
  campusId?: string | "all";
}

/** `{ all, byStatus }` shape shared by every community section. */
export interface CommunitySectionCounts<S extends string> {
  all: number;
  byStatus: Record<S, number>;
}

// ------------------------------------------------------------
// REVIEW MANAGEMENT (/admin/reviews)  [Module 41]
// ------------------------------------------------------------
// Real-data overview of EVERY public review on the platform across four
// target kinds:
//   1. Storefront reviews (src/data/reviews.ts) — product / vendor targets.
//      These records carry NO moderation state in the store; being present
//      in the public store IS their publication, so status is DERIVED
//      "published" and flagged statusSource: "derived".
//   2. Profile reviews (src/data/profile-reviews.ts, Module 33) —
//      freelancer / employer targets with a REAL backend-owned status field,
//      surfaced 1:1 (statusSource: "store").
// The legacy fabricated statuses "reported" / "under_review" are dropped —
// no store records them.

export const MANAGED_REVIEW_TARGET_TYPES = [
  "product",
  "vendor",
  "freelancer",
  "employer",
] as const;
export type ManagedReviewTargetType =
  (typeof MANAGED_REVIEW_TARGET_TYPES)[number];

export const MANAGED_REVIEW_STATUSES = [
  "published",
  "pending",
  "hidden",
  "removed",
] as const;
export type ManagedReviewStatus = (typeof MANAGED_REVIEW_STATUSES)[number];

/** "store" == backend-owned moderation field; "derived" == public-by-presence in the store (no moderation field exists). */
export type ManagedReviewStatusSource = "store" | "derived";

export type ManagedReviewSortField =
  | "createdAt"
  | "rating"
  | "helpful"
  | "reported";

export type ManagedReviewReportReason =
  | "spam"
  | "fake"
  | "inappropriate"
  | "offensive"
  | "irrelevant"
  | "other";

export interface ManagedReviewRow {
  id: string;
  targetType: ManagedReviewTargetType;
  targetId: string;
  targetName: string;
  reviewerId: string | null;
  reviewerName: string;
  reviewerAvatar: string | null;
  rating: 1 | 2 | 3 | 4 | 5;
  helpfulCount: number;
  title: string | null;
  commentPreview: string;
  status: ManagedReviewStatus;
  statusSource: ManagedReviewStatusSource;
  reportedCount: number;
  verifiedPurchase: boolean;
  withImages: boolean;
  hasResponse: boolean;
  orderId: string | null;
  vendorId: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ManagedReviewCounts {
  all: number;
  byStatus: Record<ManagedReviewStatus, number>;
  byTargetType: Record<ManagedReviewTargetType, number>;
  /** Reviews with at least one read report. */
  reported: number;
  /**
   * Operational attention signal. No moderation transitions exist in any
   * review store, so this is deliberately the sum of rows with open reports
   * — zero today, and never fabricated.
   */
  needsAttention: number;
  withImages: number;
  withResponse: number;
}

export interface ManagedReviewFacetOption {
  id: string;
  name: string;
  count: number;
}

export interface ManagedReviewFacets {
  targetTypes: ManagedReviewFacetOption[];
  vendors: ManagedReviewFacetOption[];
}

/** Read-only projection of a review report (never fabricated). */
export interface ManagedReviewReportView {
  id: string;
  reporterUserId: string | null;
  reporterName: string;
  reason: ManagedReviewReportReason;
  details: string | null;
  createdAt: string;
}

export interface ManagedReviewEntity {
  targetType: ManagedReviewTargetType;
  id: string;
  name: string;
  verified: boolean;
  /** Public page link; null when the store has no slug/route for the entity. */
  href: string | null;
  hrefLabel: string;
  /** Admin console page for the entity (when one exists). */
  adminHref: string | null;
}

export interface ManagedReviewDetail {
  review: ManagedReviewRow;
  fullComment: string;
  images: { id: string; url: string; alt: string | null }[];
  vendorResponse: { text: string; createdAt: string } | null;
  reviewer: {
    id: string | null;
    name: string;
    avatar: string | null;
    campusName: string | null;
  };
  entity: ManagedReviewEntity;
  reports: ManagedReviewReportView[];
  statusNote: string;
}

export interface ManagedReviewListQuery extends ListQuery {
  search?: string;
  status?: ManagedReviewStatus | "all";
  /** Exact star filter; "all" disables it. */
  rating?: 1 | 2 | 3 | 4 | 5 | "all";
  targetType?: ManagedReviewTargetType | "all";
  vendorId?: string | "all";
  /** Presence of a vendor response on the review. */
  response?: "all" | "answered" | "unanswered";
  /** Only rows that carry at least one read report. */
  reportedOnly?: boolean;
  sortBy?: ManagedReviewSortField;
  sortDir?: SortDir;
}

// ------------------------------------------------------------
// TRUST & SAFETY (/admin/safety)  [Module 42]
// ------------------------------------------------------------
// Real report surfaces only. No Kampmax store carries report-level
// severity, assignment, notes, history or escalation today, so none of
// those fields exist here — the console surfaces what the stores actually
// hold (reason, details, reporter, created) plus honest statuses derived
// from the reported target's OWN real moderation state (where one exists).

export const TRUST_SAFETY_SOURCES = [
  "storefront_review",
  "profile_review",
  "campus_post",
] as const;
export type TrustSafetySource = (typeof TRUST_SAFETY_SOURCES)[number];

export const TRUST_SAFETY_STATUSES = [
  "open",
  "reviewing",
  "resolved",
  "dismissed",
] as const;
export type TrustSafetyReportStatus = (typeof TRUST_SAFETY_STATUSES)[number];

export type TrustSafetyTargetType =
  | "product"
  | "vendor"
  | "freelancer"
  | "employer"
  | "post";

export type TrustSafetySortField = "createdAt" | "entityReportCount";

/** One normalized row over a real report record from any store. */
export interface TrustSafetyReportRow {
  id: string;
  source: TrustSafetySource;
  status: TrustSafetyReportStatus;
  /** Explains why `status` holds its value — never a fabricated backend field. */
  statusNote: string;
  /** Raw backend-owned reason value from the originating store. */
  reason: string;
  details: string | null;
  targetType: TrustSafetyTargetType;
  targetId: string;
  targetName: string;
  /** Short excerpt of the reported content (list-safe). */
  targetPreview: string;
  /** Real moderation state of the TARGET (null when the store has none). */
  targetStatus: string | null;
  /** Public page for the reported entity, when one exists. */
  targetHref: string | null;
  /** Existing admin console for the target (Modules 35-41), when one exists. */
  adminHref: string | null;
  campusId: string | null;
  reporterUserId: string | null;
  reporterName: string;
  /** Reports recorded against the same target (derived from real rows). */
  entityReportCount: number;
  createdAt: string;
}

export interface TrustSafetyReportCounts {
  all: number;
  byStatus: Record<TrustSafetyReportStatus, number>;
  bySource: Record<TrustSafetySource, number>;
  byReason: { reason: string; count: number }[];
  byTargetType: Record<TrustSafetyTargetType, number>;
  uniqueReporters: number;
  /** Distinct reported targets across all sources. */
  uniqueTargets: number;
  /** Open reports. (True "needs attention" queues await a backend triage API.) */
  open: number;
}

export interface TrustSafetyReportFacets {
  sources: { source: TrustSafetySource; count: number }[];
  statuses: { status: TrustSafetyReportStatus; count: number }[];
  reasons: { reason: string; count: number }[];
  targetTypes: { targetType: TrustSafetyTargetType; count: number }[];
  topTargets: {
    targetId: string;
    targetName: string;
    targetType: TrustSafetyTargetType;
    count: number;
    adminHref: string | null;
  }[];
}

export interface TrustSafetyEntity {
  targetType: TrustSafetyTargetType;
  id: string;
  name: string;
  verified: boolean;
  href: string | null;
  hrefLabel: string;
  adminHref: string | null;
}

export interface TrustSafetyReportDetail extends TrustSafetyReportRow {
  /** Full reported content (detail-only; never in list/search responses). */
  fullText: string | null;
  /** Images attached to the reported content (detail-only). */
  images: { id: string; url: string; alt: string | null }[];
  reporter: {
    id: string | null;
    name: string;
    campusName: string | null;
  };
  entity: TrustSafetyEntity | null;
  /** Other reports recorded against the same target (real rows only). */
  relatedReports: {
    id: string;
    source: TrustSafetySource;
    reason: string;
    createdAt: string;
    reporterName: string;
  }[];
}

export interface TrustSafetyReportListQuery extends ListQuery {
  search?: string;
  status?: TrustSafetyReportStatus | "all";
  source?: TrustSafetySource | "all";
  /** Exact reason value; "all" disables it. */
  reason?: string | "all";
  targetType?: TrustSafetyTargetType | "all";
  campusId?: string | "all";
  sortBy?: TrustSafetySortField;
  sortDir?: SortDir;
}

// ------------------------------------------------------------
// ADMIN VERIFICATION & KYC OPERATIONS (/admin/verifications)  [Module 43]
// ------------------------------------------------------------
// One normalized view over the REAL verification state held by the vendor,
// employer and freelancer (marketplace provider) stores. No Kampmax store
// holds a unified "verification request" entity, admin task assignment,
// expiry or resubmission history, so nothing here invents those. Rows are
// derived from the owning store's real status value; the console vocabulary
// below is a LABEL on top of that value, never a fabricated backend field.
// Decisions exist only where a real backend path does (vendor approval /
// rejection) and are delegated to the vendor management service.

export const MANAGED_VERIFICATION_APPLICANT_TYPES = [
  "vendor",
  "freelancer",
  "employer",
] as const;
export type ManagedVerificationApplicantType =
  (typeof MANAGED_VERIFICATION_APPLICANT_TYPES)[number];

export const MANAGED_VERIFICATION_STATUSES = [
  "awaiting_review",
  "verified",
  "rejected",
  "action_required",
] as const;
export type ManagedVerificationStatus =
  (typeof MANAGED_VERIFICATION_STATUSES)[number];

export const MANAGED_VERIFICATION_TYPES = [
  "identity",
  "business",
  "address",
  "email",
  "professional",
] as const;
export type ManagedVerificationType =
  (typeof MANAGED_VERIFICATION_TYPES)[number];

export type ManagedVerificationSortField =
  | "applicantName"
  | "verificationType"
  | "submittedAt"
  | "updatedAt";

/** One normalized verification row derived from a real owning store. */
export interface ManagedVerificationRow {
  id: string;
  applicantType: ManagedVerificationApplicantType;
  applicantId: string;
  applicantName: string;
  /** Short descriptor shown next to the name in lists. */
  applicantSummary: string;
  verificationType: ManagedVerificationType | null;
  /** Console vocabulary — a label derived from `statusNote`+`sourceStatus`. */
  status: ManagedVerificationStatus;
  /** Raw backend-owned status value from the owning store. */
  sourceStatus: string;
  /** Human explanation of how `status` was derived (never invented data). */
  statusNote: string;
  submittedAt: string | null;
  updatedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  /** Uploaded/approved documents actually on record. */
  documentsCount: number;
  /** Required documents where the store carries a requirement list. */
  documentsTotal: number;
  campusId: string | null;
  campusName: string | null;
  /** Person responsible for the applicant (real user). */
  ownerName: string;
  /** Deep link into the responsible admin console (Modules 35-39). */
  applicantHref: string;
}

export interface ManagedVerificationCounts {
  all: number;
  byStatus: Record<ManagedVerificationStatus, number>;
  byApplicantType: Record<ManagedVerificationApplicantType, number>;
  /** Rows that actually carry document records in a real store. */
  withDocuments: number;
}

export interface ManagedVerificationListQuery extends ListQuery {
  status?: ManagedVerificationStatus | "all";
  applicantType?: ManagedVerificationApplicantType | "all";
  verificationType?: ManagedVerificationType | "all";
  campusId?: string | "all";
  sortBy?: ManagedVerificationSortField;
  sortDir?: SortDir;
}

/** Document metadata surfaced from a real store (never raw refs). */
export interface ManagedVerificationDocument {
  id: string;
  documentType: string;
  label: string;
  required: boolean;
  /** Real document status value (e.g. not_uploaded / uploaded). */
  status: string;
  fileName: string | null;
  acceptedFormats: string[];
  maxSizeMb: number;
  /** Private storage handle exists in the store but is NEVER exposed. */
  hasPrivateRef: boolean;
  actionMessage: string | null;
}

/** Real, backend-configured document requirements for an applicant type. */
export interface ManagedVerificationDocumentPolicyItem {
  documentType: string;
  label: string;
  required: boolean;
  acceptedFormats: string[];
  maxSizeMb: number;
}

export type ManagedVerificationHistoryKind =
  | "submitted"
  | "reviewed"
  | "approved"
  | "rejected"
  | "status_change";

/** One real, attributable verification event. No invented timeline. */
export interface ManagedVerificationHistoryItem {
  id: string;
  kind: ManagedVerificationHistoryKind;
  title: string;
  meta: string;
  at: string;
}

export interface ManagedVerificationApplicantSummary {
  type: ManagedVerificationApplicantType;
  title: string;
  subtitle: string | null;
  email: string | null;
  phone: string | null;
  /** Real account status held by the owning console. */
  accountStatus: string | null;
  established: string | null;
  description: string | null;
  adminHref: string;
  publicHref: string | null;
}

export interface ManagedVerificationDecisionSupport {
  /** True only where a real approval/rejection backend path exists. */
  actionable: boolean;
  canApprove: boolean;
  canReject: boolean;
  reasonNote: string;
}

export interface ManagedVerificationDetail {
  verification: ManagedVerificationRow;
  applicant: ManagedVerificationApplicantSummary;
  documents: ManagedVerificationDocument[];
  /** Real requirement template for the applicant type; null when the
   *  owning application store carries no document policy. */
  documentPolicy: ManagedVerificationDocumentPolicyItem[] | null;
  history: ManagedVerificationHistoryItem[];
  decisionSupport: ManagedVerificationDecisionSupport;
}

// ------------------------------------------------------------
// ADMIN TRANSACTIONS & PAYMENTS (/admin/transactions)  [Module 44]
// ------------------------------------------------------------
// A single financial ledger derived ONLY from real records. Two Kampmax
// stores own money movements: orders (an order's `paymentStatus`) and the
// customer wallet ledger (`walletTransactions`). Every row below is a
// label on top of a real record — no fabricated rows, no invented gateway
// references, no settlement states. Refunded orders surface via their
// `paymentStatus`; explicit refunds surface via real `refund` wallet
// records. Payouts (Module 45) and reconciliation (Module 46) are separate
// consoles and are deliberately absent here. There is no campus scope:
// financial records are restricted to full operators (ADMIN/SUPER_ADMIN).

export const MANAGED_TRANSACTION_STATUSES = [
  "successful",
  "pending",
  "processing",
  "failed",
  "refunded",
  "cancelled",
] as const;
export type ManagedTransactionStatus =
  (typeof MANAGED_TRANSACTION_STATUSES)[number];

export const MANAGED_TRANSACTION_TYPES = [
  "order_payment",
  "wallet_funding",
  "refund",
] as const;
export type ManagedTransactionType = (typeof MANAGED_TRANSACTION_TYPES)[number];

export const MANAGED_TRANSACTION_METHODS = [
  "paystack",
  "flutterwave",
  "wallet",
  "cod",
  "bank_transfer",
] as const;
export type ManagedTransactionMethod =
  (typeof MANAGED_TRANSACTION_METHODS)[number];

export type ManagedTransactionSortField = "createdAt" | "amount";

/** One ledger row derived from a real order or wallet transaction record. */
export interface ManagedTransaction {
  id: string;
  type: ManagedTransactionType;
  /** Console vocabulary — a label derived from `sourceStatus`. */
  status: ManagedTransactionStatus;
  /** Raw backend-owned status value from the owning store. */
  sourceStatus: string;
  /** Human explanation of how `status` was derived (never invented data). */
  statusNote: string;
  direction: "credit" | "debit";
  customerId: string;
  customerName: string;
  vendorId: string | null;
  vendorName: string | null;
  orderId: string | null;
  amount: number;
  platformFee: number;
  method: ManagedTransactionMethod;
  /** Channel detail carried by the owning record (e.g. bank/card label). */
  channelLabel: string | null;
  /** Internal reference where the owning store records one. */
  reference: string | null;
  /** Provider-side reference. The prototype backend tracks none. */
  gatewayRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedTransactionOrderSummary {
  id: string;
  status: string;
  itemCount: number;
  subtotal: number;
  platformFee: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export type ManagedTransactionActivityKind =
  | "initiated"
  | "completed"
  | "cancelled"
  | "refunded"
  | "note";

export interface ManagedTransactionActivity {
  id: string;
  kind: ManagedTransactionActivityKind;
  title: string;
  meta: string;
  at: string;
}

export interface ManagedTransactionGatewayStatus {
  /** Provider verification isn't wired into the prototype backend. */
  tracked: boolean;
  note: string;
}

export interface ManagedTransactionActionSupport {
  /** Refund execution isn't wired into the prototype backend. */
  refundable: boolean;
  note: string;
}

export interface ManagedTransactionDetail {
  transaction: ManagedTransaction;
  order: ManagedTransactionOrderSummary | null;
  activity: ManagedTransactionActivity[];
  gateway: ManagedTransactionGatewayStatus;
  actions: ManagedTransactionActionSupport;
}

export interface ManagedTransactionStatusCounts {
  all: number;
  byStatus: Record<ManagedTransactionStatus, number>;
  byType: Record<ManagedTransactionType, number>;
  /** Sum of all ledger amounts (naira, minor-unit-safe integers). */
  totalVolume: number;
  successfulVolume: number;
  pendingVolume: number;
  refundedVolume: number;
}

export interface ManagedTransactionFacets {
  methods: { id: ManagedTransactionMethod; name: string }[];
  types: { id: ManagedTransactionType; name: string }[];
}

export interface ManagedTransactionListQuery extends ListQuery {
  search?: string;
  status?: ManagedTransactionStatus | "all";
  type?: ManagedTransactionType | "all";
  method?: ManagedTransactionMethod | "all";
  /** Inclusive lower bound on createdAt, `YYYY-MM-DD` (local day). */
  dateFrom?: string;
  /** Inclusive upper bound on createdAt, `YYYY-MM-DD` (local day). */
  dateTo?: string;
  sortBy?: ManagedTransactionSortField;
  sortDir?: SortDir;
}

// ------------------------------------------------------------
// ADMIN VENDOR / FREELANCER PAYOUTS (/admin/payouts)  [Module 45]
// ------------------------------------------------------------
// Recipient payout console derived ONLY from real payout records across
// the three stores that own them:
//
//   - walletTransactions  → records with `type: "vendor_payout"` (wt8, wt23)
//   - vendor-financials   → INITIAL_PAYOUTS (POUT-2001, POUT-2000)
//   - freelancer-financials → INITIAL_FL_PAYOUTS (FLPOUT-4003/4002/4001)
//
// There is NO seeded/PRNG generation here and no duplication of domain
// data: customer funding/refunds stay in /admin/transactions (Module 44),
// customer withdrawals stay in /admin/withdrawals, and reconciliation stays
// out entirely (Module 46, not built). Statuses are LABELS over the owning
// store's real value. No invented references, provider ids or settlement
// states. Payout method account numbers are consumed exactly as the stores
// mask them (e.g. "••••••••4317") and are never unmasked anywhere.
// Like the transactions ledger, this console is NOT campus-scoped: payout
// records are restricted to full operators (ADMIN/SUPER_ADMIN) at the
// nav-permission layer.

export const MANAGED_PAYOUT_STATUSES = [
  "successful",
  "pending",
  "processing",
  "failed",
  "reversed",
  "cancelled",
] as const;
export type ManagedPayoutStatus =
  (typeof MANAGED_PAYOUT_STATUSES)[number];

export const MANAGED_PAYOUT_METHODS = ["wallet", "bank_transfer"] as const;
export type ManagedPayoutMethod =
  (typeof MANAGED_PAYOUT_METHODS)[number];

export const MANAGED_PAYOUT_RECIPIENT_TYPES = [
  "vendor",
  "freelancer",
] as const;
export type ManagedPayoutRecipientType =
  (typeof MANAGED_PAYOUT_RECIPIENT_TYPES)[number];

export const MANAGED_PAYOUT_SOURCES = [
  "wallet_transaction",
  "vendor_financials",
  "freelancer_financials",
] as const;
export type ManagedPayoutSource =
  (typeof MANAGED_PAYOUT_SOURCES)[number];

export type ManagedPayoutSortField = "createdAt" | "amount";

/** One console row derived from a real wallet/vendor/freelancer payout record. */
export interface ManagedPayout {
  id: string;
  /** Internal reference where the owning store records one (e.g. PAY-2025-001). */
  reference: string | null;
  /** Which real store owns this record. */
  source: ManagedPayoutSource;
  /** Owning store record id (the wallet transaction id for wallet payouts). */
  sourceRecordId: string;
  recipientType: ManagedPayoutRecipientType;
  recipientId: string;
  recipientName: string;
  /** Short recipient context (verification status, wallet id, account name). */
  recipientSub: string | null;
  /** Admin console deep link (vendor/freelancer detail) when one exists. */
  recipientHref: string | null;
  /** Console vocabulary — a label derived from `sourceStatus`. */
  status: ManagedPayoutStatus;
  /** Raw backend-owned status value from the owning store. */
  sourceStatus: string;
  /** Human explanation of how `status` was derived (never invented data). */
  statusNote: string;
  method: ManagedPayoutMethod;
  bankName: string | null;
  /** Payout account number exactly as masked by the owning store. */
  maskedAccountNumber: string | null;
  amount: number;
  /** Platform fee recorded by the owning store (0 when the store records none). */
  fee: number;
  currency: "NGN";
  /** Disbursement provider. The prototype backend wires none. */
  provider: string | null;
  /** Provider-side reference. The prototype backend records none. */
  gatewayRef: string | null;
  createdAt: string;
  processedAt: string | null;
  expectedAt: string | null;
  failedReason: string | null;
  reversalReason: string | null;
}

/** One order referenced by the owning payout record (wallet payouts only). */
export interface ManagedPayoutReferencedOrder {
  id: string;
  /** Present only when the order id resolves in the real orders store. */
  existsInOrdersStore: boolean;
  vendorId: string | null;
  vendorName: string | null;
  status: string | null;
  total: number | null;
}

export type ManagedPayoutActivityKind =
  | "initiated"
  | "completed"
  | "failed"
  | "reversed"
  | "expected"
  | "note";

export interface ManagedPayoutActivity {
  id: string;
  kind: ManagedPayoutActivityKind;
  title: string;
  meta: string;
  at: string;
}

export interface ManagedPayoutRecipientSummary {
  recipientType: ManagedPayoutRecipientType;
  recipientId: string;
  recipientName: string;
  recipientSub: string | null;
  recipientHref: string | null;
}

export interface ManagedPayoutGatewayStatus {
  /** Disbursement provider verification isn't wired into the prototype backend. */
  tracked: boolean;
  note: string;
}

export const MANAGED_PAYOUT_RESOLUTION_OUTCOMES = [
  "successful",
  "failed",
  "reversed",
] as const;
export type ManagedPayoutResolutionOutcome =
  (typeof MANAGED_PAYOUT_RESOLUTION_OUTCOMES)[number];

export interface ManagedPayoutActionSupport {
  /** True for a bank-transfer withdrawal — wallet settlements post automatically. */
  supported: boolean;
  /** True only while this specific payout is a pending withdrawal. */
  resolvable: boolean;
  note: string;
}

/** Records what actually happened to a pending withdrawal — there is no
 * disbursement provider wired in to confirm this automatically. */
export interface ResolvePayoutInput {
  outcome: ManagedPayoutResolutionOutcome;
  /** Required for failed/reversed — why the transfer did not land. */
  reason?: string;
}

/** Real wallet account behind wallet-method payouts (wallet rows only). */
export interface ManagedPayoutWalletInfo {
  walletId: string;
  ownerId: string;
  ownerName: string;
  balance: number;
  pendingAmount: number;
  currency: "NGN";
}

export interface ManagedPayoutDetail {
  payout: ManagedPayout;
  recipient: ManagedPayoutRecipientSummary;
  referencedOrders: ManagedPayoutReferencedOrder[];
  timeline: ManagedPayoutActivity[];
  gateway: ManagedPayoutGatewayStatus;
  actions: ManagedPayoutActionSupport;
  /** Set only for wallet-method payouts — the customer wallet behind the credit. */
  wallet: ManagedPayoutWalletInfo | null;
}

export interface ManagedPayoutStatusCounts {
  all: number;
  byStatus: Record<ManagedPayoutStatus, number>;
  byRecipientType: Record<ManagedPayoutRecipientType, number>;
  byMethod: Record<ManagedPayoutMethod, number>;
  /** Sum of all payout amounts (naira, minor-unit-safe integers). */
  totalVolume: number;
  successfulVolume: number;
  pendingVolume: number;
}

export interface ManagedPayoutFacets {
  methods: { id: ManagedPayoutMethod; name: string }[];
  statuses: { id: ManagedPayoutStatus; name: string }[];
}

export interface ManagedPayoutListQuery extends ListQuery {
  search?: string;
  status?: ManagedPayoutStatus | "all";
  type?: ManagedPayoutRecipientType | "all";
  method?: ManagedPayoutMethod | "all";
  sortBy?: ManagedPayoutSortField;
  sortDir?: SortDir;
}

// ------------------------------------------------------------
// FINANCE RECONCILIATION & REPORTS (/admin/finance) [Module 46]
// ------------------------------------------------------------
// Read-only reconciliation + reporting layer. Every value is derived from the
// real orders, wallet, vendor-financials, freelancer-financials and
// service-provider-financials stores at runtime — never seeded, never PRNG.
// This module does NOT own any money record: it compares the stores.

/** Report kinds exposed by the Finance reports console. */
export const MANAGED_FINANCE_REPORT_IDS = [
  "revenue_fees",
  "refunds",
  "payouts",
  "wallet_movements",
] as const;
export type ManagedFinanceReportId = (typeof MANAGED_FINANCE_REPORT_IDS)[number];

/** A single labelled money figure. */
export interface ManagedFinanceAmount {
  label: string;
  amount: number;
  hint?: string;
}

/** A label → value pair for chart/table rendering. */
export interface ManagedFinanceSeries {
  label: string;
  value: number;
}

/** Widths the finance pages plot with ChartCard-compatible bar/line charts. */
export type ManagedFinanceChartKind = "bar" | "hbar" | "line";

export interface ManagedFinanceKpis {
  /** Customer money collected: paid order payments + completed wallet deposits. */
  collected: number;
  /** GMV of orders currently paid (paymentStatus = paid, 5 orders) — refunded orders are tracked separately. */
  gmv: number;
  /** Sum of platform fees STORED on paid orders (retained + refunded-order fees). */
  platformFees: number;
  /** Platform fees on retained (paid, non-refunded) orders. */
  retainedFees: number;
  /** Refunds issued: refunded order totals + wallet refund credits. */
  refunds: number;
  /** Payouts successfully delivered to recipients (successful only). */
  payoutsDelivered: number;
  /** Payouts captured but not yet delivered: processing + pending. */
  payoutsInFlight: number;
  /** Total wallet balances currently held on customer/seller wallets (available). */
  heldInWallet: number;
}

export interface ManagedFinanceOverview {
  asOf: string;
  kpis: ManagedFinanceKpis;
  incoming: ManagedFinanceSeries[];
  distributed: ManagedFinanceSeries[];
  retained: ManagedFinanceSeries[];
  feeByVendor: ManagedFinanceSeries[];
  orderByVendor: ManagedFinanceSeries[];
  scopeNote: string;
}

/** Reconciliation outcome of one check. */
export type ManagedReconciliationCheckState =
  | "balanced"
  | "variance"
  | "informational";

/** One side of a reconciliation check with the real records that produce it. */
export interface ManagedReconciliationSide {
  label: string;
  amount: number;
  rows: ManagedReconciliationRow[];
}

/** A real, traceable record backing a reconciliation figure. */
export interface ManagedReconciliationRow {
  id: string;
  label: string;
  amount: number;
  createdAt: string | null;
  status: string;
  href?: string;
}

export interface ManagedReconciliationCheck {
  id: string;
  title: string;
  description: string;
  scope: string;
  outcome: ManagedReconciliationCheckState;
  left: ManagedReconciliationSide;
  right: ManagedReconciliationSide;
  variance: number;
  note?: string;
}

export interface ManagedReconciliationSummary {
  totalChecks: number;
  balancedChecks: number;
  varianceChecks: number;
  informationalChecks: number;
  totalVariance: number;
}

export interface ManagedReconciliationResult {
  asOf: string;
  summary: ManagedReconciliationSummary;
  checks: ManagedReconciliationCheck[];
  scopeNote: string;
}

export interface ManagedFinanceReportColumn {
  key: string;
  label: string;
  align?: "left" | "right";
}

export interface ManagedFinanceReport {
  id: ManagedFinanceReportId;
  title: string;
  description: string;
  summary: ManagedFinanceAmount[];
  charts: { id: string; title: string; kind: ManagedFinanceChartKind; series: ManagedFinanceSeries[] }[];
  columns: ManagedFinanceReportColumn[];
  rows: Record<string, string | number | null>[];
  exportFilename: string;
  scopeNote: string;
}

export interface FinanceManagementService {
  getOverview(): Promise<ManagedFinanceOverview>;
  getReconciliation(): Promise<ManagedReconciliationResult>;
  getReport(id: ManagedFinanceReportId): Promise<ManagedFinanceReport | null>;
}

// ------------------------------------------------------------
// DISPUTE MANAGEMENT (/admin/disputes)
// ------------------------------------------------------------

export type ManagedDisputeStatus =
  | "open"
  | "under_review"
  | "awaiting_customer"
  | "awaiting_vendor"
  | "resolved"
  | "rejected"
  | "escalated";

export type ManagedDisputeReason =
  | "payment_issue"
  | "missing_order"
  | "wrong_product"
  | "damaged_product"
  | "delivery_issue"
  | "refund_request"
  | "unauthorized_transaction";

/** Who is on each side of the dispute. */
export type DisputeParty = "customer_vs_vendor" | "customer_vs_platform";

export interface ManagedDispute {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  vendorId: string;
  vendorName: string;
  campusId: string;
  parties: DisputeParty;
  reason: ManagedDisputeReason;
  subject: string;
  amount: number;
  priority: "low" | "medium" | "high";
  status: ManagedDisputeStatus;
  messagesCount: number;
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeMessage {
  id: string;
  authorRole: "customer" | "vendor" | "support";
  authorName: string;
  body: string;
  at: string;
}

export interface DisputeEvidenceItem {
  id: string;
  kind: "photo" | "document" | "chat_log";
  name: string;
  note: string;
  uploadedBy: "customer" | "vendor";
  at: string;
}

export interface DisputePaymentSummary {
  method: string;
  reference: string;
  paidAt: string | null;
  amount: number;
  status: "paid" | "pending" | "failed" | "refunded";
}

export interface DisputeTimelineEvent {
  id: string;
  label: string;
  detail?: string;
  actor: "customer" | "vendor" | "support" | "system";
  at: string;
}

export interface DisputeResolution {
  outcome: Extract<ManagedDisputeStatus, "resolved" | "rejected">;
  note: string;
  decidedBy: string;
  decidedAt: string;
  /**
   * PLACEHOLDER ONLY - records that a refund was agreed for this
   * dispute. No money movement happens in the prototype; the real
   * refund will be executed by the payments service.
   */
  refundPlaceholder?: { amount: number; method: string; recordedBy: string };
}

export interface ManagedDisputeDetail {
  dispute: ManagedDispute;
  order: {
    id: string;
    itemsSummary: string;
    itemsCount: number;
    total: number;
    placedAt: string;
    deliveryMethod: string;
    orderStatus: string;
  } | null;
  payment: DisputePaymentSummary;
  messages: DisputeMessage[];
  evidence: DisputeEvidenceItem[];
  timeline: DisputeTimelineEvent[];
  resolution: DisputeResolution | null;
}

export interface DisputeListQuery extends ListQuery {
  search?: string;
  status?: ManagedDisputeStatus | "all";
  campusId?: string | "all";
  reason?: ManagedDisputeReason | "all";
}

export interface DisputeRequestInfoInput {
  party: "customer" | "vendor";
  note: string;
}

export interface DisputeResolutionInput {
  note: string;
}

// ------------------------------------------------------------
// REPORTS & ANALYTICS (/admin/reports)
// ------------------------------------------------------------

export type AnalyticsRange = "7d" | "30d" | "90d" | "12m";

export interface AnalyticsQuery {
  range?: AnalyticsRange;
  campusId?: string | "all";
  vendorId?: string | "all";
  categoryId?: string | "all";
}

export interface AnalyticsSeriesPoint {
  label: string;
  /** Primary metric (revenue, registrations, orders…). */
  value: number;
  /** Optional companion metric rendered in tooltips. */
  secondary?: number;
}

export interface AnalyticsCampusRow {
  campusId: string;
  shortName: string;
  name: string;
  usersCount: number;
  activeUsers: number;
  newUsers: number;
  orders: number;
  revenue: number;
  vendorsCount: number;
  newVendors: number;
  aov: number;
}

export interface AnalyticsVendorRow {
  vendorId: string;
  storeName: string;
  campusShortName: string;
  category: string;
  orders: number;
  revenue: number;
  aov: number;
  rating: number;
  fulfillmentRate: number;
  disputeRate: number;
  isNew: boolean;
  joinedAt: string;
}

export interface AnalyticsProductRow {
  productId: string;
  title: string;
  vendorName: string;
  campusShortName: string;
  category: string;
  unitsSold: number;
  revenue: number;
}

export interface AnalyticsCategoryRow {
  categoryId: string;
  name: string;
  orders: number;
  revenue: number;
  sharePct: number;
}

export interface AnalyticsFinancials {
  grossSales: number;
  platformFees: number;
  vendorEarnings: number;
  refunds: number;
  refundRate: number;
  withdrawalsPaid: number;
  withdrawalsPending: number;
  withdrawalsPendingAmount: number;
  commissionRate: number;
}

export interface AnalyticsRetention {
  day1: number;
  day7: number;
  day30: number;
  returningUsers: number;
  churnedUsers: number;
}

export interface AnalyticsReport {
  range: AnalyticsRange;
  previousRangeLabel: string;
  // Summary cards
  kpis: {
    grossSales: number;
    grossSalesDelta: number;
    orders: number;
    ordersDelta: number;
    aov: number;
    aovDelta: number;
    activeUsers: number;
    activeUsersDelta: number;
    newUsers: number;
    newUsersDelta: number;
    activeVendors: number;
    activeVendorsDelta: number;
    platformFees: number;
    refunds: number;
  };
  // Time series
  revenueSeries: AnalyticsSeriesPoint[];
  registrationsSeries: AnalyticsSeriesPoint[];
  activeUsersSeries: AnalyticsSeriesPoint[];
  newVendorsSeries: AnalyticsSeriesPoint[];
  aovSeries: AnalyticsSeriesPoint[];
  // Tables / ranked lists
  campuses: AnalyticsCampusRow[];
  vendors: AnalyticsVendorRow[];
  topProducts: AnalyticsProductRow[];
  categories: AnalyticsCategoryRow[];
  retention: AnalyticsRetention;
  financials: AnalyticsFinancials;
}

export interface AnalyticsFilterOptions {
  campuses: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

// ------------------------------------------------------------
// NOTIFICATION MANAGEMENT (/admin/notifications)
// ------------------------------------------------------------

export type ManagedNotificationType =
  | "system"
  | "order"
  | "payment"
  | "marketplace"
  | "campus"
  | "promotion"
  | "security";

export type ManagedNotificationAudience =
  | "all_users"
  | "customers"
  | "vendors"
  | "campus_admins";

/**
 * Delivery channels are UI-only in this prototype - selecting them
 * records intent on the broadcast but nothing is actually delivered.
 */
export type NotificationDeliveryType = "in_app" | "push" | "email" | "sms";

export type ManagedNotificationStatus = "draft" | "scheduled" | "sent";

export interface ManagedNotification {
  id: string;
  type: ManagedNotificationType;
  title: string;
  message: string;
  audience: ManagedNotificationAudience;
  /** Optional campus scope narrowing the audience further. */
  campusId: string | null;
  deliveryTypes: NotificationDeliveryType[];
  sentBy: string;
  /** The time the broadcast went (or is scheduled to go) out. */
  deliverAt: string;
  recipients: number;
  /** 0-100; only meaningful once sent. */
  openRate: number;
  status: ManagedNotificationStatus;
  createdAt: string;
}

export interface NotificationComposerInput {
  type: ManagedNotificationType;
  title: string;
  message: string;
  audience: ManagedNotificationAudience;
  campusId: string | null;
  deliveryTypes: NotificationDeliveryType[];
  /** Required when scheduling. */
  scheduleAt?: string | null;
}

export interface NotificationListQuery extends ListQuery {
  search?: string;
  type?: ManagedNotificationType | "all";
  audience?: ManagedNotificationAudience | "all";
  status?: ManagedNotificationStatus | "all";
  campusId?: string | "all";
}

// ------------------------------------------------------------
// ADMIN COMMUNICATIONS (/admin/notifications*) [Module 47]
//
// Rebuilt on the REAL Module 26A in-app notification store
// (src/data/notifications.ts) and the REAL user registry
// (src/data/users.ts). Notification types/categories/rows reuse
// the user-facing NotificationType / NotificationCategory unions
// from @/types — the console administers the same records the
// user notification center reads; it is NOT a second system.
// In-app is the ONLY wired delivery channel; every unsupported
// channel/status/template surface is a documented backend gap.
// ------------------------------------------------------------

export type ManagedAdminNotificationType = NotificationType;
export type ManagedAdminNotificationCategory = NotificationCategory;

/** Real recipient targeting for in-app dispatch. */
export type ManagedAdminNotificationAudience =
  | "specific_user"
  | "all_users"
  | "customers"
  | "vendors"
  | "campus";

export type ManagedAdminReadState = "all" | "unread" | "read";

export type ManagedAdminDateRange =
  | "all"
  | "today"
  | "7d"
  | "30d"
  | "month"
  | "custom";

export interface ManagedAdminAudiencePreviewUser {
  userId: string;
  name: string;
  role: string;
  campusId: string;
  verified: boolean;
  /** Deep link to the existing /admin/users/:id console (no fabricated targets). */
  href: string;
}

export interface ManagedAdminAudiencePreview {
  audience: ManagedAdminNotificationAudience;
  campusId: string | null;
  /** Expanded audience label ("Vendors", "All platform users", …). */
  label: string;
  /** Real wired channel — never a channel with no backend integration. */
  channel: "in_app";
  /** Recipient count computed from the real user registry. */
  recipients: number;
  users: ManagedAdminAudiencePreviewUser[];
  note: string;
}

/** Explicit communication DTO — only fields the dispatch endpooint needs. */
export interface ManagedAdminNotificationCreateInput {
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  audience: ManagedAdminNotificationAudience;
  userId?: string | null;
  campusId?: string | null;
  /** Optional internal deep link; only safe in-app routes are accepted. */
  actionUrl?: string | null;
}

export interface ManagedAdminNotificationCreateResult {
  created: number;
  notificationIds: string[];
  channel: "in_app";
}

export interface ManagedAdminNotificationRow {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  recipientId: string;
  recipientName: string;
  recipientHref: string;
  read: boolean;
  createdAt: string;
  actionUrl: string | null;
  groupId: string | null;
}

export interface ManagedAdminNotificationCounts {
  total: number;
  unread: number;
  read: number;
  recipients: number;
  byCategory: Record<NotificationCategory, number>;
  byType: Record<NotificationType, number>;
}

export interface ManagedAdminNotificationOverview {
  counts: ManagedAdminNotificationCounts;
  platformUsers: number;
  /** True in this prototype — only the in-app channel is wired. */
  inAppOnly: boolean;
  deliveryNote: string;
  campusBreakdown: { campusId: string; count: number }[];
}

export interface ManagedAdminNotificationQuery extends ListQuery {
  type?: NotificationType | "all";
  category?: NotificationCategory | "all";
  read?: ManagedAdminReadState;
  /** ISO date (yyyy-mm-dd) inclusive range over createdAt. */
  from?: string;
  to?: string;
}

export interface AdminCommunicationService {
  getOverview(): Promise<ManagedAdminNotificationOverview>;
  list(
    query?: ManagedAdminNotificationQuery
  ): Promise<Paginated<ManagedAdminNotificationRow>>;
  getById(id: string): Promise<ManagedAdminNotificationRow | null>;
  getAudiencePreview(
    audience: ManagedAdminNotificationAudience,
    campusId?: string | null,
    userId?: string | null
  ): Promise<ManagedAdminAudiencePreview>;
  /** Real in-app dispatch: writes one record per recipient in the shared store. */
  create(
    input: ManagedAdminNotificationCreateInput,
    ctx?: AdminActingContext
  ): Promise<ManagedAdminNotificationCreateResult>;
}

// ------------------------------------------------------------
// PLATFORM SETTINGS (/admin/settings)
//
// Structured, sectioned config. The prototype keeps values in
// memory only - the future backend persists these server-side.
// ------------------------------------------------------------

export type SettingsSectionKey =
  | "general"
  | "marketplace"
  | "orders"
  | "financial"
  | "loyalty"
  | "notifications"
  | "security";

export interface GeneralSettings {
  platformName: string;
  /** URL for now - file upload is mocked in the UI. */
  logoUrl: string;
  supportEmail: string;
  supportPhone: string;
}

export type OrderCancellationPolicy =
  | "anytime_before_delivery"
  | "before_dispatch"
  | "before_pickup_ready"
  | "vendor_approval_required";

export interface MarketplaceSettings {
  commissionRate: number;
  requireProductApproval: boolean;
  requireVendorApproval: boolean;
  cancellation: {
    policy: OrderCancellationPolicy;
    autoApproveCustomerCancellations: boolean;
    cancellationWindowHours: number;
  };
}

export interface OrdersSettings {
  delivery: {
    enableHostelDelivery: boolean;
    deliveryFee: number;
    freeDeliveryThreshold: number;
  };
  pickup: {
    enablePickupStations: boolean;
    pickupHoldHours: number;
  };
  timeouts: {
    vendorAcceptMinutes: number;
    customerCheckoutMinutes: number;
  };
}

export type PayoutSchedule = "daily" | "twice_daily" | "weekly";

export interface FinancialSettings {
  platformFeeRate: number;
  withdrawalMinimum: number;
  withdrawalFee: number;
  payoutSchedule: PayoutSchedule;
  requireBvnForPayouts: boolean;
}

export interface LoyaltySettings {
  pointsPerNaira: number;
  maxRedemptionPercent: number;
  pointsExpirationDays: number;
  enabled: boolean;
}

export interface NotificationPreferences {
  orderAlerts: boolean;
  paymentFailureAlerts: boolean;
  disputeEscalations: boolean;
  newVendorSignups: boolean;
  weeklyDigestEmail: boolean;
  securityAlerts: boolean;
}

export interface SecuritySettings {
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  enforceTwoFactor: boolean;
  passwordMinLength: number;
  lockoutAfterFailedAttempts: number;
}

export interface PlatformSettingsConfig {
  general: GeneralSettings;
  marketplace: MarketplaceSettings;
  orders: OrdersSettings;
  financial: FinancialSettings;
  loyalty: LoyaltySettings;
  notifications: NotificationPreferences;
  security: SecuritySettings;
}

/** Save bookkeeping for one section. `version` 0 means never saved (defaults). */
export interface SettingsSectionMeta {
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
  isDefault: boolean;
}

/** What the signed-in operator may change, decided by the server. */
export interface SettingsAccessState {
  /** Operational sections (settings.update). */
  canEdit: boolean;
  /** Financial and security sections (settings.manage). */
  canManage: boolean;
}

export interface PlatformSettingsState {
  config: PlatformSettingsConfig;
  meta: Record<SettingsSectionKey, SettingsSectionMeta>;
  access: SettingsAccessState;
}

// ------------------------------------------------------------
// RBAC - ROLES & PERMISSIONS (/admin/permissions)
//
// Structured so a real NestJS RBAC backend can drop in later:
// - Permission = `${resource}.${action}` strings (e.g.
//   "products.approve") which map 1:1 to guard decorators.
// - The matrix is per-role and only contains actions that are
//   APPLICABLE for that resource (see RbacActionApplicability).
// - No authorization is enforced in the prototype; this data is
//   display/edit state only.
// ------------------------------------------------------------

export type AdminRoleKey = "SUPER_ADMIN" | "ADMIN" | "CAMPUS_ADMIN";

export type RbacResource =
  | "users"
  | "campuses"
  | "vendors"
  | "products"
  | "categories"
  | "orders"
  | "payments"
  | "wallet"
  | "withdrawals"
  | "promotions"
  | "campus_content"
  | "reviews"
  | "disputes"
  | "notifications"
  | "reports"
  | "settings";

export type RbacAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "suspend"
  | "manage";

export interface ResourcePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  suspend: boolean;
  manage: boolean;
}

/** Matrix row per resource; inapplicable actions stay false. */
export type RolePermissionMatrix = Record<RbacResource, ResourcePermission>;

export interface RbacRole {
  key: AdminRoleKey;
  name: string;
  description: string;
  /** System roles cannot be deleted; permissions remain editable. */
  isSystem: boolean;
  membersCount: number;
  permissions: RolePermissionMatrix;
}

/** Flat permission id used by the future API, e.g. "products.approve". */
export type RbacPermissionId = `${RbacResource}.${RbacAction}`;

export function toPermissionIds(
  matrix: RolePermissionMatrix,
  applicable: Record<RbacResource, readonly RbacAction[]>
): RbacPermissionId[] {
  const out: RbacPermissionId[] = [];
  (Object.keys(matrix) as RbacResource[]).forEach((resource) => {
    applicable[resource].forEach((action) => {
      if (matrix[resource][action]) out.push(`${resource}.${action}`);
    });
  });
  return out;
}

// ------------------------------------------------------------
// ADMIN AUDIT TRAIL (/admin/audit-logs + /admin/audit-logs/[id])
//
// Backend-authoritative security record (Module 48). Events are
// APPEND-ONLY: they are recorded by the prototype data-layer
// mutations at the exact boundary a real NestJS audit interceptor
// would write (after the backend authorizes and performs the
// action) - never by a button click. The store starts empty for a
// session and grows one row per real privileged action. There are
// NO update/delete/clear surfaces here. IP, user agent, request
// and correlation IDs are NOT captured by any prototype store and
// are honest backend gaps, not fabricated columns.
// ------------------------------------------------------------

export type AdminAuditSeverity =
  | "informational"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type AdminAuditActorType =
  | "admin"
  | "system"
  | "service"
  | "user"
  | "automation";

export type AdminAuditResult = "success" | "failed" | "denied";

export type AdminAuditResourceType =
  | "user"
  | "vendor"
  | "freelancer"
  | "employer"
  | "notification"
  | "ticket";

/** Canonical bootstrap event vocabulary. Real backend names win when wired. */
export type AdminAuditAction =
  | "USER_SUSPENDED"
  | "USER_ACTIVATED"
  | "USER_DEACTIVATED"
  | "USER_MARKED_PENDING"
  | "USER_PROFILE_UPDATED"
  | "USER_STATE_RESET"
  | "VENDOR_APPROVED"
  | "VENDOR_REJECTED"
  | "VENDOR_SUSPENDED"
  | "VENDOR_ACTIVATED"
  | "VENDOR_DEACTIVATED"
  | "FREELANCER_SUSPENDED"
  | "FREELANCER_ACTIVATED"
  | "FREELANCER_DEACTIVATED"
  | "FREELANCER_FEATURED"
  | "FREELANCER_UNFEATURED"
  | "EMPLOYER_SUSPENDED"
  | "EMPLOYER_RESTORED"
  | "EMPLOYER_APPROVED"
  | "EMPLOYER_REJECTED"
  | "NOTIFICATION_SENT"
  | "SUPPORT_TICKET_ASSIGNED"
  | "SUPPORT_TICKET_STATUS_CHANGED"
  | "SUPPORT_TICKET_PRIORITY_CHANGED"
  | "SUPPORT_TICKET_RESPONDED"
  | "SUPPORT_TICKET_NOTE_ADDED"
  | "SUPPORT_TICKET_ESCALATED"
  | "SUPPORT_TICKET_REOPENED";

/** Only safe, allowlisted display fields. Never dump backend payloads. */
export interface AdminAuditMetadata {
  /** Free-text reason where the mutation accepts one. */
  reason?: string;
  /** Previous resource status when the action changed it. */
  previousStatus?: string;
  /** New resource status after the action. */
  newStatus?: string;
  /** Notification dispatch details (NOTIFICATION_SENT only). */
  audience?: string;
  recipientCount?: number;
  title?: string;
}

export interface AdminAuditEventActor {
  type: AdminAuditActorType;
  id: string;
  /** Safe display name. Never email/identifier lookups. */
  name: string;
  role?: AdminRole;
}

export interface AdminAuditResourceRef {
  type: AdminAuditResourceType;
  id: string;
  /** Safe human-readable resource label. */
  label?: string;
}

export interface AdminAuditEvent {
  id: string;
  at: string;
  action: AdminAuditAction;
  actor: AdminAuditEventActor;
  resource: AdminAuditResourceRef;
  result: AdminAuditResult;
  severity: AdminAuditSeverity;
  /** Allowlisted safe fields only - never tokens/credentials/PII. */
  metadata: AdminAuditMetadata;
}

export interface AdminAuditEventInput {
  action: AdminAuditAction;
  actor: AdminAuditEventActor;
  resource: AdminAuditResourceRef;
  severity?: AdminAuditSeverity;
  result?: AdminAuditResult;
  metadata?: AdminAuditMetadata;
  at?: string;
}

export interface AdminAuditQuery extends ListQuery {
  search?: string;
  actorId?: string | "all";
  action?: AdminAuditAction | "all";
  resourceType?: AdminAuditResourceType | "all";
  result?: AdminAuditResult | "all";
  severity?: AdminAuditSeverity | "all";
  /** ISO date (yyyy-mm-dd) inclusive range over `at`. */
  dateFrom?: string;
  dateTo?: string;
  /**
   * Restrict to the backend-classified security-event subset
   * (account-access changes: suspensions, deactivations, state
   * resets). Consumed by the Security Center (Module 51); the mock
   * data layer applies it server-side like any other filter.
   */
  securityOnly?: boolean;
}

/** Backend-authoritative metrics derived from the audit store. */
export interface AdminAuditMetrics {
  total: number;
  today: number;
  highSeverity: number;
  /** Security-relevant subset (suspensions / deactivations / state resets). */
  securityEvents: number;
  failed: number;
  denied: number;
}

/** Acting operator context for mutation services that record audit events. */
export interface AdminActingContext {
  actor: AdminProfile;
}

// ------------------------------------------------------------
// FREELANCER MANAGEMENT (/admin/freelancers console)
// Admin console for discovering, inspecting, and managing
// freelancer profiles and their marketplace services.
// Data is sourced from existing platform data stores — no
// fabricated records (spec §41). Backend admin endpoints are
// documented as gaps where they don't yet exist.
// ------------------------------------------------------------

/** Freelancer onboarding status mapped to admin console status. */
export type FreelancerConsoleStatus = "approved" | "pending_review" | "suspended" | "rejected";

/** The platform role that identifies a freelancer account. */
export type FreelancerPlatformRole = "freelancer";

export interface FreelancerProfileSummary {
  id: string;
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  city: string;
  categories: string[];
  skills: string[];
  status: FreelancerConsoleStatus;
  rating: number;
  totalBookings: number;
  joinedAt: string;
  updatedAt: string;
}

export interface ManagedFreelancer {
  id: string;
  slug: string;
  displayName: string;
  headline: string;
  email: string;
  phone: string;
  city: string;
  categories: string[];
  skills: string[];
  status: FreelancerConsoleStatus;
  verified: boolean;
  /** Derived from the freelancer's marketplace services having featured listings. */
  featured: boolean;
  rating: number;
  reviewsCount: number;
  totalBookings: number;
  servicesCount: number;
  joinedAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

export interface FreelancerServiceSummary {
  id: string;
  title: string;
  categoryId: string;
  pricingModel: string;
  /** Null when the service has no starting price. */
  price: number | null;
  priceMax?: number;
  /** Null when no delivery time is set. */
  durationMinutes: number | null;
  isActive: boolean;
  isFeatured: boolean;
  viewCount: number;
  /** draft | published | paused | archived (live API only). */
  status?: string;
  createdAt: string;
}

/** Everything an admin needs to decide on a freelancer profile. */
export interface FreelancerReviewInfo {
  avatar: string | null;
  bio: string;
  links: { website: string | null; linkedin: string | null; github: string | null };
  hourlyRate: number | null;
  currency: string;
  experienceLevel: string | null;
  yearsOfExperience: number | null;
  location: string;
  /** Why the profile was rejected (shown to the freelancer). */
  rejectionReason: string | null;
  suspendedReason: string | null;
  experience: {
    id: string;
    title: string;
    company: string;
    startDate: string;
    endDate: string | null;
    current: boolean;
    description: string;
  }[];
  education: {
    id: string;
    institution: string;
    qualification: string;
    fieldOfStudy: string;
    startYear: string;
    endYear: string | null;
  }[];
  certifications: {
    id: string;
    name: string;
    issuer: string;
    issueDate: string;
    expirationDate: string | null;
    credentialUrl: string | null;
  }[];
}

export interface FreelancerPortfolioReviewItem extends MarketplaceProviderPortfolioItem {
  projectUrl?: string | null;
  technologies?: string[];
  completionDate?: string | null;
}

export interface ManagedFreelancerDetail {
  freelancer: ManagedFreelancer;
  profile: FreelancerProfileSummary;
  /** Present on the live API; the in-memory fixture omits it. */
  review?: FreelancerReviewInfo;
  services: FreelancerServiceSummary[];
  portfolio: FreelancerPortfolioReviewItem[];
  reviews: MarketplaceServiceReview[];
  availability: {
    status: string;
    workingDays: string[];
    /** Working hours and timezone aren't stored on freelancer profiles. */
    workingHoursStart: string | null;
    workingHoursEnd: string | null;
    timezone: string | null;
  };
  activity: FreelancerActivityEvent[];
}

export type FreelancerActivityKind =
  | "service"
  | "booking"
  | "review"
  | "verification"
  | "profile"
  | "admin"
  | "auth";

export interface FreelancerActivityEvent {
  id: string;
  kind: FreelancerActivityKind;
  message: string;
  meta: string;
  at: string;
}

export type FreelancerBucket = "all" | "approved" | "pending_review" | "suspended" | "rejected";

export interface FreelancerStatusCounts {
  all: number;
  approved: number;
  pending_review: number;
  suspended: number;
  rejected: number;
}

export interface ManagedFreelancersListQuery extends ListQuery {
  search?: string;
  status?: FreelancerBucket;
  categoryId?: string;
  campusId?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

// ------------------------------------------------------------
// EMPLOYER MANAGEMENT (/admin/employers console)
// Admin console for discovering, inspecting, and managing
// employer/clients and their hiring activity.
// Data is sourced from existing platform data stores — no
// fabricated records (spec §45). Contacts are private and only
// surfaced here because this is an authorized admin scope.
// Backend admin endpoints are documented as gaps where they
// don't yet exist.
// ------------------------------------------------------------

/** Admin console status (derived from the employer's real backend state). */
export type EmployerConsoleStatus =
  | "active"
  | "pending_review"
  | "suspended"
  | "rejected"
  | "external"
  | "incomplete";

/** Derived hiring state (from real open jobs — not a stored backend field). */
export type EmployerHiringStatus = "hiring" | "not_hiring";

export interface ManagedEmployer {
  id: string;
  /** Platform user id when an onboarding profile exists; null for job-only posters. */
  userId: string | null;
  name: string;
  organizationName: string | null;
  slug: string | null;
  descriptor: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  industry: string | null;
  campusId: string | null;
  campusName: string | null;
  city: string | null;
  state: string | null;
  status: EmployerConsoleStatus;
  /** Real EmployerOnboardingStatus; null for external (job-only) posters. */
  onboardingStatus: string | null;
  /** Real EmployerVerificationStatus; null when no onboarding verification exists. */
  verificationStatus: string | null;
  verified: boolean;
  hasEmployerProfile: boolean;
  /** 0–100 from the real onboarding completion computation. */
  profileCompletion: number;
  hiringStatus: EmployerHiringStatus;
  activeJobs: number;
  totalJobs: number;
  /** Non-draft, non-withdrawn proposals across the employer's jobs. */
  applicationsReceived: number;
  /** Accepted proposals across the employer's jobs. */
  hires: number;
  contractsTotal: number;
  contractsActive: number;
  rating: number;
  reviewsCount: number;
  joinedAt: string;
  lastActiveAt: string;
}

export interface EmployerProfileSummary {
  displayName: string;
  headline: string;
  about: string;
  industry: string;
  website: string | null;
  location: string;
  workPreference: string | null;
  remoteAvailable: boolean;
  categories: string[];
  experience: string | null;
  workType: string | null;
  projectDuration: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
}

export interface EmployerOrganizationSummary {
  name: string;
  businessType: string;
  industry: string;
  description: string;
  size: string;
  website: string | null;
}

export interface EmployerJobSummary {
  id: string;
  title: string;
  status: string;
  postedAt: string;
  deadline: string;
  viewCount: number;
  applications: number;
}

export interface EmployerHiringSummary {
  jobCounts: Record<string, number> & { all: number };
  applicationCounts: Record<EmployerApplicationStatus | "all", number>;
  contractsTotal: number;
  contractsActive: number;
  contractsCompleted: number;
  hires: number;
}

export type EmployerActivityKind =
  | "profile"
  | "verification"
  | "jobs"
  | "hiring"
  | "reviews"
  | "admin";

export interface EmployerActivityEvent {
  id: string;
  kind: EmployerActivityKind;
  message: string;
  meta: string;
  at: string;
}

export interface ManagedEmployerDetail {
  employer: ManagedEmployer;
  profile: EmployerProfileSummary | null;
  organization: EmployerOrganizationSummary | null;
  hiring: EmployerHiringSummary;
  jobs: EmployerJobSummary[];
  reviews: ProfileReviewSummary;
  verification: { status: string; type: string | null; note: string | null } | null;
  activity: EmployerActivityEvent[];
}

export type EmployerBucket =
  | "all"
  | "active"
  | "pending_review"
  | "suspended"
  | "rejected"
  | "external"
  | "incomplete";

export interface EmployerStatusCounts {
  all: number;
  active: number;
  pending_review: number;
  suspended: number;
  rejected: number;
  external: number;
  incomplete: number;
}

export interface ManagedEmployerListQuery extends ListQuery {
  search?: string;
  status?: EmployerBucket;
  verification?: string;
  campusId?: string;
  industry?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

// ------------------------------------------------------------
// MARKETPLACE MANAGEMENT (/admin/marketplace console - Module 39)
//
// Operational oversight of marketplace listings. Every field is
// derived from the REAL product, vendor, storefront, category and
// campus stores - no fabricated moderation, reports or metrics.
//
// Three real status concepts are kept distinct:
//   - status:             ProductStatus (available | sold | removed)
//   - publishedStatus:    ProductPublishStatus when the product store
//                         records one (draft | pending_review |
//                         active | inactive | rejected | archived)
//   - visibility:         derived from status + publishedStatus +
//                         the vendor's STOREFRONT availability state.
//
// This console is READ-ONLY: no publish/unpublish/hide/restrict/
// feature endpoints exist in the prototype backend. The back-end
// gap report (MODULE-39-REPORT.md) documents what the NestJS API
// must add before any moderation actions can surface here.
// ------------------------------------------------------------

export type MarketplaceVisibility =
  | "live"
  | "paused_storefront"
  | "storefront_missing"
  | "unpublished"
  | "sold"
  | "removed";

export interface MarketplaceListingRow {
  id: string;
  title: string;
  description: string;
  images: string[];
  condition: "New" | "Used" | "Fair" | "Refurbished";
  categoryId: string;
  categoryName: string;
  campusId: string;
  campusName: string;
  campusAbbr: string;
  vendorId: string;
  vendorName: string;
  vendorVerified: boolean;
  vendorVerification: "verified" | "pending" | "unverified" | "restricted" | "unknown";
  storefrontAvailability: "active" | "temporarily_unavailable" | "suspended" | "closed" | null;
  price: number;
  originalPrice: number | null;
  status: "available" | "sold" | "removed";
  publishedStatus: "draft" | "pending_review" | "active" | "inactive" | "rejected" | "archived" | null;
  visibility: MarketplaceVisibility;
  stock: number | null;
  viewCount: number | null;
  saveCount: number | null;
  rating: number | null;
  ratingCount: number | null;
  sku: string | null;
  location: string | null;
  tags: string[];
  hasVariants: boolean;
  createdAt: string;
  updatedAt: string | null;
  archivedAt: string | null;
}

export type MarketplaceActivityKind =
  | "listing"
  | "publication"
  | "admin";

export interface MarketplaceActivityEvent {
  id: string;
  kind: MarketplaceActivityKind;
  message: string;
  meta: string;
  at: string;
}

/** Deliberately slim vendor projection - no private vendor data. */
export interface MarketplaceListingVendor {
  id: string;
  storeName: string;
  description: string;
  campusId: string;
  rating: number;
  productsCount: number;
  verified: boolean;
  verification: MarketplaceListingRow["vendorVerification"];
  storefrontAvailability: MarketplaceListingRow["storefrontAvailability"];
  lastActiveAt: string;
}

export interface MarketplaceListingDetail {
  listing: MarketplaceListingRow;
  vendor: MarketplaceListingVendor | null;
  activity: MarketplaceActivityEvent[];
}

export type MarketplacePublicationFilter =
  | "all"
  | "draft"
  | "pending_review"
  | "active"
  | "inactive"
  | "rejected"
  | "archived"
  | "unset";

export type MarketplaceStockFilter = "all" | "in_stock" | "out_of_stock" | "not_tracked";

export interface MarketplaceListQuery extends ListQuery {
  search?: string;
  status?: ProductStatusCompat | "all";
  visibility?: MarketplaceVisibility | "all";
  publication?: MarketplacePublicationFilter;
  categoryId?: string | "all";
  campusId?: string | "all";
  vendorId?: string | "all";
  stock?: MarketplaceStockFilter;
  sortBy?: MarketplaceSortField;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface MarketplaceStatusCounts {
  all: number;
  available: number;
  sold: number;
  removed: number;
  live: number;
  paused_storefront: number;
  storefront_missing: number;
  unpublished: number;
}

export type ProductStatusCompat = "available" | "sold" | "removed";

export interface MarketplaceFacetOption {
  id: string;
  name: string;
  /** Number of listings matched (computed from real data). */
  count: number;
}

export interface MarketplaceFacets {
  categories: MarketplaceFacetOption[];
  campuses: MarketplaceFacetOption[];
  vendors: MarketplaceFacetOption[];
}

export type MarketplaceSortField =
  | "createdAt"
  | "updatedAt"
  | "price"
  | "rating"
  | "viewCount"
  | "name";

// ============================================================
// ADMIN JOBS & HIRING (Module 40)
// ============================================================
//
// Read-only oversight of the jobs marketplace. Every row is derived from
// the real opportunity store (src/data/opportunity.ts), its proposals
// (proposals ARE the applications — no duplicate model), the employer
// store (src/data/employer.ts) and contracts (src/data/contracts.ts).
// Statuses use the REAL OpportunityStatus vocabulary — nothing invented.

export type ManagedJobStatus = OpportunityStatus | "paused";

/** Derived publication concept from the single real status field. */
export type ManagedJobPublication = "published" | "unpublished" | "ended";

/**
 * Derived moderation concept. The real store has NO job-approval pipeline:
 * `pending_review` is the only moderation-ish state; the rest are honest
 * "not applicable" rather than invented "cleared/rejected".
 */
export type ManagedJobModeration =
  | "pending_review"
  | "not_submitted"
  | "not_applicable";

export interface ManagedJobRow {
  id: string;
  title: string;
  summary: string;
  status: ManagedJobStatus;
  publication: ManagedJobPublication;
  moderation: ManagedJobModeration;
  categoryId: string;
  categoryName: string;
  skills: string[];
  workArrangement: OpportunityWorkArrangement;
  experienceLevel: string;
  duration: string;
  locationCity: string | null;
  locationState: string | null;
  campusId: string | null;
  campusName: string | null;
  budgetType: string;
  budgetMin: number | null;
  budgetMax: number | null;
  employerId: string;
  employerName: string;
  organizationName: string | null;
  employerVerified: boolean;
  postedAt: string;
  deadline: string;
  viewCount: number;
  /** Visible applications (non-draft, non-withdrawn proposals). */
  applications: number;
  /** Latest of postedAt and any proposal activity on the job. */
  lastActivityAt: string;
}

export interface ManagedJobListQuery extends ListQuery {
  status?: ManagedJobStatus | "all";
  publication?: ManagedJobPublication | "all";
  categoryId?: string | "all";
  campusId?: string | "all";
  employerId?: string | "all";
  arrangement?: OpportunityWorkArrangement | "all";
  sortBy?: ManagedJobSortField;
  sortDir?: SortDir;
  page?: number;
  pageSize?: number;
}

export type ManagedJobSortField =
  | "postedAt"
  | "lastActivity"
  | "deadline"
  | "viewCount"
  | "applications"
  | "budget"
  | "title";

export interface ManagedJobStatusCounts {
  all: number;
  open: number;
  draft: number;
  pending_review: number;
  paused: number;
  closed: number;
  expired: number;
  cancelled: number;
  /** Jobs with at least one visible application. */
  withApplications: number;
  /** OPEN jobs whose deadline is within 7 days. */
  expiringSoon: number;
  /** Honest zero — the platform has no job-reports store. */
  reported: number;
}

export interface ManagedJobFacetOption {
  id: string;
  name: string;
  count: number;
}

export interface ManagedJobFacets {
  categories: ManagedJobFacetOption[];
  campuses: ManagedJobFacetOption[];
  employers: ManagedJobFacetOption[];
}

export type ManagedJobApplicationStatus =
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface ManagedJobApplicationsSummary {
  total: number;
  visible: number;
  byStatus: Record<ManagedJobApplicationStatus | "all", number>;
  latestAt: string | null;
}

export interface ManagedJobEmployer {
  id: string;
  name: string;
  organizationName: string | null;
  descriptor: string;
  verified: boolean;
  accountStatus: "active" | "pending_review" | "suspended" | "rejected" | "external";
  campusId: string | null;
  campusName: string | null;
  location: string | null;
  slug: string | null;
  jobsTotal: number;
}

export interface ManagedJobContractInfo {
  count: number;
  note: string;
}

export interface ManagedJobDetailListing {
  id: string;
  title: string;
  summary: string;
  description: string;
  requirements: string;
  skills: string[];
  categoryId: string;
  categoryName: string;
  status: ManagedJobStatus;
  publication: ManagedJobPublication;
  moderation: ManagedJobModeration;
  workArrangement: OpportunityWorkArrangement;
  experienceLevel: string;
  duration: string;
  budgetType: string;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: "NGN";
  location: {
    city?: string;
    state?: string;
    campusId?: string;
    campusName?: string;
    remote?: boolean;
  };
  postedAt: string;
  deadline: string;
  viewCount: number;
  employersReported: number;
}

export type ManagedJobActivityKind = "job" | "application" | "hiring" | "deadline";

export interface ManagedJobActivityEvent {
  id: string;
  kind: ManagedJobActivityKind;
  message: string;
  meta?: string;
  at: string;
}

export interface ManagedJobDetail {
  listing: ManagedJobDetailListing;
  employer: ManagedJobEmployer;
  applications: ManagedJobApplicationsSummary;
  contracts: ManagedJobContractInfo;
  activity: ManagedJobActivityEvent[];
}

// ------------------------------------------------------------
// SUPPORT / CUSTOMER SERVICE (Module 56)
// Canonical support-ticket vocabulary. In the prototype the dataset
// is generated deterministically; a real NestJS backend replaces the
// factory (see KAMPUSMAX_SUPPORT_BACKEND_GAPS.md).
// ------------------------------------------------------------

export type SupportTicketStatus =
  | "open"
  | "pending"
  | "in_progress"
  | "waiting_on_customer"
  | "resolved"
  | "closed";

export type SupportTicketPriority = "low" | "normal" | "high" | "urgent";

export type SupportTicketCategory =
  | "account"
  | "marketplace"
  | "payments"
  | "freelancer"
  | "service_provider"
  | "employer"
  | "verification"
  | "technical"
  | "other";

export type SupportPostedBy = "customer" | "support";

/** Who the message is intended for. Internal notes never reach the customer. */
export type SupportMessageVisibility = "customer" | "internal";

export type SupportAttachmentKind = "image" | "pdf" | "document" | "other";

export interface SupportAttachment {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  kind: SupportAttachmentKind;
  uploadedBy: SupportPostedBy;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  postedBy: SupportPostedBy;
  authorName: string;
  visibility: SupportMessageVisibility;
  body: string;
  attachments: SupportAttachment[];
  at: string;
}

export type SupportTimelineKind =
  | "created"
  | "assigned"
  | "status_changed"
  | "priority_changed"
  | "responded"
  | "note_added"
  | "escaped"
  | "escalated"
  | "reopened";

export interface SupportTimelineEvent {
  id: string;
  ticketId: string;
  kind: SupportTimelineKind;
  label: string;
  detail?: string;
  actorName: string;
  at: string;
}

export type SupportEscalationTarget =
  | "finance"
  | "trust_safety"
  | "verification"
  | "technical_operations"
  | "vendor_operations"
  | "management";

export interface SupportEscalation {
  target: SupportEscalationTarget;
  note: string;
  byName: string;
  at: string;
}

/** Admin-facing link to the related module this ticket references. */
export interface SupportRelatedResource {
  type:
    | "order"
    | "transaction"
    | "payout"
    | "vendor"
    | "job"
    | "application"
    | "contract"
    | "verification_request"
    | "dispute";
  id: string;
  label: string;
  href: string;
}

/** Least-privilege customer summary — identity for triage, no PII dump. */
export interface SupportCustomerRef {
  id: string;
  name: string;
  role: ManagedUserRole;
  campusId: string | null;
  campusName: string | null;
  joinedAt: string;
  isVerified: boolean;
}

export interface SupportAssignee {
  id: string;
  name: string;
  role: AdminRole;
  activeTicketCount: number;
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category: SupportTicketCategory;
  customer: SupportCustomerRef;
  assigneeId: string | null;
  assigneeName: string | null;
  relatedResource: SupportRelatedResource | null;
  escalated: boolean;
  escalation: SupportEscalation | null;
  createdAt: string;
  updatedAt: string;
  lastResponseAt: string | null;
  reopenedAt: string | null;
}

export interface SupportTicketDetail {
  ticket: SupportTicket;
  description: string;
  messages: SupportMessage[];
  timeline: SupportTimelineEvent[];
  assignees: SupportAssignee[];
}

export interface SupportTicketMetrics {
  open: number;
  escalated: number;
  unassigned: number;
  awaitingCustomer: number;
  resolved: number;
  closed: number;
  urgent: number;
  highPriority: number;
  current: SupportTicketStatus[];
  avgFirstResponseHours: number;
  byStatus: { status: SupportTicketStatus; count: number }[];
  byPriority: { priority: SupportTicketPriority; count: number }[];
  byCategory: { category: SupportTicketCategory; count: number }[];
}

export type SupportTicketListSort =
  | "createdAt"
  | "updatedAt"
  | "priority"
  | "subject";

export interface SupportTicketListQuery extends ListQuery {
  status?: SupportTicketStatus | "all";
  priority?: SupportTicketPriority | "all";
  category?: SupportTicketCategory | "all";
  assigneeId?: string | "all" | "unassigned";
  campusId?: string | "all";
  escalated?: boolean;
  sortBy?: SupportTicketListSort;
  sortDir?: SortDir;
}

export interface SupportRespondInput {
  body: string;
  visibility: SupportMessageVisibility;
}

export interface SupportAssignInput {
  assigneeId: string;
}

export interface SupportSetStatusInput {
  status: SupportTicketStatus;
  note?: string;
}

export interface SupportSetPriorityInput {
  priority: SupportTicketPriority;
}

export interface SupportEscalateInput {
  target: SupportEscalationTarget;
  note: string;
}

export interface SupportMutationResult {
  detail: SupportTicketDetail | null;
}

// ------------------------------------------------------------
// CUSTOMER-FACING SUPPORT SURFACE (CUSTOMER SUPPORT PORTAL)
//
// Two sides of the same Module 56 record: the customer portal submits and
// tracks its OWN cases here, the admin console operates them. Inputs are
// deliberately least-privilege — a customer can never set status, priority
// (always "normal" server-side), assignment, escalation or internal notes.
// ------------------------------------------------------------

/** Kind of related Kampmax resource a customer may associate with a case. */
export type SupportCustomerRelatedKind = "order" | "transaction";

export interface SupportCustomerRelatedInput {
  kind: SupportCustomerRelatedKind;
  id: string;
}

export interface SupportCustomerCreateInput {
  category: SupportTicketCategory;
  subject: string;
  description: string;
  related?: SupportCustomerRelatedInput | null;
  attachments?: SupportAttachment[];
}

export interface SupportCustomerReplyInput {
  body: string;
  attachments?: SupportAttachment[];
}

/**
 * Customer-scoped operations on the SAME support store used by the admin
 * console. Every method enforces ownership (the caller must be the ticket's
 * customer) — mirroring what the future NestJS endpoints must do. Internal
 * notes and moderation metadata never appear in these responses.
 */
export interface SupportCustomerService {
  listMine(userId: string): Promise<SupportTicket[]>;
  getMine(userId: string, id: string): Promise<SupportTicketDetail | null>;
  createForCustomer(
    userId: string,
    input: SupportCustomerCreateInput
  ): Promise<SupportTicketDetail>;
  replyForCustomer(
    userId: string,
    id: string,
    input: SupportCustomerReplyInput
  ): Promise<SupportTicketDetail | null>;
}

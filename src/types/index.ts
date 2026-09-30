// ============================================================
// CORE SCALAR TYPES
// ============================================================

export type UserRole = "student" | "vendor" | "admin";

export type ProductCondition = "New" | "Used" | "Fair";

export type ProductStatus = "available" | "sold" | "removed";

export type ProductPublishStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "inactive"
  | "rejected"
  | "archived";

export interface ProductVariantOption {
  id: string;
  value: string;
  priceModifier?: number;
  stock?: number;
  image?: string;
  available?: boolean;
}

export interface ProductVariantGroup {
  id: string;
  name: string;
  required: boolean;
  options: ProductVariantOption[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  title: string;
  price?: number;
  stock?: number;
  image?: string;
  attributes: Record<string, string>;
}

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type DeliveryMethod = "campus_pickup" | "meetup" | "delivery";

export type PaymentMethod = "paystack" | "bank_transfer" | "wallet" | "cod";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type NotificationType =
  | "order_update"
  | "message"
  | "marketplace"
  | "campus"
  | "payments"
  | "account"
  | "promotion"
  | "booking_update"
  | "event"
  | "system";

export type NotificationCategory =
  | "orders"
  | "messages"
  | "marketplace"
  | "campus"
  | "payments"
  | "account"
  | "promotions"
  | "bookings"
  | "events";

export type PostType =
  | "discussion"
  | "question"
  | "event"
  | "marketplace"
  | "poll"
  | "announcement"
  | "lost_found"
  | "image";

export type LostFoundStatus = "open" | "claimed" | "resolved";

export type ReportReason =
  | "spam"
  | "inappropriate"
  | "scam"
  | "harassment"
  | "other";

export type ReviewTarget = "vendor" | "product";

export type WalletTransactionType =
  | "deposit"
  | "withdrawal"
  | "payment"
  | "purchase"
  | "refund"
  | "transfer"
  | "vendor_payout"
  | "loyalty_reward";

export type WalletTransactionStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export type WalletTransactionDirection = "credit" | "debit";

export type ConversationType = "direct" | "vendor_chat";

// ============================================================
// AUTH
// ============================================================

export type AuthStatus = "authenticated" | "unauthenticated" | "loading";

export type VerificationMethod = "email" | "sms";

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  campusId: string;
  role: UserRole;
  department?: string;
  level?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  campusId: string;
  role: UserRole;
  avatar: string;
  isVerified: boolean;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyOtpData {
  email: string;
  code: string;
}

// ============================================================
// CAMPUS
// ============================================================

export interface Campus {
  id: string;
  name: string;
  abbreviation: string;
  location: string;
  departments: string[];
  imageUrl?: string;
}

// ============================================================
// USER & VENDOR
// ============================================================

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  campusId: string;
  role: UserRole;
  avatar: string;
  bio: string;
  joinedDate: string;
  department?: string;
  level?: string;
  isVerified?: boolean;
}

export interface Vendor {
  id: string;
  userId: string;
  /** Public-facing storefront slug (no internal DB id in public URLs). */
  slug?: string;
  storeName: string;
  description: string;
  rating: number;
  totalSales: number;
  verified: boolean;
  campusId: string;
  specialties: string[];
  coverImage?: string;
  responseTime?: string;
  joinDate?: string;
}

// ============================================================
// PRODUCT & CATEGORY
// ============================================================

export interface Category {
  id: string;
  name: string;
  icon: string;
  productCount: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  categoryId: string;
  vendorId: string;
  campusId: string;
  images: string[];
  condition: ProductCondition;
  status: ProductStatus;
  createdAt: string;
  location?: string;
  /** Shown first in a search because an admin boosted it. */
  sponsored?: boolean;
  tags?: string[];
  viewCount?: number;
  saveCount?: number;
  rating?: number;
  ratingCount?: number;
  soldCount?: number;
  sku?: string;
  stock?: number;
  reservedStock?: number;
  lowStockThreshold?: number;
  costPrice?: number;
  publishedStatus?: ProductPublishStatus;
  updatedAt?: string;
  archivedAt?: string;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  variantGroups?: ProductVariantGroup[];
  allowDelivery?: boolean;
  allowPickup?: boolean;
  deliveryFee?: number;
}

// ============================================================
// CART
// ============================================================

export interface CartItem {
  product: Product;
  quantity: number;
  savedForLater?: boolean;
}

// ============================================================
// ORDER & ORDER ITEM
// ============================================================

export interface OrderItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  /** Backend UUID; `id` holds the human-readable order number when available. */
  backendId?: string;
  buyerId: string;
  vendorId: string;
  items: CartItem[];
  subtotal: number;
  platformFee: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
  pickupLocation?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  notes?: string;
  timeline: OrderTimelineEntry[];
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  timestamp: string;
  message: string;
}

// ============================================================
// PAYMENT
// ============================================================

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================================
// NOTIFICATION
// ============================================================

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  imageUrl?: string;
  groupId?: string;
}

// ============================================================
// CONVERSATION & MESSAGE
// ============================================================

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  read: boolean;
  imageUrl?: string;
  sharedProduct?: {
    id: string;
    title: string;
    price: number;
    image?: string;
    condition: ProductCondition;
    vendorName?: string;
  };
  sharedOrder?: {
    id: string;
    status: OrderStatus;
    items: string;
    total: number;
  };
}

export interface Conversation {
  id: string;
  type: ConversationType;
  participants: string[];
  /** userId → display name / role, supplied by the API. */
  participantNames?: Record<string, string>;
  participantRoles?: Record<string, string>;
  /** Store name for vendor chats. */
  vendorName?: string;
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  productId?: string;
  vendorId?: string;
  isPinned?: boolean;
  isMuted?: boolean;
}

// ============================================================
// CAMPUS POST & COMMENT
// ============================================================

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
}

export interface CampusPost {
  id: string;
  userId: string;
  campusId: string;
  type: PostType;
  title: string;
  content: string;
  images?: string[];
  tags?: string[];
  likes: number;
  commentCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  createdAt: string;
  productId?: string;
  eventId?: string;
  poll?: Poll;
  announcement?: CampusAnnouncement;
  lostFound?: LostFoundItem;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  endsAt: string;
  isAnonymous: boolean;
}

export interface CampusAnnouncement {
  id: string;
  campusId: string;
  title: string;
  content: string;
  authorId: string;
  priority: "info" | "warning" | "urgent";
  expiresAt: string;
  createdAt: string;
}

export interface LostFoundItem {
  id: string;
  status: LostFoundStatus;
  itemDescription: string;
  location: string;
  dateReported: string;
  contactInfo: string;
  imageUrl?: string;
}

export interface SavedPost {
  id: string;
  userId: string;
  postId: string;
  savedAt: string;
}

export interface ReportedPost {
  id: string;
  userId: string;
  postId: string;
  reason: ReportReason;
  details?: string;
  createdAt: string;
}

// Events and tickets live in types/event-ticketing.ts.

export interface NearbyPlace {
  id: string;
  name: string;
  category: "food" | "stores" | "services" | "events";
  address: string;
  distance: string;
  rating: number;
  reviewCount: number;
  imageUrl?: string;
  coordinates: { x: number; y: number };
  phone?: string;
  isOpen?: boolean;
  description?: string;
  hours?: string;
}

export interface CommunityClub {
  id: string;
  name: string;
  category: string;
  memberCount: number;
  isJoined?: boolean;
  avatar: string;
  description: string;
  meetingInfo?: string;
  recentActivity?: string;
}

export interface CampusCourse {
  id: string;
  title: string;
  provider: string;
  price: number;
  duration: string;
  rating: number;
  enrolledCount: number;
  category: string;
  imageUrl: string;
  distance?: string;
  description?: string;
}

// ============================================================
// REVIEW
// ============================================================

export type ReviewSortOption = "recent" | "highest" | "lowest" | "helpful" | "with_images";

export type ReviewReportReason =
  | "spam"
  | "fake"
  | "inappropriate"
  | "offensive"
  | "irrelevant"
  | "other";

export interface ReviewImage {
  id: string;
  url: string;
  alt?: string;
}

export interface ReviewVendorResponse {
  text: string;
  createdAt: string;
}

export interface Review {
  id: string;
  targetId: string;
  target: ReviewTarget;
  userId: string;
  /** Display name supplied by the API (avoids a separate user lookup). */
  authorName?: string;
  /** Product name for product reviews, supplied by the API. */
  productTitle?: string;
  rating: number;
  title?: string;
  comment: string;
  images?: ReviewImage[];
  verifiedPurchase: boolean;
  helpfulCount: number;
  helpfulBy?: string[];
  reportedBy?: string[];
  vendorResponse?: ReviewVendorResponse;
  createdAt: string;
  updatedAt?: string;
  vendorId?: string;
  productId?: string;
  orderId?: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recommendPercentage: number;
}

export interface ReviewReport {
  id: string;
  reviewId: string;
  userId: string;
  reason: ReviewReportReason;
  details?: string;
  createdAt: string;
}

// ============================================================
// WALLET & WALLET TRANSACTION
// ============================================================

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  direction: WalletTransactionDirection;
  amount: number;
  status: WalletTransactionStatus;
  description: string;
  reference?: string;
  createdAt: string;
  completedAt?: string;
  orderId?: string;
  bankName?: string;
  bankAccount?: string;
  metadata?: Record<string, string>;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  pendingAmount: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  transactions: WalletTransaction[];
}

// ============================================================
// RE-EXPORT OF INLINE TYPES (backward compat aliases)
// ============================================================

// These match the original inline types so existing code doesn't break.
// PaymentStatus is now exported as a named type above.

// ============================================================
// MARKETPLACE FILTERS
// ============================================================

export type SortOption = "recent" | "price_low" | "price_high" | "popular" | "rating";

export interface MarketplaceFilters {
  search: string;
  categoryId: string;
  campusId: string;
  vendorId: string;
  condition: ProductCondition | "";
  minPrice: string;
  maxPrice: string;
  sort: SortOption;
}

// ============================================================
// PROMO CODE
// ============================================================

export interface PromoCode {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  description: string;
  expiresAt: string;
}

// ============================================================
// LOYALTY
// ============================================================

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

export interface LoyaltyProgram {
  points: number;
  tier: LoyaltyTier;
  pointsToNairaRate: number; // e.g. 1 point = ₦1
  lifetimePoints: number;
}

// ============================================================
// CHECKOUT
// ============================================================

export type PickupLocation =
  | "main_gate"
  | "library"
  | "student_union"
  | "engineering_block"
  | "science_block";

export const PICKUP_LOCATION_LABELS: Record<PickupLocation, string> = {
  main_gate: "Main Gate",
  library: "University Library",
  student_union: "Student Union Building",
  engineering_block: "Engineering Block",
  science_block: "Science Block",
};

export interface CheckoutFormData {
  deliveryMethod: DeliveryMethod;
  pickupLocation: PickupLocation;
  deliveryAddress: string;
  campusId: string;
  paymentMethod: PaymentMethod;
  promoCode: string;
  loyaltyPointsToUse: number;
  notes: string;
}

export interface CheckoutValidation {
  deliveryAddress?: string;
  pickupLocation?: string;
  promoCode?: string;
  loyaltyPoints?: string;
  paymentMethod?: string;
}

export interface CheckoutSummary {
  itemsSubtotal: number;
  platformFee: number;
  deliveryFee: number;
  discountAmount: number;
  loyaltyDiscount: number;
  finalTotal: number;
  itemCount: number;
  appliedPromo: PromoCode | null;
  loyaltyPointsUsed: number;
  loyaltyPointsEarned: number;
}

// ============================================================
// PROFILE & SETTINGS
// ============================================================

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  campusId: string;
  isDefault: boolean;
  contactName: string;
  contactPhone: string;
  notes?: string;
}

export interface SavedPaymentMethod {
  id: string;
  type: "card" | "bank_account" | "wallet";
  label: string;
  last4: string;
  brand?: string;
  bankName?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  orderUpdates: boolean;
  messages: boolean;
  promotions: boolean;
  community: boolean;
  system: boolean;
  emailDigest: boolean;
  pushEnabled: boolean;
}

export interface PrivacySettings {
  showProfileToStudents: boolean;
  showPhoneToVendors: boolean;
  showEmailToVendors: boolean;
  allowDirectMessages: boolean;
  showOnlineStatus: boolean;
  showOrderHistory: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: "sms" | "email";
  lastPasswordChange: string;
  activeSessions: number;
  loginNotifications: boolean;
}

// ============================================================
// VENDOR DASHBOARD
// ============================================================

export type VendorProductStatus = "active" | "draft" | "sold_out" | "archived";

export interface VendorProduct {
  id: string;
  vendorId: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  categoryId: string;
  campusId: string;
  images: string[];
  condition: ProductCondition;
  status: VendorProductStatus;
  stock: number;
  soldCount: number;
  allowDelivery: boolean;
  allowPickup: boolean;
  deliveryFee?: number;
  location?: string;
  tags?: string[];
  viewCount: number;
  saveCount: number;
  rating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VendorOrder {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  items: { productTitle: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  platformFee: number;
  vendorEarning: number;
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
  pickupLocation?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  notes?: string;
}

export interface VendorEarningsSummary {
  totalRevenue: number;
  totalEarning: number;
  platformFees: number;
  pendingPayout: number;
  thisMonth: number;
  lastMonth: number;
  growth: number;
  orderCount: number;
}

export interface VendorDailyEarning {
  date: string;
  revenue: number;
  orders: number;
}

export interface VendorCustomer {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  campusId: string;
}

export interface StoreProfile {
  vendorId: string;
  storeName: string;
  description: string;
  coverImage?: string;
  logoImage?: string;
  specialties: string[];
  responseTime: string;
  operatingHours: string;
  returnPolicy: string;
  campusId: string;
  isActive: boolean;
  createdAt: string;
}

export interface StoreSettings {
  acceptOrders: boolean;
  autoConfirm: boolean;
  notifyOnOrder: boolean;
  notifyOnMessage: boolean;
  showSoldItems: boolean;
  allowPreOrder: boolean;
  minOrderAmount: number;
}

// ============================================================
// GLOBAL SEARCH
// ============================================================

export type SearchEntityType =
  | "product"
  | "vendor"
  | "category"
  | "post"
  | "event"
  | "job"
  | "service"
  | "provider";

export type SearchFilterType = "all" | SearchEntityType;

export type SearchSortOption =
  | "relevance"
  | "recent"
  | "popular"
  | "price_low"
  | "price_high";

export interface SearchResultItem {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle: string;
  description?: string;
  image?: string;
  url: string;
  rating?: number;
  ratingCount?: number;
  price?: number;
  campusId?: string;
  tags?: string[];
}

export interface SearchSuggestion {
  text: string;
  type: "query" | "entity";
  entityType?: SearchEntityType;
  entityId?: string;
}

/**
 * Unified global-search query. Mirrors the future NestJS
 * `GET /search` DTO — only backend-supported filters are exposed.
 * `type`, `sort`, `campusId`, `priceMin` and `priceMax` are the only
 * filter axes; every axis is reflected in the URL (`q/type/sort/page/
 * campus/priceMin/priceMax`) so a search can be shared and restored.
 */
export interface GlobalSearchQuery {
  q?: string;
  type?: SearchFilterType;
  sort?: SearchSortOption;
  page?: number;
  pageSize?: number;
  campusId?: string;
  priceMin?: number;
  priceMax?: number;
}

/** Paginated global-search response (server-side, backend-authoritative). */
export interface SearchPage {
  query: string;
  items: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  suggestions: SearchSuggestion[];
}

export interface TrendingSearch {
  query: string;
  count: number;
  category?: string;
}

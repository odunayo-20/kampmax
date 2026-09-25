import {
  AccountOverview,
  AccountOrderStats,
  KampmaxCoinAccount,
  KampmaxProfile,
  RewardsAccount,
} from "@/types/account";
import { mockKampmaxCoin, buildRewardsAccount, mockProfiles } from "@/data/account";
import { getOrdersByUser } from "@/services/orders";
import { getLoyaltyProgram } from "@/services/profile";
import { getReviewsByUser, hasUserReviewedProduct } from "@/services/reviews";
import { getWishlistCount } from "@/services/wishlist";
import { getUnreadNotificationCount } from "@/services/notifications";
import type { SavedAddress } from "@/types";

/**
 * Customer Account service layer (repository).
 *
 * All customer-account reads are isolated here and will map 1:1 to the future
 * `GET /me/*` API. Components never call data services directly — they use
 * this module, so swapping the mocks for real API calls is a single change.
 *
 * SECURITY: every value returned here is display-only. The backend is
 * authoritative for balances, rewards, order ownership and entitlement. Never
 * derive authoritative state from the browser.
 */

function orderStatsFor(userId: string): AccountOrderStats {
  const orders = getOrdersByUser(userId);
  const active = orders.filter((o) =>
    ["placed", "confirmed", "preparing", "ready", "out_for_delivery"].includes(o.status)
  ).length;
  return {
    total: orders.length,
    active,
    completed: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };
}

export function getAccountOverview(userId: string): AccountOverview {
  const loyalty = getLoyaltyProgram();
  const orders = getOrdersByUser(userId);
  const activeStatuses = ["placed", "confirmed", "preparing", "ready", "out_for_delivery"];

  return {
    userId,
    orderStats: orderStatsFor(userId),
    wishlistCount: getWishlistCount(userId),
    savedForLaterCount: 0, // computed client-side from cart; kept for the contract
    unreadNotifications: getUnreadNotificationCount(userId),
    coin: { isActive: mockKampmaxCoin.isActive, balance: mockKampmaxCoin.balance },
    rewards: { points: loyalty.points, tier: loyalty.tier, pending: 0 },
    recentOrders: [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4),
    profiles: mockProfiles,
  };
}

/** Future GET /me/coin — returns the disabled/coming-soon state honestly. */
export function getKampmaxCoin(userId: string): KampmaxCoinAccount {
  void userId;
  return mockKampmaxCoin;
}

/** Future GET /me/rewards — display only; backend authoritative. */
export function getRewards(userId: string): RewardsAccount {
  void userId;
  return buildRewardsAccount(getLoyaltyProgram());
}

export function getCustomerProfiles(userId: string): KampmaxProfile[] {
  void userId;
  return mockProfiles;
}

/**
 * Future GET /me/reviews — the customer's submitted reviews plus products that
 * are eligible for review from delivered orders they haven't reviewed yet.
 */
export function getMyReviews(userId: string) {
  const reviews = getReviewsByUser(userId);
  const awaiting = getAwaitingReviews(userId);
  return { reviews, awaiting };
}

export function getAwaitingReviews(userId: string) {
  const deliveredOrders = getOrdersByUser(userId).filter(
    (o) => o.status === "delivered"
  );
  const awaiting = deliveredOrders.flatMap((order) =>
    order.items
      .filter((item) => {
        const productId = item.product.id;
        return !hasUserReviewedProduct(userId, productId);
      })
      .map((item) => ({
        orderId: order.id,
        product: item.product,
        vendorId: order.vendorId,
        quantity: item.quantity,
      }))
  );
  // de-dupe by product id
  const seen = new Set<string>();
  return awaiting.filter((a) => {
    if (seen.has(a.product.id)) return false;
    seen.add(a.product.id);
    return true;
  });
}

// Re-export address/wishlist/notification helpers so the account UI imports
// from a single place and can be swapped for an API client later.
export type { SavedAddress };
export { getWishlist, getWishlistCount, toggleWishlist, removeFromWishlist, addToWishlist } from "@/services/wishlist";
export { getOrdersByUser, getOrderById, getActiveOrders, getCompletedOrders, getCancelledOrders } from "@/services/orders";
export { getUnreadNotificationCount, getNotifications, markAsRead, markAllAsRead, deleteNotification, getGroupedNotifications } from "@/services/notifications";
export { getReviewsByUser } from "@/services/reviews";
export { getLoyaltyProgram } from "@/services/profile";

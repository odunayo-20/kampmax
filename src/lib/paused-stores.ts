/** Stores that have paused new orders: the words buyers see, and which cart stores block checkout. Matches the mobile app. */

/** On a store page, and above a product from that store. */
export function pausedStoreText(storeName: string): string {
  return `${storeName} isn't taking new orders right now.`;
}

/** Why checkout is stopped for paused stores, or null when none is paused. */
export function pausedCartProblem(names: string[]): string | null {
  if (names.length === 0) return null;
  if (names.length === 1) return `${names[0]} isn't taking orders right now. Remove its items to continue.`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} aren't taking orders right now. Remove their items to continue.`;
}

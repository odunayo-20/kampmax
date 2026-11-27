/** Pure rules for the provider's reviews page. The mobile app's lib/provider-reviews.ts says the same things. */

/** How reviews arrive: live as soon as the customer posts them (Kampmax can remove one that breaks the rules). */
export const REVIEWS_EMPTY = {
  title: "No reviews yet",
  text: "After a customer confirms a job was done, they can review it. The review shows here as soon as they post it.",
};

/** A bar's width as a whole-number percentage of all reviews, so it is each star's real share. */
export function barShare(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

/** The list holds only the newest reviews; say so when there are more. */
export function latestNote(total: number, shown: number): string | null {
  return total > shown ? `Showing the latest ${shown} of ${total} reviews.` : null;
}

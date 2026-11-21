/**
 * The "Open in the Kampmax app" bar on pages people share from the mobile app (a product, a store).
 *
 * The mobile app registers the `kampmax://` scheme, and its screens live at `product/<id>` and
 * `vendor/<id>`. On Android an intent link is used instead: Chrome opens the app when it is installed
 * and otherwise sends the visitor to the app's Play Store page (or the store address given here).
 * On iPhone, Safari opens `kampmax://` when the app is installed. Once universal links are set up on
 * this domain, the phone opens the app straight from the shared link and this bar matters less.
 */

export type AppScreen = { kind: "product" | "vendor"; id: string };
export type PhonePlatform = "android" | "ios" | "other";

const ANDROID_PACKAGE = "com.kampmax.app";
const SAFE_ID = /^[A-Za-z0-9_-]{1,120}$/;

export function phonePlatform(userAgent: string): PhonePlatform {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  return "other";
}

/** Where the visitor can get the app, from NEXT_PUBLIC_ANDROID_APP_URL / NEXT_PUBLIC_IOS_APP_URL (https only). */
export function appStoreUrl(
  platform: PhonePlatform,
  env: { android?: string; ios?: string }
): string | null {
  const url = platform === "android" ? env.android : platform === "ios" ? env.ios : undefined;
  return url && /^https:\/\/\S+$/i.test(url.trim()) ? url.trim() : null;
}

/** The link that opens this screen in the app, or null on a computer or for an odd id. */
export function openInAppHref(
  screen: AppScreen,
  platform: PhonePlatform,
  storeUrl: string | null = null
): string | null {
  if (platform === "other" || !SAFE_ID.test(screen.id)) return null;
  const path = `${screen.kind}/${screen.id}`;
  if (platform === "ios") return `kampmax://${path}`;
  const fallback = storeUrl ? `S.browser_fallback_url=${encodeURIComponent(storeUrl)};` : "";
  return `intent://${path}#Intent;scheme=kampmax;package=${ANDROID_PACKAGE};${fallback}end`;
}

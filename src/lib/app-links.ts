/**
 * The files that let a phone open app.kampmax.com links in the Kampmax app instead of the browser
 * (iOS universal links and Android app links). They are built from the team id and signing
 * fingerprints, which only the account owner has, so until those are set the files are not served
 * and links keep opening the website as they do today.
 */

export const IOS_BUNDLE_ID = "com.kampmax.app";
export const ANDROID_PACKAGE = "com.kampmax.app";

/** The paths the app knows how to open (kept in step with the mobile app's deep-links). */
export const APP_LINK_PATHS = ["/marketplace/*", "/store/*", "/register*"] as const;

const TEAM_ID = /^[A-Z0-9]{10}$/;
const SHA256 = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/** The iOS association file, or null when no valid Apple team id is configured. */
export function appleAssociation(teamId: string | undefined) {
  const id = teamId?.trim().toUpperCase();
  if (!id || !TEAM_ID.test(id)) return null;
  return {
    applinks: {
      details: [{ appIDs: [`${id}.${IOS_BUNDLE_ID}`], components: APP_LINK_PATHS.map((path) => ({ "/": path })) }],
    },
  };
}

/** The Android asset links file, or null when no valid signing fingerprint is configured. */
export function androidAssetLinks(fingerprints: string | undefined) {
  const valid = (fingerprints ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter((f) => SHA256.test(f));
  if (valid.length === 0) return null;
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: ANDROID_PACKAGE, sha256_cert_fingerprints: valid },
    },
  ];
}

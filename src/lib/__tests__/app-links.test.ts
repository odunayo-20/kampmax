import { describe, expect, it } from "vitest";
import { androidAssetLinks, appleAssociation } from "../app-links";

const FINGERPRINT = Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, "0").toUpperCase()).join(":");

describe("app link files", () => {
  it("serve nothing until the account owner's ids are set", () => {
    expect(appleAssociation(undefined)).toBeNull();
    expect(appleAssociation("")).toBeNull();
    expect(androidAssetLinks(undefined)).toBeNull();
    expect(androidAssetLinks("")).toBeNull();
  });

  it("reject ids that are the wrong shape rather than publishing a broken file", () => {
    expect(appleAssociation("short")).toBeNull();
    expect(appleAssociation("ABCDE12345 ")).not.toBeNull();
    expect(androidAssetLinks("not-a-fingerprint")).toBeNull();
  });

  it("build the iOS file for the bundle and the paths the app opens", () => {
    const file = appleAssociation("abcde12345");
    expect(file?.applinks.details[0].appIDs).toEqual(["ABCDE12345.com.kampmax.app"]);
    expect(file?.applinks.details[0].components.map((c) => c["/"])).toEqual(["/marketplace/*", "/store/*", "/register*"]);
  });

  it("build the Android file with every valid fingerprint and skip the bad ones", () => {
    const file = androidAssetLinks(` ${FINGERPRINT.toLowerCase()}, junk `);
    expect(file?.[0].target.package_name).toBe("com.kampmax.app");
    expect(file?.[0].target.sha256_cert_fingerprints).toEqual([FINGERPRINT]);
  });
});

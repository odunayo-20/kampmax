"use client";

import { VendorNotifications } from "@/components/vendor-dashboard/VendorNotifications";

/** The provider's bell: the same real notification feed as everywhere else. */
export function ServiceProviderNotifications() {
  return <VendorNotifications seeAllHref="/notifications" />;
}

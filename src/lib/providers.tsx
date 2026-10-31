"use client";

import { ReactNode, useState } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { AppProvider } from "@/lib/app-context";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";
import { createQueryClient } from "@/lib/query-client";
import { createQueryPersistOptions } from "@/lib/query-persistence";
import { AnalyticsBridge } from "@/components/analytics/AnalyticsBridge";
import { QueryCacheOwnerGuard } from "@/components/auth/QueryCacheOwnerGuard";
import { NotificationSyncBridge } from "@/components/notifications/NotificationSyncBridge";
import { MessageSyncBridge } from "@/components/messages/MessageSyncBridge";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const [persistOptions] = useState(() => createQueryPersistOptions());

  return (
    <AuthProvider>
      <AnalyticsBridge />
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <QueryCacheOwnerGuard />
        <NotificationSyncBridge />
        <MessageSyncBridge />
        <AppProvider>
          <CartProvider>{children}</CartProvider>
        </AppProvider>
      </PersistQueryClientProvider>
    </AuthProvider>
  );
}

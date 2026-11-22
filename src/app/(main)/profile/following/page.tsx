"use client";

import { useRouter } from "next/navigation";
import { Loader2, Store } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { FollowedStoreList } from "@/components/storefront/FollowedStoreList";
import { useFollowedStores } from "@/hooks/use-store-follow";
import { useAuth } from "@/lib/auth-context";

export default function FollowedStoresPage() {
  const router = useRouter();
  const { status } = useAuth();
  const stores = useFollowedStores();
  const signedIn = status === "authenticated";

  return (
    <PageContainer className="space-y-4">
      <Breadcrumbs items={[{ label: "Profile", href: "/profile" }, { label: "Stores I follow" }]} />
      <h1 className="text-lg font-bold text-kampmax-text">Stores I follow</h1>

      {!signedIn ? (
        <Notice
          title="Sign in to see the stores you follow"
          text="Follow a store to hear when it adds new items or runs an offer."
          action={{ label: "Sign in", onClick: () => router.push("/login?next=/profile/following") }}
        />
      ) : stores.isPending ? (
        <div className="flex justify-center py-12" role="status" aria-label="Loading the stores you follow">
          <Loader2 className="h-6 w-6 animate-spin text-kampmax-blue" />
        </div>
      ) : stores.isError ? (
        <Notice title={stores.error.message} action={{ label: "Try again", onClick: () => void stores.refetch() }} alert />
      ) : stores.data.length === 0 ? (
        <Notice
          title="You don't follow any stores yet"
          text="Follow a store to hear when it adds new items or runs an offer."
          action={{ label: "Browse marketplace", onClick: () => router.push("/marketplace") }}
        />
      ) : (
        <FollowedStoreList stores={stores.data} />
      )}
    </PageContainer>
  );
}

function Notice({
  title,
  text,
  action,
  alert,
}: {
  title: string;
  text?: string;
  action: { label: string; onClick: () => void };
  alert?: boolean;
}) {
  return (
    <div role={alert ? "alert" : undefined} className="rounded-xl border border-kampmax-border bg-white p-8 text-center">
      <Store className="mx-auto mb-3 h-10 w-10 text-kampmax-text-secondary" aria-hidden />
      <p className="text-sm font-medium text-kampmax-text">{title}</p>
      {text && <p className="mt-1 text-xs text-kampmax-text-secondary">{text}</p>}
      <button onClick={action.onClick} className="mt-4 rounded-lg bg-kampmax-blue px-4 py-2 text-sm font-medium text-white">
        {action.label}
      </button>
    </div>
  );
}

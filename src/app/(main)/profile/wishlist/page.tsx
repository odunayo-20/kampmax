"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Loader2, ShoppingCart, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useWishlist } from "@/services/wishlist";
import { formatNaira } from "@/lib/utils";

export default function WishlistPage() {
  const router = useRouter();
  const { items, signedIn, loading, error, remove, reload } = useWishlist();
  const [removing, setRemoving] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const products = items.filter((i) => i.targetType === "PRODUCT");

  async function removeItem(productId: string) {
    setActionError(null);
    setRemoving(productId);
    const res = await remove(productId);
    setRemoving(null);
    if (!res.ok && res.error) setActionError(res.error);
  }

  return (
    <PageContainer className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Profile", href: "/profile" },
          { label: "Wishlist" },
        ]}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-kampmax-text" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-kampmax-text">My Wishlist</h1>
          {signedIn && !loading && !error && (
            <p className="text-xs text-kampmax-text-secondary">
              {products.length} item{products.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {!signedIn ? (
        <div className="bg-white rounded-xl border border-kampmax-border p-8 text-center">
          <Heart className="h-10 w-10 text-kampmax-text-secondary mx-auto mb-3" />
          <p className="text-sm font-medium text-kampmax-text">Sign in to see your wishlist</p>
          <p className="text-xs text-kampmax-text-secondary mt-1">Your saved items follow you on any device.</p>
          <button
            onClick={() => router.push("/login?next=/profile/wishlist")}
            className="mt-4 px-4 py-2 bg-kampmax-blue text-white text-sm font-medium rounded-lg"
          >
            Sign in
          </button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12" role="status" aria-label="Loading your wishlist">
          <Loader2 className="h-6 w-6 animate-spin text-kampmax-blue" />
        </div>
      ) : error ? (
        <div role="alert" className="bg-white rounded-xl border border-kampmax-border p-8 text-center">
          <p className="text-sm text-kampmax-text-secondary">{error}</p>
          <button
            onClick={() => void reload()}
            className="mt-4 px-4 py-2 bg-kampmax-blue text-white text-sm font-medium rounded-lg"
          >
            Try again
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border border-kampmax-border p-8 text-center">
          <Heart className="h-10 w-10 text-kampmax-text-secondary mx-auto mb-3" />
          <p className="text-sm font-medium text-kampmax-text">Your wishlist is empty</p>
          <p className="text-xs text-kampmax-text-secondary mt-1">
            Browse the marketplace and tap the heart icon to save items
          </p>
          <button
            onClick={() => router.push("/marketplace")}
            className="mt-4 px-4 py-2 bg-kampmax-blue text-white text-sm font-medium rounded-lg"
          >
            Browse Marketplace
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {products.map((entry) => {
            const product = entry.product;
            const busy = removing === entry.targetId || entry.id.startsWith("pending:");
            return (
              <li
                key={entry.id}
                className="bg-white rounded-xl border border-kampmax-border p-4 flex items-center gap-3"
              >
                <div className="w-16 h-16 rounded-lg bg-kampmax-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {product?.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingCart className="h-6 w-6 text-kampmax-text-secondary" aria-hidden />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {product ? (
                    <>
                      <Link
                        href={`/marketplace/${product.id}`}
                        className="block text-sm font-medium text-kampmax-text truncate hover:underline"
                      >
                        {product.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-bold text-kampmax-blue">{formatNaira(product.price)}</span>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <span className="text-xs text-kampmax-text-secondary line-through">
                            {formatNaira(product.compareAtPrice)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] mt-0.5 text-kampmax-text-secondary">
                        {product.condition.charAt(0) + product.condition.slice(1).toLowerCase()}
                        {!product.available && <span className="ml-2 font-medium text-kampmax-error">Not available right now</span>}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-kampmax-text">This item is no longer available</p>
                      <p className="text-[11px] text-kampmax-text-secondary mt-0.5">The seller has removed it. You can take it off your list.</p>
                    </>
                  )}
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => void removeItem(entry.targetId)}
                    disabled={busy}
                    aria-label={`Remove ${product?.name ?? "item"} from wishlist`}
                    className="w-8 h-8 rounded-lg bg-kampmax-error/10 text-kampmax-error flex items-center justify-center disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                  {product && (
                    <button
                      onClick={() => router.push(`/marketplace/${product.id}`)}
                      aria-label={`View ${product.name}`}
                      className="w-8 h-8 rounded-lg bg-kampmax-blue/10 text-kampmax-blue flex items-center justify-center"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}

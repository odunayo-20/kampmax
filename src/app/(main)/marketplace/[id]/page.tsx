"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer, Breadcrumbs } from "@/components/layout";
import { Button } from "@/components/ui";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { getProductById, fetchProductById, getProductsByCategory } from "@/services/products";
import { getVendorById } from "@/services/users";
import { isWishlisted, toggleWishlist } from "@/services/wishlist";
import { addRecentlyViewed } from "@/services/recently-viewed";
import { ProductReviewsSection } from "@/components/reviews";
import { formatNaira, calculateDiscountPercentage } from "@/lib/utils";
import { EMPTY_CAMPUS, getCampuses } from "@/services/campus";
import { Product } from "@/types";
import {
  ProductGallery,
  VariantSelector,
  PersonalizationForm,
  QuantitySelector,
  PurchaseActions,
  VendorCard,
  CampusDelivery,
  ProductSpecs,
  ProductDescription,
  TrustSignals,
  RelatedProducts,
  MobileStickyBar,
  AddedToCartToast,
  ProductInfoHeader,
  DesktopActions,
  RecentlyViewedBar,
  getVariantGroups,
  getPersonalizationFields,
  getSpecs,
  getStockForSelection,
  calculateVariantPriceModifier,
  areAllVariantsSelected,
  isPersonalizationValid,
  VariantGroup,
} from "@/components/marketplace";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [quantity, setQuantity] = useState(1);
  const [liked, setLiked] = useState(() => isWishlisted(id));
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [personalization, setPersonalization] = useState<Record<string, string>>({});
  const [added, setAdded] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);

  const [product, setProduct] = useState<Product | null>(() => getProductById(id) || null);
  const [isLoading, setIsLoading] = useState(!product);

  useEffect(() => {
    let mounted = true;
    fetchProductById(id).then((res) => {
      if (mounted) {
        if (res.data) {
          setProduct(res.data);
          addRecentlyViewed(res.data);
        }
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (product) {
      addRecentlyViewed(product);
    }
  }, [product]);

  const gallery = useMemo(() => {
    if (!product) return [];
    return product.images.length > 0 ? product.images : ["/placeholder-product.svg"];
  }, [product]);

  const variantGroups = useMemo(() => (product ? getVariantGroups(product.id, product.categoryId) : []), [product]);
  const personalizationFields = useMemo(
    () => (product ? getPersonalizationFields(product.id, product.categoryId) : null),
    [product]
  );
  const specs = useMemo(() => (product ? getSpecs(product.id, product.categoryId) : []), [product]);

  useEffect(() => {
    if (!variantGroups.length) return;
    const init: Record<string, string> = {};
    variantGroups.forEach((g) => {
      const first = g.options.find((o) => o.available);
      if (first) init[g.id] = first.id;
    });
    setSelectedVariants(init);
  }, [variantGroups]);

  const variantPriceModifier = useMemo(
    () => calculateVariantPriceModifier(variantGroups, selectedVariants),
    [variantGroups, selectedVariants]
  );

  if (isLoading && !product) {
    return (
      <PageContainer className="py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-48 bg-neutral-200 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-neutral-200 rounded-xl" />
            <div className="space-y-4">
              <div className="h-8 bg-neutral-200 rounded w-3/4" />
              <div className="h-6 bg-neutral-200 rounded w-1/3" />
              <div className="h-24 bg-neutral-200 rounded" />
              <div className="h-12 bg-neutral-200 rounded" />
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!product) {
    return (
      <PageContainer className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto rounded-full bg-neutral-100 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <h1 className="text-lg font-bold text-neutral-900">Product not found</h1>
          <p className="text-sm text-neutral-500 mt-1">The product you are looking for may have been removed or is unavailable.</p>
          <div className="flex gap-2 justify-center mt-6">
            <Button variant="outline" onClick={() => router.back()}>Go back</Button>
            <Link href="/marketplace"><Button variant="primary">Continue Shopping</Button></Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  const vendor = getVendorById(product.vendorId);
  const campus = getCampuses().find((c) => c.id === product.campusId) ?? EMPTY_CAMPUS;
  const similar = getProductsByCategory(product.categoryId).filter((p) => p.id !== product.id).slice(0, 4);


  const isSold = product.status === "sold";
  const isRemoved = product.status === "removed";
  const isUnavailable = isSold || isRemoved;

  const effectivePrice = product.price + variantPriceModifier;
  const hasDiscount = !!product.originalPrice && product.originalPrice > effectivePrice;
  const discountPct = hasDiscount ? calculateDiscountPercentage(product.originalPrice!, effectivePrice) : 0;

  const allVariantsSelected = areAllVariantsSelected(variantGroups, selectedVariants);
  // Real stock from the backend (-1 = unlimited); the hash-based value is only
  // a fallback for catalog entries that carry no stock figure.
  const variantStock =
    typeof product.stock === "number"
      ? product.stock === -1
        ? 999
        : product.stock
      : getStockForSelection(product.id, selectedVariants);
  const inStock = !isUnavailable && variantStock > 0;
  const lowStock = inStock && variantStock <= 3;
  const maxQty = Math.min(10, variantStock || 10);

  const personalizationValid = isPersonalizationValid(personalizationFields, personalization);

  const canAddToCart = !isUnavailable && inStock && allVariantsSelected && personalizationValid && quantity >= 1 && quantity <= maxQty;

  const missingGroups = variantGroups.filter((g) => !selectedVariants[g.id]).map((g) => g.name);

  function buildVariantLabel(): string | undefined {
    if (!variantGroups.length || !Object.keys(selectedVariants).length) return undefined;
    const parts: string[] = [];
    variantGroups.forEach((g) => {
      const selId = selectedVariants[g.id];
      const opt = g.options.find((o) => o.id === selId);
      if (opt) parts.push(`${g.name}: ${opt.value}`);
    });
    return parts.length ? parts.join(" · ") : undefined;
  }

  function handleAddToCart() {
    if (!product || !canAddToCart) return;
    const cartProduct = { ...product, price: effectivePrice };
    addItem(cartProduct, quantity, {
      variantLabel: buildVariantLabel(),
      selectedVariants,
      unitPrice: effectivePrice,
      openDrawer: true,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  function handleBuyNow() {
    if (!product || !canAddToCart) return;
    setBuyLoading(true);
    const cartProduct = { ...product, price: effectivePrice };
    addItem(cartProduct, quantity, {
      variantLabel: buildVariantLabel(),
      selectedVariants,
      unitPrice: effectivePrice,
      openDrawer: false,
    });
    setTimeout(() => {
      setBuyLoading(false);
      router.push("/checkout");
    }, 450);
  }

  return (
    <div className="pb-24 lg:pb-0">
      <div className="hidden lg:block border-b border-neutral-200 bg-white">
        <PageContainer className="py-3">
          <Breadcrumbs items={[{ label: "Marketplace", href: "/marketplace" }, { label: product.title }]} />
        </PageContainer>
      </div>

      <PageContainer className="py-0 lg:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-8 items-start">
          <div className="-mx-4 lg:mx-0">
            <ProductGallery
              images={gallery}
              title={product.title}
              hasDiscount={hasDiscount}
              discountPct={discountPct}
              onBack={() => router.back()}
              showBack
            />
          </div>

          <div className="space-y-5">
            <DesktopActions
              initialLiked={liked}
              onLikeToggle={(newLiked) => {
                if (product) toggleWishlist(product.id);
                setLiked(newLiked);
              }}
              onShare={() => navigator.share?.({ title: product.title, url: window.location.href }).catch(() => {})}
            />

            <ProductInfoHeader
              product={product}
              effectivePrice={effectivePrice}
              inStock={inStock}
              lowStock={lowStock}
              variantStock={variantStock}
              isSold={isSold}
              isRemoved={isRemoved}
              hasDiscount={hasDiscount}
              discountPct={discountPct}
            />

            <VariantSelector
              variantGroups={variantGroups}
              selectedVariants={selectedVariants}
              onChange={(groupId, optionId) => setSelectedVariants((s) => ({ ...s, [groupId]: optionId }))}
              allSelected={allVariantsSelected}
              missingGroups={missingGroups}
            />

            <PersonalizationForm fields={personalizationFields} values={personalization} onChange={(id, value) => setPersonalization((p) => ({ ...p, [id]: value }))} />

            <QuantitySelector quantity={quantity} maxQty={maxQty} onChange={setQuantity} />

            <PurchaseActions
              canAddToCart={canAddToCart}
              isUnavailable={isUnavailable}
              allVariantsSelected={allVariantsSelected}
              inStock={inStock}
              personalizationValid={personalizationValid}
              added={added}
              buyLoading={buyLoading}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
            />

            <VendorCard
              vendor={vendor}
              campusName={campus.name}
              productLocation={product.location}
              productId={product.id}
              productTitle={product.title}
              productPrice={effectivePrice}
              productImage={gallery[0]}
            />

            <CampusDelivery campus={campus} productLocation={product.location} />
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <ProductDescription description={product.description} />
          <ProductSpecs specs={specs} productId={product.id} createdAt={product.createdAt} tags={product.tags} />
          <TrustSignals />
          <ProductReviewsSection
            productId={product.id}
            vendorId={product.vendorId}
            userId={user?.id ?? null}
            isVerifiedBuyer={false} // TODO: derive from orders when backend is connected
            productTitle={product.title}
          />

          <RelatedProducts products={similar} currentCategoryId={product.categoryId} />

          <RecentlyViewedBar />
        </div>
      </PageContainer>

      <MobileStickyBar
        price={effectivePrice}
        quantity={quantity}
        hasDiscount={hasDiscount}
        discountPct={discountPct}
        canAddToCart={canAddToCart}
        buyLoading={buyLoading}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      <AddedToCartToast visible={added} quantity={quantity} />
    </div>
  );
}
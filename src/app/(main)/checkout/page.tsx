"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Loader2 } from "lucide-react";
import { useCheckout } from "@/hooks/useCheckout";
import { useCart } from "@/lib/cart-context";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/atoms/Button";
import {
  CheckoutHeader,
  CheckoutErrorBanner,
  CustomerInformation,
  CampusSelector,
  SavedAddresses,
  VendorCheckoutGroup,
  CouponSection,
  LoyaltySection,
  PaymentMethod,
  OrderSummary,
  TrustInformation,
  PlaceOrderButton,
  OrderReview,
} from "@/components/checkout";
import { estimateLoyaltyPointsEarned } from "@/services/checkout";

export default function CheckoutPage() {
  const router = useRouter();
  const { items } = useCart();
  const empty = !items.some((i) => !i.savedForLater);

  /** The order summary above the pay button on a phone, closed until asked for. */
  const [summaryOpen, setSummaryOpen] = useState(false);

  const {
    phase,
    isBusy,
    error,
    summary,
    customer,
    setCustomerField,
    customerErrors,
    addresses,
    selectedAddress,
    addAddress,
    updateAddress,
    deleteAddress,
    selectAddress,
    selectedCampus,
    changeCampus,
    selectDeliveryOption,
    coupon,
    applyCouponCode,
    removeCoupon,
    paymentMethod,
    setPaymentMethod,
    walletBalance,
    placeOrder,
    isCustomer,
  } = useCheckout();

  // A wallet payment empties the cart just before leaving for the order.
  if (empty && !isBusy) {
    return (
      <PageContainer narrow>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-kampmax-muted flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 text-kampmax-text-secondary/40" />
          </div>
          <h2 className="text-lg font-semibold text-kampmax-text mb-1">
            Your cart is empty
          </h2>
          <p className="text-sm text-kampmax-text-secondary max-w-xs mb-6">
            Add some items to your cart before checking out.
          </p>
          <Button
            onClick={() => router.push("/marketplace")}
            className="bg-kampmax-navy text-white hover:bg-kampmax-navy/90"
          >
            Browse Marketplace
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (!summary) {
    return (
      <PageContainer narrow>
        <div className="flex items-center justify-center py-24 gap-3 text-kampmax-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">
            {phase === "leaving" ? "Opening your order…" : "Preparing your checkout…"}
          </span>
        </div>
      </PageContainer>
    );
  }

  const payButton = (
    <PlaceOrderButton
      phase={phase}
      disabled={!selectedAddress}
      onClick={() => void placeOrder()}
    />
  );

  return (
    <PageContainer className="pb-28 lg:pb-6">
      <div className="space-y-5">
        <CheckoutHeader
          itemCount={summary.pricing.itemCount}
          vendorCount={summary.vendorGroups.length}
        />

        <CheckoutErrorBanner message={error} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
          {/* ── Left: information & items ── */}
          <div className="space-y-5 min-w-0">
            <CustomerInformation
              customer={customer}
              isGuest={!isCustomer}
              onChange={setCustomerField}
              errors={customerErrors}
            />

            <CampusSelector
              campus={selectedCampus}
              campusState="available"
              onChange={changeCampus}
            />

            <SavedAddresses
              addresses={addresses}
              selectedId={selectedAddress?.id ?? null}
              onSelect={selectAddress}
              onAdd={addAddress}
              onUpdate={updateAddress}
              onDelete={deleteAddress}
            />

            {/* ── Review before payment ── */}
            <OrderReview
              customer={customer}
              campusName={selectedCampus.name}
              address={selectedAddress}
              vendorGroups={summary.vendorGroups}
            />

            {/* ── Multi-vendor items & delivery ── */}
            {summary.vendorGroups.map((group) => (
              <VendorCheckoutGroup
                key={group.vendorId}
                group={group}
                onChangeDelivery={selectDeliveryOption}
                readonly={isBusy}
              />
            ))}

            <CouponSection
              coupon={coupon}
              onApply={applyCouponCode}
              onRemove={removeCoupon}
            />

            <LoyaltySection points={estimateLoyaltyPointsEarned(summary.pricing.itemsSubtotal)} />

            <PaymentMethod
              paymentMethod={paymentMethod}
              finalTotal={summary.pricing.finalTotal}
              onChange={setPaymentMethod}
              walletEnabled={isCustomer}
              walletBalance={walletBalance}
            />
          </div>

          {/* ── Right: sticky summary ── */}
          <aside className="hidden lg:block lg:sticky lg:top-24 space-y-4">
            <OrderSummary pricing={summary.pricing} />
            <TrustInformation />
            {!selectedAddress && (
              <p className="text-xs text-kampmax-text-secondary">Add or select a delivery address to place your order.</p>
            )}
            {payButton}
          </aside>
        </div>
      </div>

      {/* ── Mobile sticky CTA above the bottom nav ── */}
      <div className="lg:hidden fixed inset-x-0 bottom-[60px] z-40 px-4 pb-3 bg-gradient-to-t from-white via-white/95 to-transparent pt-2">
        <Button
          onClick={() => setSummaryOpen((open) => !open)}
          aria-expanded={summaryOpen}
          className="w-full mb-2 bg-kampmax-muted text-kampmax-text hover:bg-neutral-200"
          variant="secondary"
        >
          {summaryOpen ? "Hide" : "Show"} order summary
        </Button>
        {summaryOpen && (
          <div className="mb-2">
            <OrderSummary pricing={summary.pricing} />
          </div>
        )}
        {payButton}
      </div>
    </PageContainer>
  );
}

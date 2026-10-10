"use client";

import { useMemo, useState } from "react";
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
  KampmaxCoinSection,
  LoyaltySection,
  PaymentMethod,
  OrderSummary,
  TrustInformation,
  PlaceOrderButton,
  OrderReview,
} from "@/components/checkout";
import { CHECKOUT_STATES } from "@/types/checkout";

export default function CheckoutPage() {
  const router = useRouter();
  const { items } = useCart();
  const activeItems = useMemo(
    () => items.filter((i) => !i.savedForLater),
    [items]
  );
  const checkout = useCheckout();

  const [summaryCollapsed, setSummaryCollapsed] = useState(false);

  const {
    state,
    errorInfo,
    session,
    refreshSession,
    flags,
    customer,
    setCustomerField,
    customerErrors,
    selectedAddress,
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    selectAddress,
    selectedCampus,
    changeCampus,
    loadingVendorId,
    selectDeliveryOption,
    coupon,
    applyCouponCode,
    removeCoupon,
    coin,
    toggleUseCoin,
    loyalty,
    paymentMethod,
    setPayment,
    walletBalance,
    placeOrder,
    isBusy,
    summaryItemCount,
    summaryVendorCount,
    vendorNames,
    isCustomer,
  } = checkout;

  const empty = activeItems.length === 0;
  const loading = state === CHECKOUT_STATES.LOADING && !session;

  // The demo campus is always available; a real app would check backend
  // delivery availability per (campus, vendor) and reflect it here.
  const campusState: "available" | "loading" | "unavailable" | "error" =
    loading ? "loading" : "available";

  if (empty && !loading) {
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

  if (loading || !session) {
    return (
      <PageContainer narrow>
        <div className="flex items-center justify-center py-24 gap-3 text-kampmax-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Preparing your checkout…</span>
        </div>
      </PageContainer>
    );
  }

  const sessionExpired = state === CHECKOUT_STATES.SESSION_EXPIRED;

  return (
    <PageContainer className="pb-28 lg:pb-6">
      <div className="space-y-5">
        <CheckoutHeader
          itemCount={summaryItemCount}
          vendorCount={summaryVendorCount}
        />

        {errorInfo && (
          <CheckoutErrorBanner
            error={errorInfo}
            variant={
              state === CHECKOUT_STATES.PAYMENT_CANCELLED ? "warning" : "error"
            }
            onRefresh={
              sessionExpired || state === CHECKOUT_STATES.NETWORK_ERROR
                ? () => {
                    refreshSession();
                    checkout.transitionTo(CHECKOUT_STATES.READY);
                  }
                : undefined
            }
          />
        )}

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
              campusState={campusState}
              onChange={(c) => changeCampus(c)}
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
              vendorDeliveries={session.vendorGroups.flatMap((g) =>
                g.selectedDelivery ? [g.selectedDelivery] : []
              )}
              vendorNames={vendorNames}
              vendorGroups={session.vendorGroups}
            />

            {/* ── Multi-vendor items & delivery ── */}
            {session.vendorGroups.map((group) => (
              <VendorCheckoutGroup
                key={group.vendorId}
                group={group}
                loadingVendorId={loadingVendorId}
                onChangeDelivery={selectDeliveryOption}
                readonly={isBusy || sessionExpired}
              />
            ))}

            <CouponSection
              coupon={coupon}
              onApply={applyCouponCode}
              onRemove={removeCoupon}
              enabled={flags.couponValidationEnabled}
            />

            <KampmaxCoinSection
              coin={coin}
              onToggle={toggleUseCoin}
            />

            <LoyaltySection loyalty={loyalty} />

            <PaymentMethod
              paymentMethod={paymentMethod}
              paystackEnabled={flags.paystackEnabled}
              finalTotal={session.pricing.finalTotal}
              onChange={setPayment}
              walletEnabled={isCustomer}
              walletBalance={walletBalance}
            />
          </div>

          {/* ── Right: sticky summary ── */}
          <aside className="hidden lg:block lg:sticky lg:top-24 space-y-4">
            <OrderSummary
              session={session}
              onRefresh={refreshSession}
              errorMessage={
                sessionExpired ? "Session expired — refresh to continue." : null
              }
            />
            <TrustInformation />
            {!selectedAddress && (
              <p className="text-xs text-kampmax-text-secondary">Add or select a delivery address to place your order.</p>
            )}
            <PlaceOrderButton
              state={state}
              disabled={
                !selectedAddress || isBusy || sessionExpired
              }
              onClick={() => void placeOrder()}
            />
          </aside>
        </div>
      </div>

      {/* ── Mobile sticky CTA above the bottom nav ── */}
      {state !== CHECKOUT_STATES.ORDER_CONFIRMATION && (
        <div className="lg:hidden fixed inset-x-0 bottom-[60px] z-40 px-4 pb-3 bg-gradient-to-t from-white via-white/95 to-transparent pt-2">
          <Button
            onClick={() => setSummaryCollapsed(true)}
            className="w-full mb-2 bg-kampmax-muted text-kampmax-text hover:bg-neutral-200"
            variant="secondary"
          >
            {summaryCollapsed ? "Hide" : "Show"} order summary
          </Button>
          {summaryCollapsed && (
            <div className="mb-2">
              <OrderSummary session={session} collapsed={false} />
            </div>
          )}
          <PlaceOrderButton
            state={state}
            disabled={
              !selectedAddress || isBusy || sessionExpired
            }
            onClick={() => void placeOrder()}
          />
        </div>
      )}
    </PageContainer>
  );
}

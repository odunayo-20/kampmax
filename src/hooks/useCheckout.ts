"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMyWalletBalance } from "@/services/wallet";
import { useAddresses, useCreateAddress, useDeleteAddress, useUpdateAddress } from "@/hooks/use-addresses";
import { useEnsureVendors } from "@/hooks/use-vendor-cache";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useApp } from "@/lib/app-context";
import type { CartLineItem } from "@/types/cart";
import type { SavedAddress } from "@/types";
import {
  createCheckoutSession,
  getCheckoutSession,
  isCheckoutSessionExpired,
  validateCheckout,
  applyCoupon,
  removeCoupon as removeCouponService,
  selectDelivery,
  getDefaultSelectedDelivery,
  initializePaystackPayment,
  payOrdersWithWallet,
  getPaymentStatus,
  getCustomerInfo,
  checkoutFeatureFlags,
  estimateLoyaltyPointsEarned,
} from "@/services/checkout";
import { checkoutOrdersApi, cancelUnpaidOrders } from "@/services/orders";
import type { AddressFormValues } from "@/components/checkout/AddressForm";
import {
  CHECKOUT_STATES,
  CheckoutState,
  CheckoutSession,
  CheckoutCustomer,
  CheckoutDeliveryMethod,
  CheckoutPaymentMethod,
  CheckoutErrorInfo,
  CouponState,
  KampmaxCoinState,
  LoyaltySectionState,
  VendorDeliveryOption,
  VendorDeliverySelection,
} from "@/types/checkout";

/** Record-friendly error bag for the shared inputs. */
type CustomerErrorBag = Record<string, string | undefined>;

// These are the *only* accepted state transitions, matching the module's spec.
const ALLOWED: Record<string, string[]> = {
  [CHECKOUT_STATES.IDLE]: [CHECKOUT_STATES.LOADING, CHECKOUT_STATES.READY, CHECKOUT_STATES.SESSION_EXPIRED],
  [CHECKOUT_STATES.LOADING]: [CHECKOUT_STATES.READY, CHECKOUT_STATES.VALIDATION_FAILED, CHECKOUT_STATES.SESSION_EXPIRED, CHECKOUT_STATES.NETWORK_ERROR],
  [CHECKOUT_STATES.VALIDATING]: [CHECKOUT_STATES.READY, CHECKOUT_STATES.VALIDATION_FAILED, CHECKOUT_STATES.SESSION_EXPIRED, CHECKOUT_STATES.NETWORK_ERROR],
  [CHECKOUT_STATES.READY]: [CHECKOUT_STATES.VALIDATING, CHECKOUT_STATES.SESSION_EXPIRED],
  [CHECKOUT_STATES.PAYMENT_INITIALIZING]: [CHECKOUT_STATES.PAYMENT_PENDING, CHECKOUT_STATES.PAYMENT_FAILED, CHECKOUT_STATES.PAYMENT_CANCELLED, CHECKOUT_STATES.SESSION_EXPIRED, CHECKOUT_STATES.NETWORK_ERROR, CHECKOUT_STATES.READY],
  [CHECKOUT_STATES.PAYMENT_PENDING]: [CHECKOUT_STATES.PAYMENT_SUCCESS, CHECKOUT_STATES.PAYMENT_FAILED, CHECKOUT_STATES.PAYMENT_CANCELLED, CHECKOUT_STATES.SESSION_EXPIRED],
  [CHECKOUT_STATES.PAYMENT_SUCCESS]: [CHECKOUT_STATES.ORDER_CONFIRMATION, CHECKOUT_STATES.NETWORK_ERROR, CHECKOUT_STATES.SESSION_EXPIRED],
  [CHECKOUT_STATES.ORDER_CONFIRMATION]: [],
  [CHECKOUT_STATES.VALIDATION_FAILED]: [CHECKOUT_STATES.READY, CHECKOUT_STATES.VALIDATING],
  [CHECKOUT_STATES.PAYMENT_FAILED]: [CHECKOUT_STATES.PAYMENT_INITIALIZING, CHECKOUT_STATES.READY, CHECKOUT_STATES.SESSION_EXPIRED],
  [CHECKOUT_STATES.PAYMENT_CANCELLED]: [CHECKOUT_STATES.PAYMENT_INITIALIZING, CHECKOUT_STATES.READY, CHECKOUT_STATES.SESSION_EXPIRED],
  [CHECKOUT_STATES.SESSION_EXPIRED]: [CHECKOUT_STATES.LOADING, CHECKOUT_STATES.READY],
  [CHECKOUT_STATES.NETWORK_ERROR]: [CHECKOUT_STATES.PAYMENT_INITIALIZING, CHECKOUT_STATES.READY, CHECKOUT_STATES.LOADING],
};

export function useCheckout() {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const { status, user } = useAuth();
  const { selectedCampus, setSelectedCampus } = useApp();

  const flags = useMemo(() => checkoutFeatureFlags(), []);

  // ── Core state (state machine) ──
  const [state, setStateRaw] = useState<CheckoutState>(CHECKOUT_STATES.IDLE);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [errorInfo, setErrorInfo] = useState<CheckoutErrorInfo | null>(null);

  // ── Form state ──
  const [customer, setCustomer] = useState<CheckoutCustomer>({ fullName: "", email: "", phone: "" });
  const [customerErrors, setCustomerErrors] = useState<CustomerErrorBag>({});
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const addressesQuery = useAddresses();
  const addresses = useMemo<SavedAddress[]>(() => addressesQuery.data ?? [], [addressesQuery.data]);
  const createAddressMutation = useCreateAddress();
  const updateAddressMutation = useUpdateAddress();
  const deleteAddressMutation = useDeleteAddress();
  const [loadingVendorId, setLoadingVendorId] = useState<string | null>(null);

  // ── Feature/state for the money features (display-only, backend-driven) ──
  const [coupon, setCoupon] = useState<CouponState>({ code: "", status: "idle" });
  const [coin, setCoin] = useState<KampmaxCoinState>({
    enabledByBackend: flags.kampmaxCoinEnabled,
    balance: 0,
    useCoin: false,
    appliedAmount: 0,
    remainingBalance: 0,
  });
  const loyalty = useMemo<LoyaltySectionState>(
    () => ({
      enabledByBackend: flags.loyaltyEnabled,
      pointsEarned: estimateLoyaltyPointsEarned(session?.pricing?.itemsSubtotal ?? 0),
      message:
        "Points are calculated and credited by the server after the order is confirmed. Rates are not hard-coded on the client.",
    }),
    [flags.loyaltyEnabled, session]
  );

  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("paystack");

  // Kampmax Pay wallet: only signed-in customers have one. The server remains
  // the authority on whether the balance covers the order.
  const queryClient = useQueryClient();
  const walletQuery = useQuery({
    queryKey: ["wallet", "balance", user?.id ?? ""],
    queryFn: fetchMyWalletBalance,
    enabled: status === "authenticated",
  });
  const walletBalance = walletQuery.data?.balance;

  // ── Guard against duplicate submits ──
  const busyRef = useRef(false);
  const isBusy =
    state === CHECKOUT_STATES.LOADING ||
    state === CHECKOUT_STATES.VALIDATING ||
    state === CHECKOUT_STATES.PAYMENT_INITIALIZING ||
    state === CHECKOUT_STATES.PAYMENT_PENDING;

  // ── State setter enforcing the machine (safe/guarded) ──
  const transitionTo = useCallback((next: CheckoutState) => {
    setStateRaw((current) => {
      const allowed = ALLOWED[current];
      if (allowed && allowed.includes(next)) return next;
      // Fall back to previous for anything we can't fold in.
      return current;
    });
  }, []);

  // ── Active cart lines (exclude saved-for-later) ──
  const activeItems = useMemo(
    () => items.filter((i) => !i.savedForLater) as CartLineItem[],
    [items]
  );

  // Vendor names come from the shared vendor cache; load any that are missing.
  const vendorsLoaded = useEnsureVendors(activeItems.map((i) => i.vendorId));

  // Build/maintain the presentation session from the live cart.
  useEffect(() => {
    if (activeItems.length === 0) {
      setSession(null);
      return;
    }
    setSession(
      createCheckoutSession({
        items: activeItems,
        campusId: selectedCampus.id,
        customerId: user?.id,
      })
    );
  }, [activeItems, selectedCampus.id, user?.id, vendorsLoaded]);

  useEffect(() => {
    if (status === "authenticated" && user) {
      const info = getCustomerInfo(user.id);
      if (!customer.fullName) setCustomer((prev) => ({ ...prev, fullName: info.fullName }));
      if (!customer.email) setCustomer((prev) => ({ ...prev, email: info.email }));
      if (!customer.phone) setCustomer((prev) => ({ ...prev, phone: info.phone }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user?.id]);

  // Default the selected saved address to the "default" one if present.
  useEffect(() => {
    if (selectedAddressId || addresses.length === 0) return;
    const def = addresses.find((a) => a.isDefault) || addresses[0];
    if (def) setSelectedAddressId(def.id);
  }, [addresses, selectedAddressId]);

  // Prefill coin balance from the mock loyalty/wallet data for display only.
  useEffect(() => {
    if (!flags.kampmaxCoinEnabled) return;
    // Balance is display-only; a real app loads it from the backend.
    setCoin((prev) => ({ ...prev, balance: 1250, remainingBalance: 1250 }));
  }, [flags.kampmaxCoinEnabled]);

  // ── Session refresh ──
  const refreshSession = useCallback(() => {
    if (!session) return;
    setSession(getCheckoutSession(session));
  }, [session]);

  // ── Computed: selected address object ──
  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) || null,
    [addresses, selectedAddressId]
  );

  // Fall back to the address contact details when profile details are missing.
  useEffect(() => {
    if (!selectedAddress) return;
    setCustomer((prev) => ({
      ...prev,
      fullName: prev.fullName || selectedAddress.contactName,
      phone: prev.phone || selectedAddress.contactPhone,
    }));
  }, [selectedAddress]);

  // Coming back from Paystack via the browser Back button restores this page
  // mid-payment; reset so the order button is usable again.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      busyRef.current = false;
      setStateRaw((cur) => (cur === CHECKOUT_STATES.PAYMENT_PENDING || cur === CHECKOUT_STATES.PAYMENT_INITIALIZING ? CHECKOUT_STATES.READY : cur));
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);


  const vendorNames = useMemo(() => {
    const names: Record<string, string> = {};
    session?.vendorGroups.forEach((g) => {
      names[g.vendorId] = g.vendorName;
    });
    return names;
  }, [session]);

  // ── Delivery selection per vendor ──
  const selectDeliveryOption = useCallback(
    (vendorId: string, option: VendorDeliveryOption) => {
      if (!session || busyRef.current) return;
      setLoadingVendorId(vendorId);
      const selection: VendorDeliverySelection = {
        vendorId,
        method: option.method,
        optionId: option.id,
        fee: option.fee,
        estimatedDelivery: option.estimatedDelivery,
      };
      void selectDelivery(session, selection).then((res) => {
        setLoadingVendorId(null);
        setSession((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          next.vendorGroups = prev.vendorGroups.map((g) =>
            g.vendorId === vendorId ? { ...g, selectedDelivery: selection } : g
          );
          next.deliveryTotal = next.vendorGroups.reduce(
            (s, g) => s + (g.selectedDelivery?.fee ?? 0),
            0
          );
          next.pricing = {
            ...next.pricing,
            deliveryTotal: next.deliveryTotal,
            finalTotal: finalTotalFor(next),
          };
          void res;
          return next;
        });
        refreshSession();
      });
    },
    [session, refreshSession]
  );

  // ── Campus change: re-validate + reset delivery to defaults ──
  const changeCampus = useCallback(
    (campus: Parameters<typeof setSelectedCampus>[0]) => {
      if (busyRef.current) return;
      setSelectedCampus(campus);
      setErrorInfo(null);
      // Clear per-vendor delivery back to defaults so fees re-resolve for the
      // new campus (display-only). Session rebuilt by the main effect.
      setSession((prev) => {
        if (!prev) return prev;
        const next = { ...prev, campusId: campus.id };
        next.vendorGroups = prev.vendorGroups.map((g) => ({
          ...g,
          selectedDelivery: getDefaultSelectedDelivery(g.vendorId),
        }));
        next.deliveryTotal = 0;
        next.pricing = { ...next.pricing, deliveryTotal: 0, finalTotal: finalTotalFor(next) };
        return next;
      });
    },
    [setSelectedCampus]
  );

  // ── Customer + errors ──
  const setCustomerField = useCallback(
    <K extends keyof CheckoutCustomer>(field: K, value: string) => {
      setCustomer((prev) => ({ ...prev, [field]: value }));
      setCustomerErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    []
  );

  function validateCustomer(): boolean {
    const errs: CustomerErrorBag = {};
    if (!customer.fullName.trim()) errs.fullName = "Enter your full name";
    if (!customer.email.trim()) errs.email = "Enter your email";
    else if (!/^\S+@\S+\.\S+$/.test(customer.email)) errs.email = "Enter a valid email address";
    if (!customer.phone.trim()) errs.phone = "Enter your phone number";
    setCustomerErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Address actions ──
  const addAddress = useCallback(
    async (values: AddressFormValues) => {
      const created = await createAddressMutation.mutateAsync({
        label: values.label,
        address: values.address,
        campusId: values.campusId,
        contactName: values.contactName,
        contactPhone: values.contactPhone,
        notes: values.notes,
        isDefault: values.isDefault,
      });
      setSelectedAddressId(created.id);
    },
    [createAddressMutation]
  );

  const updateAddress = useCallback(
    async (id: string, values: AddressFormValues) => {
      await updateAddressMutation.mutateAsync({
        id,
        patch: {
          label: values.label,
          address: values.address,
          campusId: values.campusId,
          contactName: values.contactName,
          contactPhone: values.contactPhone,
          notes: values.notes,
          isDefault: values.isDefault,
        },
      });
    },
    [updateAddressMutation]
  );

  const deleteAddress = useCallback(
    async (id: string) => {
      await deleteAddressMutation.mutateAsync(id);
      setSelectedAddressId((cur) => (cur === id ? null : cur));
    },
    [deleteAddressMutation]
  );

  const selectAddress = useCallback((addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
  }, []);

  // ── Coupon (no fabricated success; backend required) ──
  const applyCouponCode = useCallback(
    async (code: string) => {
      if (!session || !code.trim() || busyRef.current) return;
      const normalized = code.trim().toUpperCase();
      setCoupon({ code: normalized, status: "loading" });
      const res = await applyCoupon(session, normalized);
      if (res.data) {
        setCoupon(res.data);
      } else if (res.error) {
        setCoupon({
          code: normalized,
          status: "not_applicable",
          message: res.error.message,
        });
      }
    },
    [session]
  );

  const removeCoupon = useCallback(async () => {
    const res = await removeCouponService();
    if (res.data) setCoupon(res.data);
  }, []);

  const toggleUseCoin = useCallback((use: boolean) => {
    setCoin((prev) => ({ ...prev, useCoin: use }));
  }, []);

  const setPayment = useCallback((m: CheckoutPaymentMethod) => {
    setPaymentMethod(m);
  }, []);

  // ── Failure/expiry detection ──
  useEffect(() => {
    if (!session || isBusy) return;
    if (isCheckoutSessionExpired(session)) {
      setErrorInfo({
        code: "session_expired",
        message:
          "Your checkout session has expired. Refresh to continue — your cart is saved.",
      });
      transitionTo(CHECKOUT_STATES.SESSION_EXPIRED);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isBusy]);

  // ── Kick off loading when there are items ──
  useEffect(() => {
    if (state === CHECKOUT_STATES.IDLE && activeItems.length > 0) {
      transitionTo(CHECKOUT_STATES.LOADING);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, activeItems.length]);

  // Simulate the server round-trip for building the presentation session.
  // Kept separate so the LOADING transition doesn't cancel its own timer.
  useEffect(() => {
    if (state !== CHECKOUT_STATES.LOADING) return;
    const t = setTimeout(() => {
      setErrorInfo(null);
      transitionTo(CHECKOUT_STATES.READY);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // ── Place order → full flow ──
  const placeOrder = useCallback(async () => {
    if (busyRef.current || !session) return false;
    if (!validateCustomer()) {
      setErrorInfo({ code: "validation_failed", message: "Please fill in your contact details." });
      setStateRaw((cur) => (cur === CHECKOUT_STATES.READY ? CHECKOUT_STATES.READY : cur));
      return false;
    }
    if (!selectedAddress) {
      setErrorInfo({ code: "validation_failed", message: "Please select or add a delivery address." });
      return false;
    }

    // Catch a short wallet before any order is created.
    if (
      paymentMethod === "wallet" &&
      (walletBalance === undefined || walletBalance < session.pricing.finalTotal)
    ) {
      setErrorInfo({
        code: "insufficient_wallet_balance",
        message: "Your wallet balance is too low for this order. Top up or choose another payment method.",
      });
      return false;
    }

    // Duplicate-submit guard
    if (busyRef.current) return false;
    busyRef.current = true;

    // 1. Server-side validation first
    transitionTo(CHECKOUT_STATES.VALIDATING);
    const vResult = await validateCheckout(session);
    if (!vResult.ok) {
      busyRef.current = false;
      transitionTo(CHECKOUT_STATES.VALIDATION_FAILED);
      setErrorInfo(vResult.error || { message: "We couldn't validate your order." });
      return false;
    }

    // 2. Create order(s) via backend API if user is authenticated
    // One order is created per vendor; a single charge pays for all of them.
    let createdOrderIds: string[] = [];
    if (status === "authenticated") {
      const { data: createdOrders, error: orderErr } = await checkoutOrdersApi({
        address: {
          fullName: customer.fullName || selectedAddress.contactName,
          phone: customer.phone || selectedAddress.contactPhone,
          address: selectedAddress.address || selectedAddress.label,
          city: "Campus Area",
          campus: selectedCampus?.name || selectedAddress.campusId,
          locationNote: selectedAddress.notes,
        },
        deliveryFee: session.pricing.deliveryTotal,
        notes: `Deliver to ${selectedAddress.label}`,
        promotionCode: coupon.status === "valid" ? coupon.code : undefined,
      });

      if (orderErr) {
        // Surface the real reason (e.g. a promo that just expired) instead of
        // failing later with a generic payment error.
        busyRef.current = false;
        transitionTo(CHECKOUT_STATES.VALIDATION_FAILED);
        setErrorInfo({ code: "validation_failed", message: orderErr.message || "We couldn't place your order." });
        return false;
      }

      if (!orderErr && createdOrders && createdOrders.length > 0) {
        createdOrderIds = createdOrders
          .map((o) => o.backendId)
          .filter((id): id is string => !!id);
      }
    }

    // An order only goes through if its payment does: any failure from here
    // on cancels the orders just created (the backend also expires any that
    // slip through, e.g. a closed tab). A paid order cannot be cancelled.
    const failPayment = async (error: CheckoutErrorInfo) => {
      await cancelUnpaidOrders(createdOrderIds);
      busyRef.current = false;
      transitionTo(CHECKOUT_STATES.PAYMENT_FAILED);
      setErrorInfo({
        ...error,
        message: createdOrderIds.length
          ? `${error.message} Your order was not placed and you have not been charged.`
          : error.message,
      });
      return false;
    };

    try {
      // 3a. Wallet: the backend debits the wallet and confirms the orders in
      // one step, so there is no redirect — confirm and head to the order.
      if (paymentMethod === "wallet") {
        transitionTo(CHECKOUT_STATES.PAYMENT_INITIALIZING);
        const walletResult = await payOrdersWithWallet(createdOrderIds);
        void queryClient.invalidateQueries({ queryKey: ["wallet"] });
        if (!walletResult.ok || !walletResult.data) {
          return await failPayment(
            walletResult.error || { message: "We couldn't complete the wallet payment." }
          );
        }
        transitionTo(CHECKOUT_STATES.PAYMENT_PENDING);
        transitionTo(CHECKOUT_STATES.PAYMENT_SUCCESS);
        transitionTo(CHECKOUT_STATES.ORDER_CONFIRMATION);
        clearCart();
        router.replace(`/orders/${walletResult.data.orderId}`);
        return true;
      }

      // 3b. Initialise payment through the service (Paystack)
      transitionTo(CHECKOUT_STATES.PAYMENT_INITIALIZING);
      const initResult = await initializePaystackPayment(
        session,
        createdOrderIds,
        typeof window !== "undefined" ? `${window.location.origin}/checkout/callback` : undefined
      );

      if (!initResult.ok) {
        return await failPayment(initResult.error || { message: "Payment could not be initialized." });
      }

      // Paystack hosted checkout: the customer pays there and returns to
      // /checkout/callback, which verifies the payment with the backend. The cart
      // is only cleared and the order only confirmed after that verification.
      const initData = initResult.data as { reference?: string; authorizationUrl?: string } | undefined;
      if (!initData?.authorizationUrl) {
        return await failPayment({ code: "no_authorization_url", message: "Payment could not be started." });
      }

      transitionTo(CHECKOUT_STATES.PAYMENT_PENDING);
      window.location.assign(initData.authorizationUrl);
      return true;
    } catch (err) {
      return await failPayment({
        message: err instanceof Error && err.message ? err.message : "Payment failed.",
      });
    }
  }, [
    session,
    coupon,
    selectedAddress,
    customer,
    selectedCampus,
    status,
    paymentMethod,
    walletBalance,
    queryClient,
    validateCustomer,
    transitionTo,
    clearCart,
    router,
  ]);

  // The displayed session always reflects the currently applied coupon, so a
  // rebuilt session (cart change, delivery change) can't lose the discount.
  const displaySession = useMemo(
    () =>
      session
        ? withDiscount(session, coupon.status === "valid" ? (coupon.appliedDiscount ?? 0) : 0)
        : session,
    [session, coupon]
  );

  // Re-price an applied code when the cart changes so the shown discount
  // matches what the server will charge.
  const itemsSubtotal = session?.pricing?.itemsSubtotal;
  useEffect(() => {
    if (!session || coupon.status !== "valid") return;
    let cancelled = false;
    void applyCoupon(session, coupon.code).then((res) => {
      if (!cancelled && res.data) setCoupon(res.data);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsSubtotal]);

  // ── Exposed summary helpers ──
  const summaryItemCount = session?.pricing?.itemCount ?? 0;
  const summaryVendorCount = session?.vendorGroups?.length ?? 0;

  return {
    // state machine
    state,
    errorInfo,
    transitionTo,

    // session & summary
    session: displaySession,
    refreshSession,
    flags,

    // customer / form
    customer,
    setCustomerField,
    customerErrors,
    selectedAddress,
    selectedAddressId,
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    selectAddress,

    // campus
    selectedCampus,
    changeCampus,

    // delivery
    loadingVendorId,
    selectDeliveryOption,

    // money features
    coupon,
    applyCouponCode,
    removeCoupon,
    coin,
    toggleUseCoin,
    loyalty,
    paymentMethod,
    setPayment,
    walletBalance,

    // actions
    placeOrder,
    isBusy,

    // derived
    summaryItemCount,
    summaryVendorCount,
    vendorNames,
    isCustomer: status === "authenticated",
  };
}

// Compute the display final total from a session's current line items/delivery,
// using only the same placeholder maths the service uses — never authoritative.
// (local helper so placeOrder and delivery updates stay in sync for display)
function withDiscount(s: CheckoutSession, discount: number): CheckoutSession {
  const next: CheckoutSession = {
    ...s,
    discountTotal: discount,
    pricing: { ...s.pricing, discountTotal: discount },
  };
  next.pricing.finalTotal = finalTotalFor(next);
  next.finalTotal = next.pricing.finalTotal;
  return next;
}

function finalTotalFor(s: CheckoutSession): number {
  // The platform fee is charged to the vendor, never to the customer.
  return Math.max(
    0,
    s.pricing.itemsSubtotal + s.pricing.deliveryTotal - s.pricing.discountTotal
  );
}

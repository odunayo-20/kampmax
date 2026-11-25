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
import { getRefusalMessage } from "@/lib/error-messages";
import type { CartLineItem } from "@/types/cart";
import type { SavedAddress, Campus } from "@/types";
import {
  applyCoupon,
  buildCheckoutSummary,
  getCustomerInfo,
  payOrdersWithWallet,
  startPaystackPayment,
} from "@/services/checkout";
import { checkoutOrdersApi, cancelUnpaidOrders, fetchDeliveryOffers } from "@/services/orders";
import type { AddressFormValues } from "@/components/checkout/AddressForm";
import type {
  CheckoutCustomer,
  CheckoutDeliveryMethod,
  CheckoutPaymentMethod,
  CheckoutPhase,
  CouponState,
} from "@/types/checkout";

type CustomerErrors = Partial<Record<keyof CheckoutCustomer, string>>;

const NO_COUPON: CouponState = { code: "", status: "idle" };

function customerProblems(customer: CheckoutCustomer): CustomerErrors {
  const errors: CustomerErrors = {};
  if (!customer.fullName.trim()) errors.fullName = "Enter your full name";
  if (!customer.email.trim()) errors.email = "Enter your email";
  else if (!/^\S+@\S+\.\S+$/.test(customer.email)) errors.email = "Enter a valid email address";
  if (!customer.phone.trim()) errors.phone = "Enter your phone number";
  return errors;
}

export function useCheckout() {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const { status, user } = useAuth();
  const { selectedCampus, setSelectedCampus } = useApp();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<CheckoutPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  /** Guards against a second submit before `phase` has re-rendered. */
  const busyRef = useRef(false);
  const isBusy = phase === "placing" || phase === "paying" || phase === "leaving";

  // ── Contact details and saved addresses ──
  const [customer, setCustomer] = useState<CheckoutCustomer>({ fullName: "", email: "", phone: "" });
  const [customerErrors, setCustomerErrors] = useState<CustomerErrors>({});
  const addressesQuery = useAddresses();
  const addresses = useMemo<SavedAddress[]>(() => addressesQuery.data ?? [], [addressesQuery.data]);
  const createAddressMutation = useCreateAddress();
  const updateAddressMutation = useUpdateAddress();
  const deleteAddressMutation = useDeleteAddress();
  const [chosenAddressId, setChosenAddressId] = useState<string | null>(null);
  const selectedAddress =
    addresses.find((a) => a.id === chosenAddressId) ??
    addresses.find((a) => a.isDefault) ??
    addresses[0] ??
    null;

  // Fill empty fields from the profile, then from the delivery address.
  const fillCustomer = useCallback((found: Partial<CheckoutCustomer>) => {
    setCustomer((prev) => ({
      fullName: prev.fullName || found.fullName || "",
      email: prev.email || found.email || "",
      phone: prev.phone || found.phone || "",
    }));
  }, []);

  useEffect(() => {
    if (status === "authenticated" && user) fillCustomer(getCustomerInfo(user.id));
  }, [status, user, fillCustomer]);

  useEffect(() => {
    if (!selectedAddress) return;
    fillCustomer({ fullName: selectedAddress.contactName, phone: selectedAddress.contactPhone });
  }, [selectedAddress, fillCustomer]);

  const setCustomerField = useCallback((field: keyof CheckoutCustomer, value: string) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
    setCustomerErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const addAddress = useCallback(
    async (values: AddressFormValues) => {
      const created = await createAddressMutation.mutateAsync(values);
      setChosenAddressId(created.id);
    },
    [createAddressMutation]
  );

  const updateAddress = useCallback(
    async (id: string, values: AddressFormValues) => {
      await updateAddressMutation.mutateAsync({ id, patch: values });
    },
    [updateAddressMutation]
  );

  const deleteAddress = useCallback(
    async (id: string) => {
      await deleteAddressMutation.mutateAsync(id);
    },
    [deleteAddressMutation]
  );

  const selectAddress = useCallback((address: SavedAddress) => {
    setChosenAddressId(address.id);
  }, []);

  // ── Cart, delivery and promo code ──
  const activeItems = useMemo(
    () => items.filter((i) => !i.savedForLater) as CartLineItem[],
    [items]
  );
  // Vendor names come from the shared vendor cache; load any that are missing.
  const vendorsLoaded = useEnsureVendors(activeItems.map((i) => i.vendorId));

  const vendorIds = [...new Set(activeItems.map((i) => i.vendorId))].sort();
  const offersQuery = useQuery({
    queryKey: ["delivery-offers", status, vendorIds],
    queryFn: () => fetchDeliveryOffers(vendorIds),
    enabled: vendorIds.length > 0 && status !== "loading",
  });

  const [deliveryChoices, setDeliveryChoices] = useState<Record<string, CheckoutDeliveryMethod>>({});
  const [coupon, setCoupon] = useState<CouponState>(NO_COUPON);
  const discount = coupon.status === "valid" ? (coupon.appliedDiscount ?? 0) : 0;

  const summary = useMemo(
    () =>
      activeItems.length > 0 && offersQuery.data
        ? buildCheckoutSummary({
            items: activeItems,
            deliveryOffers: offersQuery.data,
            choices: deliveryChoices,
            discount,
          })
        : null,
    // `vendorsLoaded` re-reads the seller names once they arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeItems, offersQuery.data, deliveryChoices, discount, vendorsLoaded]
  );

  const selectDeliveryOption = useCallback((vendorId: string, method: CheckoutDeliveryMethod) => {
    if (busyRef.current) return;
    setDeliveryChoices((prev) => ({ ...prev, [vendorId]: method }));
  }, []);

  /** Delivery goes back to each seller's default on a new campus. */
  const changeCampus = useCallback(
    (campus: Campus) => {
      if (busyRef.current) return;
      setSelectedCampus(campus);
      setDeliveryChoices({});
      setError(null);
    },
    [setSelectedCampus]
  );

  const applyCouponCode = useCallback(async (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized || busyRef.current) return;
    setCoupon({ code: normalized, status: "loading" });
    setCoupon(await applyCoupon(normalized));
  }, []);

  const removeCoupon = useCallback(() => setCoupon(NO_COUPON), []);

  // Re-price an applied code when the cart changes so the shown discount
  // matches what the server will charge.
  const itemsSubtotal = summary?.pricing.itemsSubtotal;
  useEffect(() => {
    if (coupon.status !== "valid") return;
    let cancelled = false;
    void applyCoupon(coupon.code).then((next) => {
      if (!cancelled) setCoupon(next);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsSubtotal]);

  // ── Payment ──
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("paystack");
  // The server remains the authority on whether the balance covers the order.
  const walletQuery = useQuery({
    queryKey: ["wallet", "balance", user?.id ?? ""],
    queryFn: fetchMyWalletBalance,
    enabled: status === "authenticated",
  });
  const walletBalance = walletQuery.data?.balance;

  // Coming back from Paystack via the browser Back button restores this page
  // mid-payment; reset so the order button is usable again.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      busyRef.current = false;
      setPhase("idle");
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  /** What the customer still has to fix before an order can be placed. */
  function blocker(): string | null {
    if (!summary) return "Your cart is still loading.";
    const errors = customerProblems(customer);
    setCustomerErrors(errors);
    if (Object.keys(errors).length > 0) return "Please fill in your contact details.";
    if (!selectedAddress) return "Please select or add a delivery address.";
    const stuck = summary.vendorGroups.find((g) => !g.selectedDelivery);
    if (stuck) {
      return `${stuck.vendorName} isn't offering delivery or pickup right now. Remove their items to continue.`;
    }
    // Catch a short wallet before any order is created.
    if (paymentMethod === "wallet" && (walletBalance === undefined || walletBalance < summary.pricing.finalTotal)) {
      return "Your wallet balance is too low for this order. Top up or choose another payment method.";
    }
    return null;
  }

  function fail(message: string) {
    busyRef.current = false;
    setPhase("failed");
    setError(message);
  }

  /**
   * An order only goes through if its payment does: cancel the orders just
   * created (a paid one is refused, and the backend expires any that slip
   * through, e.g. a closed tab).
   */
  async function abandon(orderIds: string[], cause: unknown) {
    await cancelUnpaidOrders(orderIds);
    // Paystack only charges on its own page, which was never reached. A wallet
    // payment is known not to have happened only if the server refused it.
    const code = (cause as { status?: number } | null)?.status;
    const uncharged = paymentMethod === "paystack" || (code !== undefined && code < 500);
    const reason = getRefusalMessage(cause).replace(/[.!?]?$/, (end) => end || ".");
    fail(
      `${reason} ${
        uncharged
          ? "Your order was not placed and you have not been charged."
          : "Check My Orders before trying again."
      }`
    );
  }

  /** Creates one order per seller, then pays for all of them with a single charge. */
  async function placeOrder() {
    if (busyRef.current) return;
    const problem = blocker();
    if (problem || !summary || !selectedAddress) {
      setError(problem);
      return;
    }
    busyRef.current = true;
    setError(null);
    setPhase("placing");

    let orderIds: string[] = [];
    try {
      const placed = await checkoutOrdersApi({
        address: {
          fullName: customer.fullName,
          phone: customer.phone,
          address: selectedAddress.address || selectedAddress.label,
          city: "Campus Area",
          campus: selectedCampus.name || selectedAddress.campusId,
          locationNote: selectedAddress.notes,
        },
        // The server prices delivery from each seller's settings.
        deliveries: summary.vendorGroups.flatMap((g) =>
          g.selectedDelivery ? [{ vendorId: g.vendorId, method: g.selectedDelivery.method }] : []
        ),
        notes: `Deliver to ${selectedAddress.label}`,
        promotionCode: coupon.status === "valid" ? coupon.code : undefined,
      });
      orderIds = placed.data.flatMap((o) => (o.backendId ? [o.backendId] : []));
      // The server's own reason (e.g. a promo that just expired) is shown.
      if (placed.error || orderIds.length === 0) {
        fail(getRefusalMessage(placed.error));
        return;
      }

      setPhase("paying");

      // Wallet: confirmed in one step, so there is no redirect to Paystack.
      if (paymentMethod === "wallet") {
        const paid = await payOrdersWithWallet(orderIds);
        void queryClient.invalidateQueries({ queryKey: ["wallet"] });
        if (!paid.data) return await abandon(orderIds, paid.error);
        setPhase("leaving");
        clearCart();
        router.replace(`/orders/${paid.data}`);
        return;
      }

      // Paystack: the customer pays on its page and returns to /checkout/callback,
      // which verifies the payment before the cart is cleared.
      const started = await startPaystackPayment(orderIds, `${window.location.origin}/checkout/callback`);
      if (!started.data) return await abandon(orderIds, started.error);
      setPhase("leaving");
      window.location.assign(started.data);
    } catch (err) {
      await abandon(orderIds, err);
    }
  }

  return {
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
    isCustomer: status === "authenticated",
  };
}

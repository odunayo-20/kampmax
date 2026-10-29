import { describe, it, expect } from "vitest";
import { buildVendorDeliveryOptions, pickDefaultDelivery } from "@/services/checkout";
import type { VendorDeliveryOffer } from "@/types/checkout";

const offer = (o: Partial<VendorDeliveryOffer> = {}): VendorDeliveryOffer => ({
  vendorId: "v1",
  deliveryAvailable: false,
  pickupAvailable: true,
  prepTimeMinutes: 30,
  deliveryFee: 0,
  pickupLocation: null,
  ...o,
});
const byMethod = (opts: ReturnType<typeof buildVendorDeliveryOptions>) =>
  Object.fromEntries(opts.map((o) => [o.method, o]));

describe("vendor delivery options", () => {
  it("hides delivery when the vendor turned it off, with a reason", () => {
    const o = byMethod(buildVendorDeliveryOptions("v1", offer()));
    expect(o.campus_delivery.state).toBe("unavailable");
    expect(o.campus_delivery.message).toMatch(/doesn't offer delivery/);
    expect(o.campus_pickup.state).toBe("available");
  });

  it("uses the vendor's own fee and prep time for delivery", () => {
    const o = byMethod(
      buildVendorDeliveryOptions("v1", offer({ deliveryAvailable: true, deliveryFee: 750, prepTimeMinutes: 45 }))
    );
    expect(o.campus_delivery).toMatchObject({ state: "available", fee: 750 });
    expect(o.campus_delivery.estimatedDelivery).toContain("45");
    expect(o.campus_pickup.fee).toBe(0);
  });

  it("disables both pickup methods when pickup is off", () => {
    const o = byMethod(buildVendorDeliveryOptions("v1", offer({ pickupAvailable: false, deliveryAvailable: true })));
    expect(o.campus_pickup.state).toBe("unavailable");
    expect(o.vendor_pickup.state).toBe("unavailable");
  });

  it("tells the buyer where to collect for vendor pickup", () => {
    const at = byMethod(buildVendorDeliveryOptions("v1", offer({ pickupLocation: "Block B gate" })));
    expect(at.vendor_pickup.estimatedDelivery).toBe("Collect at Block B gate");
    const none = byMethod(buildVendorDeliveryOptions("v1", offer()));
    expect(none.vendor_pickup.estimatedDelivery).toMatch(/confirm/);
  });

  it("only offers pickup when the settings couldn't be loaded", () => {
    const o = byMethod(buildVendorDeliveryOptions("v1"));
    expect(o.campus_delivery.state).toBe("unavailable");
    expect(o.campus_pickup.state).toBe("available");
  });

  it("defaults to free pickup, then delivery, then nothing", () => {
    const pick = (x: Partial<VendorDeliveryOffer>) =>
      pickDefaultDelivery("v1", buildVendorDeliveryOptions("v1", offer(x)));
    expect(pick({ deliveryAvailable: true, deliveryFee: 500 })).toMatchObject({ method: "campus_pickup", fee: 0 });
    expect(pick({ pickupAvailable: false, deliveryAvailable: true, deliveryFee: 500 })).toMatchObject({
      method: "campus_delivery",
      fee: 500,
    });
    expect(pick({ pickupAvailable: false })).toBeNull();
  });
});

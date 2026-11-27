import { describe, expect, it } from "vitest";
import {
  locationName, nextServiceStatus, SERVICE_STATUS_NAME, servicePriceLabel, servicesSummary, UNVERIFIED_SERVICES_NOTE,
} from "./provider-services";

describe("provider services list", () => {
  it("names the three states the way the app does", () => {
    expect(SERVICE_STATUS_NAME).toEqual({ active: "Live", inactive: "Paused", draft: "Draft" });
    expect(nextServiceStatus("active")).toEqual({ to: "inactive", label: "Pause" });
    expect(nextServiceStatus("draft")).toEqual({ to: "active", label: "Make live" });
  });

  it("shows hourly and negotiable prices for what they are", () => {
    expect(servicePriceLabel({ pricingModel: "hourly", price: 3000 })).toBe("₦3,000 / hour");
    expect(servicePriceLabel({ pricingModel: "quote", price: 0 })).toBe("Negotiable");
    expect(servicePriceLabel({ pricingModel: "starting_from", price: 5000 })).toBe("From ₦5,000");
    expect(servicePriceLabel({ pricingModel: "fixed", price: 5000 })).toBe("₦5,000");
  });

  it("uses the backend's place names and says who can see a live service", () => {
    expect(locationName("provider_location")).toBe("On campus");
    expect(locationName("customer_location")).toBe("Off campus");
    expect(locationName("online")).toBe("Remote");
    expect(servicesSummary(2, 5)).toBe("2 of 5 live. Paused and draft services are hidden from customers.");
    expect(UNVERIFIED_SERVICES_NOTE).toMatch(/once Kampmax verifies your profile/);
  });
});

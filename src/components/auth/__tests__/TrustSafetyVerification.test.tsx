// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PasswordStrengthMeter } from "../PasswordStrengthMeter";
import {
  NigerianPhoneInput,
  detectNigerianCarrier,
  normalizeNigerianPhone,
  formatPhoneDisplay,
} from "../NigerianPhoneInput";
import { CampusSafetyAgreement } from "../CampusSafetyAgreement";

afterEach(() => {
  cleanup();
});

describe("PasswordStrengthMeter", () => {
  it("renders nothing when password is empty", () => {
    const { container } = render(<PasswordStrengthMeter password="" />);
    expect(container.firstChild).toBeNull();
  });

  it("identifies a weak password and renders checklist failures", () => {
    render(<PasswordStrengthMeter password="abc" />);

    expect(screen.getByText(/Password strength:/i)).toBeTruthy();
    expect(screen.getByText("Weak")).toBeTruthy();
    expect(screen.getByText("8+ characters")).toBeTruthy();
  });

  it("identifies a strong password meeting all criteria", () => {
    render(<PasswordStrengthMeter password="StrongPassword123!" />);

    expect(screen.getByText("Strong")).toBeTruthy();
  });

  it("shows passwords match when confirm password matches", () => {
    render(
      <PasswordStrengthMeter
        password="PassWord1!"
        confirmPassword="PassWord1!"
      />
    );

    expect(screen.getByText("Passwords match")).toBeTruthy();
  });

  it("shows passwords do not match when confirm password differs", () => {
    render(
      <PasswordStrengthMeter
        password="PassWord1!"
        confirmPassword="DifferentPass"
      />
    );

    expect(screen.getByText("Passwords do not match yet")).toBeTruthy();
  });
});

describe("NigerianPhoneInput & Utils", () => {
  it("detects MTN carriers accurately", () => {
    expect(detectNigerianCarrier("08031234567").carrier).toBe("MTN");
    expect(detectNigerianCarrier("08141234567").carrier).toBe("MTN");
    expect(detectNigerianCarrier("09061234567").carrier).toBe("MTN");
  });

  it("detects Airtel carriers accurately", () => {
    expect(detectNigerianCarrier("08021234567").carrier).toBe("Airtel");
    expect(detectNigerianCarrier("07081234567").carrier).toBe("Airtel");
  });

  it("detects Glo carriers accurately", () => {
    expect(detectNigerianCarrier("08051234567").carrier).toBe("Glo");
    expect(detectNigerianCarrier("07051234567").carrier).toBe("Glo");
  });

  it("detects 9mobile carriers accurately", () => {
    expect(detectNigerianCarrier("08091234567").carrier).toBe("9mobile");
  });

  it("normalizes phone numbers to standard E.164 (+234...)", () => {
    expect(normalizeNigerianPhone("08031234567")).toBe("+2348031234567");
    expect(normalizeNigerianPhone("8031234567")).toBe("+2348031234567");
    expect(normalizeNigerianPhone("+2348031234567")).toBe("+2348031234567");
  });

  it("formats display numbers with readable spaces", () => {
    expect(formatPhoneDisplay("08031234567")).toBe("0803 123 4567");
  });

  it("renders input with Nigerian country code badge and handles user typing", () => {
    const onChange = vi.fn();
    render(<NigerianPhoneInput value="" onChange={onChange} />);

    expect(screen.getByText("+234")).toBeTruthy();
    expect(screen.getByText("🇳🇬")).toBeTruthy();

    const input = screen.getByPlaceholderText("0801 234 5678");
    fireEvent.change(input, { target: { value: "08031234567" } });

    expect(onChange).toHaveBeenCalledWith("+2348031234567", "0803 123 4567");
  });
});

describe("CampusSafetyAgreement", () => {
  it("renders checkbox and terms label", () => {
    const onChange = vi.fn();
    render(<CampusSafetyAgreement agreed={false} onChange={onChange} />);

    expect(screen.getByText(/Kampmax Terms of Service/i)).toBeTruthy();
    expect(screen.getByText(/Campus Trust & Safety Charter/i)).toBeTruthy();
  });

  it("opens the Safety Charter modal when clicked", () => {
    const onChange = vi.fn();
    render(<CampusSafetyAgreement agreed={false} onChange={onChange} />);

    const charterButton = screen.getByText(/Campus Trust & Safety Charter/i);
    fireEvent.click(charterButton);

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(
      screen.getByText("Designated Public Pickup Zones", { exact: false })
    ).toBeTruthy();
    expect(
      screen.getByText("In-App Escrow Protection", { exact: false })
    ).toBeTruthy();
  });

  it("displays validation error when provided", () => {
    render(
      <CampusSafetyAgreement
        agreed={false}
        onChange={vi.fn()}
        error="You must agree to the Terms"
      />
    );

    expect(screen.getByText("You must agree to the Terms")).toBeTruthy();
  });
});

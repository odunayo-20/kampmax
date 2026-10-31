// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ApplicationReceived } from "../ApplicationReceived";

afterEach(cleanup);

describe("ApplicationReceived", () => {
  it("tells a new provider they are not live yet, and what happens next", () => {
    render(<ApplicationReceived state="pending" name="Ada Repairs" />);

    expect(screen.getByRole("heading", { name: "Application received" })).toBeTruthy();
    expect(screen.getByText(/thanks, ada repairs/i)).toBeTruthy();
    expect(screen.getByText(/appear to customers once you're approved/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /what happens next/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /while you wait/i })).toBeTruthy();
  });

  it("offers useful things to do while waiting, and the dashboard", () => {
    render(<ApplicationReceived state="pending" />);

    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/service-provider/portfolio",
        "/service-provider/services",
        "/service-provider/availability",
        "/service-provider",
      ])
    );
  });

  it("makes no promise about how long review takes", () => {
    const { container } = render(<ApplicationReceived state="pending" />);

    expect(container.textContent).not.toMatch(/\b\d+\s*(hours?|days?|business days?|minutes?)\b/i);
    expect(container.textContent).not.toMatch(/within|shortly|soon|immediately/i);
  });

  it("works without a name", () => {
    render(<ApplicationReceived state="pending" />);
    expect(screen.getByText(/^Thanks\./)).toBeTruthy();
  });

  it("congratulates an approved provider and points to the dashboard", () => {
    render(<ApplicationReceived state="approved" />);

    expect(screen.getByRole("heading", { name: /you're approved/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /go to your dashboard/i }).getAttribute("href")).toBe(
      "/service-provider"
    );
    expect(screen.queryByRole("heading", { name: /what happens next/i })).toBeNull();
  });

  it("sends someone with no application back to start one", () => {
    render(<ApplicationReceived state="missing" />);

    expect(screen.getByRole("heading", { name: /couldn't find your application/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /go to your application/i }).getAttribute("href")).toBe(
      "/onboarding/service-provider/1"
    );
  });
});

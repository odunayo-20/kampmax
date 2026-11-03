// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mutate = vi.fn();
vi.mock("@/hooks/use-offers", () => ({
  useCreateOffer: () => ({ mutate, isPending: false }),
}));

import { SendOfferModal } from "../SendOfferModal";

afterEach(cleanup);
beforeEach(() => {
  mutate.mockReset();
});

function renderModal() {
  const onClose = vi.fn();
  render(<SendOfferModal conversationId="c1" onClose={onClose} />);
  return { onClose };
}

/** Fills the plain offer fields: a ₦50,000 landing-page offer. */
function fillBasics() {
  fireEvent.change(screen.getByLabelText("What will you deliver?"), { target: { value: "Landing page design" } });
  fireEvent.change(screen.getByLabelText("Scope and terms"), { target: { value: "Three sections, two revisions." } });
  fireEvent.change(screen.getByLabelText("Price (₦)"), { target: { value: "50000" } });
}

const send = () => fireEvent.click(screen.getByRole("button", { name: "Send offer" }));
const sent = () => mutate.mock.calls[0][0] as Record<string, unknown>;

describe("SendOfferModal", () => {
  it("sends a plain offer as one payment, with no plan", () => {
    renderModal();
    fillBasics();
    send();

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(sent()).toMatchObject({ conversationId: "c1", title: "Landing page design", amount: 50000, milestones: [] });
  });

  it("keeps the delivery estimate to 1–365 whole days, now that the browser's own check is off", () => {
    renderModal();
    fillBasics();
    const days = screen.getByLabelText("Delivery (days)");
    const button = screen.getByRole("button", { name: "Send offer" }) as HTMLButtonElement;

    for (const bad of ["0", "366", "2.5"]) {
      fireEvent.change(days, { target: { value: bad } });
      expect(button.disabled).toBe(true);
      expect(screen.getByText("Use a whole number from 1 to 365.")).toBeTruthy();
    }
    fireEvent.change(days, { target: { value: "14" } });
    expect(button.disabled).toBe(false);
    fireEvent.change(days, { target: { value: "" } });
    expect(button.disabled).toBe(false);
  });

  describe("with a payment plan", () => {
    const switchOn = () => fireEvent.click(screen.getByRole("checkbox", { name: "Use milestones" }));
    const fillRow = (index: number, title: string, amount: string, due = "") => {
      fireEvent.change(screen.getAllByLabelText("Title")[index], { target: { value: title } });
      fireEvent.change(screen.getAllByLabelText("Amount (₦)")[index], { target: { value: amount } });
      if (due) fireEvent.change(screen.getAllByLabelText("Due date (optional)")[index], { target: { value: due } });
    };

    it("sends the milestones, with their due dates, when they add up to the price", () => {
      renderModal();
      fillBasics();
      switchOn();
      fillRow(0, "Design", "20000", "2099-01-10");
      fillRow(1, "Build", "30000");
      send();

      expect(mutate).toHaveBeenCalledTimes(1);
      expect(sent().milestones).toEqual([
        { title: "Design", description: undefined, amount: 20000, dueDate: "2099-01-10" },
        { title: "Build", description: undefined, amount: 30000, dueDate: undefined },
      ]);
    });

    it("does not send a plan that does not add up, and says by how much", () => {
      renderModal();
      fillBasics();
      switchOn();
      fillRow(0, "Design", "20000");
      fillRow(1, "Build", "20000");
      send();

      expect(mutate).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toMatch(/₦10,000 of ₦50,000 is not assigned/);
    });

    it("does not send a milestone that is missing its title", () => {
      renderModal();
      fillBasics();
      switchOn();
      fillRow(0, "", "20000");
      fillRow(1, "Build", "30000");
      send();

      expect(mutate).not.toHaveBeenCalled();
      expect(screen.getByText("Give this milestone a title.")).toBeTruthy();
    });

    it("does not send a due date in the past", () => {
      renderModal();
      fillBasics();
      switchOn();
      fillRow(0, "Design", "20000", "2020-01-01");
      fillRow(1, "Build", "30000");
      send();

      expect(mutate).not.toHaveBeenCalled();
      expect(screen.getByText("Pick today or a later date.")).toBeTruthy();
    });

    it("checks the plan against the price as it stands now", () => {
      renderModal();
      fillBasics();
      switchOn();
      fillRow(0, "Design", "20000");
      fillRow(1, "Build", "30000");
      // The freelancer changes the price after planning: the plan no longer adds up.
      fireEvent.change(screen.getByLabelText("Price (₦)"), { target: { value: "60000" } });
      send();

      expect(mutate).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toMatch(/₦10,000 of ₦60,000 is not assigned/);
    });
  });
});

describe("an hourly offer", () => {
  const chooseHourly = () => fireEvent.click(screen.getByRole("radio", { name: "By the hour" }));
  const rate = () => screen.getByLabelText("Rate (₦ per hour)") as HTMLInputElement;
  const weekly = () => screen.getByLabelText("Most hours per week") as HTMLInputElement;
  const fillText = () => {
    fireEvent.change(screen.getByLabelText("What will you deliver?"), { target: { value: "Ongoing web work" } });
    fireEvent.change(screen.getByLabelText("Scope and terms"), { target: { value: "Fixes and features, billed hourly." } });
  };
  const button = () => screen.getByRole("button", { name: "Send offer" }) as HTMLButtonElement;

  it("starts as a fixed price, and offers to be paid by the hour instead", () => {
    renderModal();
    expect((screen.getByRole("radio", { name: "Fixed price" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByLabelText("Rate (₦ per hour)")).toBeNull();
    expect(screen.getByLabelText("Price (₦)")).toBeTruthy();
  });

  it("swaps the price for a rate and a weekly limit, and drops the milestone plan", () => {
    renderModal();
    chooseHourly();

    expect(rate()).toBeTruthy();
    expect(weekly()).toBeTruthy();
    expect(screen.queryByLabelText("Price (₦)")).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Use milestones" })).toBeNull();
  });

  it("says how the money moves, and the most a week can cost, once the terms are valid", () => {
    renderModal();
    chooseHourly();
    fireEvent.change(rate(), { target: { value: "3000" } });
    fireEvent.change(weekly(), { target: { value: "20" } });

    expect(screen.getByText(/A week can cost up to ₦60,000/)).toBeTruthy();
    expect(screen.getByText(/paid for the hours they\s+approve; whatever is not used goes back to them/)).toBeTruthy();
  });

  it("sends the rate and the weekly limit, and no price or milestones", () => {
    renderModal();
    fillText();
    chooseHourly();
    fireEvent.change(rate(), { target: { value: "3000" } });
    fireEvent.change(weekly(), { target: { value: "20" } });
    fireEvent.click(button());

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(sent()).toMatchObject({
      conversationId: "c1",
      title: "Ongoing web work",
      paymentType: "HOURLY",
      hourlyRate: 3000,
      weeklyHourLimit: 20,
    });
    // The week's maximum is the backend's to work out, from the rate and the limit.
    expect("amount" in sent()).toBe(false);
    expect("milestones" in sent()).toBe(false);
  });

  it("cannot be sent until the rate and the weekly limit are valid", () => {
    renderModal();
    fillText();
    chooseHourly();
    expect(button().disabled).toBe(true);

    fireEvent.change(rate(), { target: { value: "3000" } });
    expect(button().disabled).toBe(true);
    fireEvent.change(weekly(), { target: { value: "20" } });
    expect(button().disabled).toBe(false);
  });

  it("explains a rate that is too low or a limit that is too high, once they are typed", () => {
    renderModal();
    chooseHourly();
    expect(screen.queryByText(/Enter a rate from/)).toBeNull();

    fireEvent.change(rate(), { target: { value: "50" } });
    fireEvent.change(weekly(), { target: { value: "100" } });

    expect(screen.getByText(/Enter a rate from ₦100 to ₦1,000,000 an hour/)).toBeTruthy();
    expect(screen.getByText(/whole number of hours from 1 to 60/)).toBeTruthy();
  });

  it("does not claim a weekly maximum until the terms make sense", () => {
    renderModal();
    chooseHourly();
    fireEvent.change(rate(), { target: { value: "50" } });
    fireEvent.change(weekly(), { target: { value: "20" } });
    expect(screen.queryByText(/A week can cost up to/)).toBeNull();
  });

  it("goes back to a fixed price, with its plan editor, if the freelancer changes their mind", () => {
    renderModal();
    chooseHourly();
    fireEvent.click(screen.getByRole("radio", { name: "Fixed price" }));

    expect(screen.getByLabelText("Price (₦)")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Use milestones" })).toBeTruthy();
    expect(screen.queryByLabelText("Rate (₦ per hour)")).toBeNull();
  });

  it("does not send a milestone plan that was started before switching to hourly", () => {
    renderModal();
    fillText();
    fireEvent.click(screen.getByRole("checkbox", { name: "Use milestones" }));
    chooseHourly();
    fireEvent.change(rate(), { target: { value: "3000" } });
    fireEvent.change(weekly(), { target: { value: "10" } });
    fireEvent.click(button());

    expect(mutate).toHaveBeenCalledTimes(1);
    expect("milestones" in sent()).toBe(false);
  });

  it("does not send hourly terms that were typed before switching back to a fixed price", () => {
    renderModal();
    fillBasics();
    chooseHourly();
    fireEvent.change(rate(), { target: { value: "3000" } });
    fireEvent.change(weekly(), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("radio", { name: "Fixed price" }));
    send();

    expect(sent()).toMatchObject({ amount: 50000 });
    expect("paymentType" in sent()).toBe(false);
    expect("hourlyRate" in sent()).toBe(false);
  });
});

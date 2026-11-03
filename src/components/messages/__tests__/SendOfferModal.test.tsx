// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mutate = vi.fn();
vi.mock("@/hooks/use-offers", () => ({
  useCreateOffer: () => ({ mutate, isPending: false }),
}));

import { SendOfferModal } from "../SendOfferModal";

afterEach(cleanup);
beforeEach(() => mutate.mockReset());

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

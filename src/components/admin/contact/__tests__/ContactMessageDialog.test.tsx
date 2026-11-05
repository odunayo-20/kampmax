// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AdminContactMessage } from "@/types/contact-messages";

const handledMutate = vi.fn();
const deleteMutate = vi.fn();
vi.mock("@/hooks/admin/use-admin-contact-messages", () => ({
  useSetContactHandled: () => ({ mutate: handledMutate, isPending: false }),
  useDeleteContactMessage: () => ({ mutate: deleteMutate, isPending: false }),
}));

import { ContactMessageDialog, replyHref } from "../ContactMessageDialog";

const message = (over: Partial<AdminContactMessage> = {}): AdminContactMessage => ({
  id: "m1",
  name: "Ada Obi",
  email: "ada@x.test",
  inquiryType: "vendor",
  inquiryLabel: "Vendor inquiry",
  organization: "Ada & Sons",
  phone: "+234 801 234 5678",
  message: "First line.\n\n<img src=x onerror=alert(1)> second.",
  status: "NEW",
  handledAt: null,
  handledByName: null,
  emailed: true,
  createdAt: "2026-11-05T10:00:00.000Z",
  ...over,
});

beforeEach(() => {
  handledMutate.mockReset();
  deleteMutate.mockReset();
});
afterEach(cleanup);

describe("ContactMessageDialog", () => {
  it("renders nothing without a message", () => {
    const { container } = render(<ContactMessageDialog message={null} onClose={vi.fn()} />);

    expect(container.innerHTML).toBe("");
  });

  it("shows the sender and shows what they typed as plain text, never as markup", () => {
    render(<ContactMessageDialog message={message()} onClose={vi.fn()} />);

    expect(screen.getByText("Ada Obi")).toBeTruthy();
    expect(screen.getByText("Ada & Sons")).toBeTruthy();
    expect(screen.getByRole("link", { name: "+234 801 234 5678" }).getAttribute("href")).toBe(
      "tel:+234 801 234 5678"
    );
    const text = screen.getByTestId("contact-message-text");
    expect(text.textContent).toContain("<img src=x onerror=alert(1)> second.");
    expect(text.querySelector("img")).toBeNull();
  });

  it("opens a reply in the admin's own mail app, addressed to the sender", () => {
    render(<ContactMessageDialog message={message()} onClose={vi.fn()} />);

    const href = screen.getByRole("link", { name: /reply by email/i }).getAttribute("href");
    expect(href).toBe(replyHref(message()));
    expect(href).toMatch(/^mailto:ada@x\.test\?subject=Re%3A/);
  });

  it("marks a waiting message handled, then closes", () => {
    const onClose = vi.fn();
    handledMutate.mockImplementation((_vars, opts: { onSuccess: () => void }) => opts.onSuccess());
    render(<ContactMessageDialog message={message()} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /mark handled/i }));

    expect(handledMutate).toHaveBeenCalledWith({ id: "m1", handled: true }, expect.anything());
    expect(onClose).toHaveBeenCalled();
  });

  it("offers to reopen a handled message and says who handled it", () => {
    render(
      <ContactMessageDialog
        message={message({ status: "HANDLED", handledAt: "2026-11-06T09:00:00.000Z", handledByName: "Chi Eze" })}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/by Chi Eze/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /reopen/i }));
    expect(handledMutate).toHaveBeenCalledWith({ id: "m1", handled: false }, expect.anything());
  });

  it("shows the failure and stays open when the update fails", () => {
    const onClose = vi.fn();
    handledMutate.mockImplementation((_vars, opts: { onError: (e: Error) => void }) =>
      opts.onError(new Error("That message no longer exists."))
    );
    render(<ContactMessageDialog message={message()} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /mark handled/i }));

    expect(screen.getByRole("alert").textContent).toContain("no longer exists");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("only deletes after the confirmation", () => {
    const onClose = vi.fn();
    deleteMutate.mockImplementation((_id, opts: { onSuccess: () => void }) => opts.onSuccess());
    render(<ContactMessageDialog message={message()} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(deleteMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /delete message/i }));
    expect(deleteMutate).toHaveBeenCalledWith("m1", expect.anything());
    expect(onClose).toHaveBeenCalled();
  });

  it("warns when the team inbox was never emailed", () => {
    render(<ContactMessageDialog message={message({ emailed: false })} onClose={vi.fn()} />);

    expect(screen.getByText(/never emailed about this one/i)).toBeTruthy();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<ContactMessageDialog message={message()} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });
});

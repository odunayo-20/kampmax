// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RequestChangesDialog } from "../RequestChangesDialog";
import type { Revisions } from "@/lib/revisions";

afterEach(cleanup);

const left = (remaining: number): Revisions => ({ allowed: 3, used: 3 - remaining, remaining, requests: [] });

function open(revisions: Revisions, props: Partial<React.ComponentProps<typeof RequestChangesDialog>> = {}) {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  render(
    <RequestChangesDialog revisions={revisions} busy={false} error={null} onSubmit={onSubmit} onClose={onClose} {...props} />
  );
  return { onSubmit, onClose };
}

const choose = (name: RegExp) => fireEvent.click(screen.getByRole("radio", { name }));
const write = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const send = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

describe("RequestChangesDialog", () => {
  it("says how many revisions are used and what each choice does to them", () => {
    open(left(2));
    expect(screen.getByText(/1 of 3 revisions used/)).toBeTruthy();
    expect(screen.getByText(/uses 1 of your 2 remaining revisions/)).toBeTruthy();
    expect(screen.getByText(/doesn't use a revision/)).toBeTruthy();
    expect(screen.getByText(/isn't a revision and doesn't send the work back/)).toBeTruthy();
  });

  it("starts on an ordinary change and sends it with the note, trimmed", () => {
    const { onSubmit } = open(left(3));
    expect((screen.getByRole("radio", { name: /A change to the work/ }) as HTMLInputElement).checked).toBe(true);

    write("What needs to change?", "  Use the green logo  ");
    send("Send request");
    expect(onSubmit).toHaveBeenCalledWith("CHANGES", "Use the green logo");
  });

  it("sends a mistake report as FIX, with its own wording", () => {
    const { onSubmit } = open(left(3));
    choose(/A mistake or something missing/);
    write("What is wrong or missing?", "The contact form does not send");
    send("Report it");
    expect(onSubmit).toHaveBeenCalledWith("FIX", "The contact form does not send");
  });

  it("sends extra work as NEW_SCOPE, and says it is not a revision", () => {
    const { onSubmit } = open(left(3));
    choose(/Something new/);
    write("What would you like added?", "A blog section");
    send("Ask for extra work");
    expect(onSubmit).toHaveBeenCalledWith("NEW_SCOPE", "A blog section");
  });

  it("waits for a real note before anything can be sent", () => {
    const { onSubmit } = open(left(3));
    const button = screen.getByRole("button", { name: "Send request" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    write("What needs to change?", "no");
    expect(button.disabled).toBe(true);
    write("What needs to change?", "      ");
    expect(button.disabled).toBe(true);
    fireEvent.submit(button.closest("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
    write("What needs to change?", "Make it bigger");
    expect(button.disabled).toBe(false);
  });

  describe("with every revision used", () => {
    it("closes ordinary changes, and starts on reporting a mistake instead", () => {
      open(left(0));
      const change = screen.getByRole("radio", { name: /A change to the work/ }) as HTMLInputElement;
      expect(change.disabled).toBe(true);
      expect(change.checked).toBe(false);
      expect((screen.getByRole("radio", { name: /A mistake or something missing/ }) as HTMLInputElement).checked).toBe(true);
      expect(screen.getByText(/used all 3 revisions, so ordinary changes are closed/)).toBeTruthy();
    });

    it("says what is still possible, and offers support", () => {
      open(left(0));
      expect(screen.getByText(/you are not stuck/)).toBeTruthy();
      expect(screen.getByRole("link", { name: "Contact support" }).getAttribute("href")).toBe(
        "/support/new?subject=Help%20with%20a%20delivery"
      );
    });

    it("still lets a mistake be reported", () => {
      const { onSubmit } = open(left(0));
      write("What is wrong or missing?", "The checkout page is broken");
      send("Report it");
      expect(onSubmit).toHaveBeenCalledWith("FIX", "The checkout page is broken");
    });

    it("cannot send an ordinary change even if the closed choice is forced open and the form submitted", () => {
      const { onSubmit } = open(left(0));
      const change = screen.getByRole("radio", { name: /A change to the work/ }) as HTMLInputElement;
      change.disabled = false;
      fireEvent.click(change);
      write("What needs to change?", "Please change the colours");
      fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it("shows the backend's refusal and keeps what was typed", () => {
    open(left(3), { error: "Only submitted work can be sent back for changes" });
    write("What needs to change?", "Make it bigger");
    expect(screen.getByRole("alert").textContent).toContain("Only submitted work");
    expect((screen.getByLabelText("What needs to change?") as HTMLTextAreaElement).value).toBe("Make it bigger");
  });

  it("locks the form while it is sending, and ignores Escape until it is done", () => {
    const { onClose } = open(left(3), { busy: true });
    expect((screen.getByRole("button", { name: "Working…" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("What needs to change?") as HTMLTextAreaElement).disabled).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on Escape and on Go back", () => {
    const { onClose } = open(left(3));
    fireEvent.keyDown(document, { key: "Escape" });
    send("Go back");
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

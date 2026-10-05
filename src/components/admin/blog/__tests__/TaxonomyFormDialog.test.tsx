// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TaxonomyFormDialog } from "../TaxonomyFormDialog";
import { BlogApiValidationError } from "@/services/admin/blog-management.api";

afterEach(cleanup);

const initial = { name: "", slug: "", description: "", isActive: true };

function setup(onSubmit = vi.fn().mockResolvedValue(undefined), onClose = vi.fn()) {
  render(<TaxonomyFormDialog noun="tag" mode="create" initial={initial} onSubmit={onSubmit} onClose={onClose} />);
  return { onSubmit, onClose };
}

describe("TaxonomyFormDialog", () => {
  it("is an accessible modal with focus on the first field", () => {
    setup();
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(screen.getByLabelText("Name"));
  });

  it("blocks submit until the name is valid", () => {
    setup();
    const submit = screen.getByRole("button", { name: "Create" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Scholarships" } });
    expect(submit.disabled).toBe(false);
  });

  it("rejects an invalid slug", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Scholarships" } });
    fireEvent.change(screen.getByLabelText("URL slug"), { target: { value: "bad slug!" } });
    expect(screen.getByRole("alert").textContent).toMatch(/lowercase letters/i);
    expect((screen.getByRole("button", { name: "Create" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("submits trimmed values", async () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  Scholarships  " } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: "Scholarships", slug: "", isActive: true });
  });

  it("keeps the dialog open and the input intact when the server rejects it", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('A tag named "Scholarships" already exists.'));
    const { onClose } = setup(onSubmit);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Scholarships" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/already exists/));
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Scholarships");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("lists every validation message from the server", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new BlogApiValidationError(["name too short", "slug invalid"]));
    setup(onSubmit);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ab" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
  });

  it("closes on Escape", () => {
    const { onClose } = setup();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

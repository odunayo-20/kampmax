// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DocumentViewerDialog } from "../accommodation/DocumentViewerDialog";

afterEach(cleanup);

const createObjectURL = vi.fn(() => "blob:private-file");
const revokeObjectURL = vi.fn();

beforeEach(() => {
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });
});

const file = (type: string, filename: string | null = "id.png") => ({
  blob: new Blob(["x"], { type }),
  filename,
});

describe("DocumentViewerDialog", () => {
  it("renders nothing, and fetches nothing, while closed", () => {
    const load = vi.fn();
    const { container } = render(<DocumentViewerDialog open={false} title="Identity" load={load} onClose={() => {}} />);
    expect(container.innerHTML).toBe("");
    expect(load).not.toHaveBeenCalled();
  });

  it("shows a loading state, then the image from an object URL", async () => {
    const load = vi.fn().mockResolvedValue(file("image/png"));
    render(<DocumentViewerDialog open title="Identity" load={load} onClose={() => {}} />);
    expect(screen.getByText(/Opening the document/)).toBeTruthy();
    const img = await screen.findByRole("img", { name: "Identity" });
    expect(img.getAttribute("src")).toBe("blob:private-file");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("tells the admin the file is private and that viewing is recorded", async () => {
    render(<DocumentViewerDialog open title="Identity" load={() => Promise.resolve(file("image/png"))} onClose={() => {}} />);
    expect(screen.getByText(/Viewing is recorded in the audit log/)).toBeTruthy();
    await screen.findByRole("img");
  });

  it("shows a PDF in a frame", async () => {
    const load = vi.fn().mockResolvedValue(file("application/pdf", "proof.pdf"));
    render(<DocumentViewerDialog open title="Proof of ownership" load={load} onClose={() => {}} />);
    const frame = await screen.findByTitle("Proof of ownership");
    expect(frame.tagName).toBe("IFRAME");
    expect(frame.getAttribute("src")).toBe("blob:private-file");
  });

  it("offers a download with the original file name", async () => {
    render(<DocumentViewerDialog open title="Identity" load={() => Promise.resolve(file("image/png", "ada-id.png"))} onClose={() => {}} />);
    const link = await screen.findByRole("link", { name: /Download/ });
    expect(link.getAttribute("download")).toBe("ada-id.png");
    expect(link.getAttribute("href")).toBe("blob:private-file");
  });

  it("falls back to a download-only message for a file type it cannot preview", async () => {
    render(<DocumentViewerDialog open title="Other" load={() => Promise.resolve(file("application/zip", "x.zip"))} onClose={() => {}} />);
    expect(await screen.findByText(/can't be previewed/)).toBeTruthy();
  });

  it("explains a failure in plain words and offers no download", async () => {
    const load = vi.fn().mockRejectedValue(new Error("You don't have permission to do that."));
    render(<DocumentViewerDialog open title="Identity" load={load} onClose={() => {}} />);
    expect((await screen.findByRole("alert")).textContent).toContain("You don't have permission to do that.");
    expect(screen.queryByRole("link", { name: /Download/ })).toBeNull();
  });

  it("releases the object URL when it closes, so the file is not left in the page", async () => {
    const load = vi.fn().mockResolvedValue(file("image/png"));
    const { rerender } = render(<DocumentViewerDialog open title="Identity" load={load} onClose={() => {}} />);
    await screen.findByRole("img");
    rerender(<DocumentViewerDialog open={false} title="Identity" load={load} onClose={() => {}} />);
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith("blob:private-file"));
  });

  it("does not leak a file that arrives after the dialog was closed", async () => {
    let resolve: (f: ReturnType<typeof file>) => void = () => {};
    const load = vi.fn().mockReturnValue(new Promise((r) => (resolve = r)));
    const { rerender } = render(<DocumentViewerDialog open title="Identity" load={load} onClose={() => {}} />);
    rerender(<DocumentViewerDialog open={false} title="Identity" load={load} onClose={() => {}} />);
    resolve(file("image/png"));
    await Promise.resolve();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("closes with Escape, the backdrop and the close button", async () => {
    const onClose = vi.fn();
    render(<DocumentViewerDialog open title="Identity" load={() => Promise.resolve(file("image/png"))} onClose={onClose} />);
    await screen.findByRole("img");
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Close document" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("stops the page behind it from scrolling, and restores it", async () => {
    const { rerender } = render(<DocumentViewerDialog open title="Identity" load={() => Promise.resolve(file("image/png"))} onClose={() => {}} />);
    expect(document.body.style.overflow).toBe("hidden");
    await screen.findByRole("img");
    rerender(<DocumentViewerDialog open={false} title="Identity" load={() => Promise.resolve(file("image/png"))} onClose={() => {}} />);
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("fetches again each time it is opened", async () => {
    const load = vi.fn().mockImplementation(() => Promise.resolve(file("image/png")));
    const { rerender } = render(<DocumentViewerDialog open title="Identity" load={load} onClose={() => {}} />);
    await screen.findByRole("img");
    rerender(<DocumentViewerDialog open={false} title="Identity" load={load} onClose={() => {}} />);
    rerender(<DocumentViewerDialog open title="Identity" load={load} onClose={() => {}} />);
    await screen.findByRole("img");
    expect(load).toHaveBeenCalledTimes(2);
  });
});

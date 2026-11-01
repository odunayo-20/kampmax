// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ImagePreviewDialog, isSafeImageUrl } from "../ImagePreviewDialog";

afterEach(cleanup);

const photo = { url: "https://res.cloudinary.com/demo/image/upload/v1/a.webp", title: "Braiding" };

describe("isSafeImageUrl", () => {
  it("accepts only secure web addresses", () => {
    expect(isSafeImageUrl("https://res.cloudinary.com/demo/image/upload/v1/a.webp")).toBe(true);
    expect(isSafeImageUrl("http://cdn.example.com/a.jpg")).toBe(false);
    expect(isSafeImageUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeImageUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(isSafeImageUrl("/relative/path.jpg")).toBe(false);
    expect(isSafeImageUrl("")).toBe(false);
  });
});

describe("ImagePreviewDialog", () => {
  it("shows nothing when there is no photo", () => {
    const { container } = render(<ImagePreviewDialog image={null} onClose={() => {}} />);

    expect(container.textContent).toBe("");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the photo inside the page, with no link that leaves it", () => {
    render(<ImagePreviewDialog image={photo} onClose={() => {}} />);

    expect(screen.getByRole("dialog", { name: "Photo of Braiding" })).toBeTruthy();
    expect(screen.getByAltText("Photo of Braiding").getAttribute("src")).toBe(photo.url);
    expect(document.querySelector("a")).toBeNull();
  });

  it("doesn't tell the image host which console page the admin is on", () => {
    render(<ImagePreviewDialog image={photo} onClose={() => {}} />);

    expect(screen.getByAltText("Photo of Braiding").getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("refuses an address that isn't https, rather than loading it", () => {
    render(<ImagePreviewDialog image={{ url: "javascript:alert(1)", title: "x" }} onClose={() => {}} />);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector("img")).toBeNull();
  });

  it("closes with the button, the backdrop or Escape", () => {
    const onClose = vi.fn();
    render(<ImagePreviewDialog image={photo} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("puts the page's scrolling back when it closes", () => {
    document.body.style.overflow = "auto";
    const { rerender } = render(<ImagePreviewDialog image={photo} onClose={() => {}} />);
    expect(document.body.style.overflow).toBe("hidden");

    rerender(<ImagePreviewDialog image={null} onClose={() => {}} />);

    expect(document.body.style.overflow).toBe("auto");
  });
});

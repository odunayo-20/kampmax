// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import RichTextEditor from "../RichTextEditor";
import { EmbedDialog } from "../EmbedDialog";
import { LinkDialog } from "../LinkDialog";

afterEach(cleanup);

function setup(over: Partial<React.ComponentProps<typeof RichTextEditor>> = {}) {
  const props = {
    value: "<h2>Hello</h2><p>World</p>",
    onChange: vi.fn(),
    onUploadImage: vi.fn().mockResolvedValue({ url: "https://res.cloudinary.com/x/a.jpg" }),
    onError: vi.fn(),
    ...over,
  };
  const view = render(<RichTextEditor {...props} />);
  return { ...props, ...view };
}

const editorEl = () => screen.findByRole("textbox", { name: "Article content" });

/** Dispatches a paste event carrying files, the way a browser does for copied images. */
function pasteFiles(target: HTMLElement, files: File[]) {
  const event = new Event("paste", { bubbles: true, cancelable: true }) as Event & { clipboardData?: unknown };
  event.clipboardData = { files, types: ["Files"], getData: () => "", items: [] };
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

// jsdom has no layout; ProseMirror asks for client rects when scrolling a new node into view.
const emptyRects = () => [] as unknown as DOMRectList;
Element.prototype.getClientRects ??= emptyRects;
Object.getPrototypeOf(document.createRange()).getClientRects ??= emptyRects;
Object.getPrototypeOf(document.createRange()).getBoundingClientRect ??= () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }) as DOMRect;
(Text.prototype as unknown as { getClientRects?: () => DOMRectList }).getClientRects ??= emptyRects;

describe("RichTextEditor", () => {
  it("loads existing HTML into an accessible writing area", async () => {
    setup();
    const area = await editorEl();
    expect(area.getAttribute("aria-multiline")).toBe("true");
    expect(area.querySelector("h2")?.textContent).toBe("Hello");
    expect(area.textContent).toContain("World");
  });

  it("offers a logically grouped toolbar with labelled controls", async () => {
    setup();
    await editorEl();
    const toolbar = screen.getByRole("toolbar", { name: "Text formatting" });
    for (const group of ["History", "Text style", "Lists and blocks", "Alignment", "Insert"]) {
      expect(screen.getByRole("group", { name: group })).toBeTruthy();
    }
    for (const label of ["Undo", "Redo", "Bold", "Italic", "Underline", "Strikethrough", "Inline code", "Bulleted list", "Numbered list", "Checklist", "Quote", "Callout box", "Code block", "Align left", "Link", "Image", "Video", "Divider"]) {
      expect(toolbar.querySelector(`button[aria-label="${label}"]`), label).toBeTruthy();
    }
    // Every icon-only control has a tooltip too.
    expect(toolbar.querySelector('button[aria-label="Bold"]')?.getAttribute("title")).toMatch(/Bold \(/);
  });

  it("offers Heading 2–4 only: the article title is the page's H1", async () => {
    setup();
    await editorEl();
    const options = [...screen.getByLabelText("Paragraph style").querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toEqual(["Paragraph", "Heading 2", "Heading 3", "Heading 4"]);
  });

  it("reflects the block style of the current selection", async () => {
    setup();
    await editorEl();
    // Selection starts at the first node (the H2).
    await waitFor(() => expect((screen.getByLabelText("Paragraph style") as HTMLSelectElement).value).toBe("h2"));
  });

  it("disables every tool and editing when disabled", async () => {
    setup({ disabled: true });
    const area = await editorEl();
    expect(area.getAttribute("contenteditable")).toBe("false");
    expect((screen.getByRole("button", { name: "Bold" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Image" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("replaces the document when the host supplies a new value (draft restore)", async () => {
    const { rerender, ...rest } = setup();
    await editorEl();
    rerender(<RichTextEditor {...rest} value="<p>Restored text</p>" />);
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Article content" }).textContent).toContain("Restored text"));
    expect(rest.onChange).not.toHaveBeenCalled();
  });

  it("reports the word count", async () => {
    setup({ value: "<p>one two three</p>" });
    await editorEl();
    await waitFor(() => expect(screen.getByText(/3 words/)).toBeTruthy());
  });

  it("warns about a broken heading order", async () => {
    setup({ value: "<h2>A</h2><h4>B</h4>" });
    await editorEl();
    await waitFor(() => expect(screen.getByText(/Heading order/)).toBeTruthy());
  });
});

describe("image handling", () => {
  it("uploads a pasted image through the platform uploader, never as base64", async () => {
    const { onUploadImage, onError } = setup();
    const area = await editorEl();
    const file = new File([new Uint8Array(10)], "photo.png", { type: "image/png" });
    const event = pasteFiles(area, [file]);
    expect(event.defaultPrevented).toBe(true);
    await waitFor(() => expect(onUploadImage).toHaveBeenCalledWith(file));
    expect(onError).not.toHaveBeenCalled();
    await waitFor(() => expect(area.querySelector("img")?.getAttribute("src")).toBe("https://res.cloudinary.com/x/a.jpg"));
  });

  it("shows an alt-text field for a new image and flags it as required", async () => {
    setup();
    const area = await editorEl();
    pasteFiles(area, [new File([new Uint8Array(10)], "p.png", { type: "image/png" })]);
    const alt = await screen.findByLabelText(/Alt text/);
    expect(screen.getByText(/required to publish/)).toBeTruthy();
    fireEvent.change(alt, { target: { value: "Students at OAU" } });
    await waitFor(() => expect(area.querySelector("img")?.getAttribute("alt")).toBe("Students at OAU"));
    expect(screen.queryByText(/required to publish/)).toBeNull();
  });

  it("rejects unsupported files with a clear message and does not upload", async () => {
    const { onUploadImage, onError } = setup();
    const area = await editorEl();
    pasteFiles(area, [new File(["x"], "doc.pdf", { type: "image/svg+xml" })]);
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringMatching(/JPG, PNG, WebP or GIF/)));
    expect(onUploadImage).not.toHaveBeenCalled();
  });

  it("rejects oversized files", async () => {
    const { onUploadImage, onError } = setup();
    const area = await editorEl();
    pasteFiles(area, [new File([new Uint8Array(11 * 1024 * 1024)], "big.png", { type: "image/png" })]);
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringMatching(/10 MB/)));
    expect(onUploadImage).not.toHaveBeenCalled();
  });

  it("reports a failed upload in plain language and keeps the document intact", async () => {
    const { onError } = setup({ onUploadImage: vi.fn().mockRejectedValue(new Error("Can't reach the server. Check your connection and try again.")) });
    const area = await editorEl();
    pasteFiles(area, [new File([new Uint8Array(10)], "p.png", { type: "image/png" })]);
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringMatching(/Can't reach the server/)));
    expect(area.textContent).toContain("World");
    expect(area.querySelector("img")).toBeNull();
  });
});

describe("LinkDialog", () => {
  const open = (initialUrl = "") => {
    const handlers = { onSave: vi.fn(), onRemove: vi.fn(), onClose: vi.fn() };
    render(<LinkDialog initialUrl={initialUrl} {...handlers} />);
    return handlers;
  };

  it("is an accessible modal with focus on the address field", () => {
    open();
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(screen.getByLabelText("Web address"));
  });

  it("normalizes the address and saves", () => {
    const { onSave } = open();
    fireEvent.change(screen.getByLabelText("Web address"), { target: { value: "kampmax.com/jobs" } });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    expect(onSave).toHaveBeenCalledWith("https://kampmax.com/jobs");
  });

  it("explains that external links open in a new tab", () => {
    open();
    fireEvent.change(screen.getByLabelText("Web address"), { target: { value: "https://example.com" } });
    expect(screen.getByText(/open in a new tab/i)).toBeTruthy();
  });

  it.each(["javascript:alert(1)", "data:text/html,x", "not a link", ""])("refuses %j with an inline error", (value) => {
    const { onSave } = open();
    fireEvent.change(screen.getByLabelText("Web address"), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("edits and removes an existing link", () => {
    const { onRemove, onSave } = open("https://old.test");
    expect((screen.getByLabelText("Web address") as HTMLInputElement).value).toBe("https://old.test");
    fireEvent.click(screen.getByRole("button", { name: "Remove link" }));
    expect(onRemove).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Web address"), { target: { value: "/marketplace" } });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    expect(onSave).toHaveBeenCalledWith("/marketplace");
  });

  it("closes on Escape", () => {
    const { onClose } = open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("EmbedDialog", () => {
  it("accepts YouTube and Vimeo links and passes the normalized embed", () => {
    const onInsert = vi.fn();
    render(<EmbedDialog onInsert={onInsert} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Video link"), { target: { value: "https://youtu.be/dQw4w9WgXcQ" } });
    expect(screen.getByText(/YouTube video found/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add video" }));
    expect(onInsert).toHaveBeenCalledWith({ provider: "youtube", id: "dQw4w9WgXcQ", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" });
  });

  it("refuses other providers with a clear message", () => {
    const onInsert = vi.fn();
    render(<EmbedDialog onInsert={onInsert} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Video link"), { target: { value: "https://evil.test/video/123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Add video" }));
    expect(onInsert).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/Only YouTube and Vimeo/);
  });
});

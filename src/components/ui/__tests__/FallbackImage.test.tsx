// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// A plain <img> stands in for next/image, which needs a running server to load pictures.
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt, onError }: { src: string; alt: string; onError?: (e: unknown) => void }) => (
    <img src={src} alt={alt} onError={onError} />
  ),
}));

import { FallbackImage } from "../FallbackImage";

afterEach(cleanup);

const placeholder = <span data-testid="placeholder">no picture</span>;

describe("FallbackImage", () => {
  it("shows the picture while it loads fine", () => {
    render(<FallbackImage src="https://cdn.example.com/a.jpg" alt="A thing" width={10} height={10} fallback={placeholder} />);

    expect(screen.getByAltText("A thing")).toBeTruthy();
    expect(screen.queryByTestId("placeholder")).toBeNull();
  });

  it("swaps in the placeholder when the picture can't be loaded, not a broken image", () => {
    const onError = vi.fn();
    render(
      <FallbackImage src="https://cdn.example.com/a.jpg" alt="A thing" width={10} height={10} fallback={placeholder} onError={onError} />
    );

    fireEvent.error(screen.getByAltText("A thing"));

    expect(screen.queryByAltText("A thing")).toBeNull();
    expect(screen.getByTestId("placeholder")).toBeTruthy();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("tries again with a different picture", () => {
    const { rerender } = render(
      <FallbackImage src="https://cdn.example.com/a.jpg" alt="A thing" width={10} height={10} fallback={placeholder} />
    );
    fireEvent.error(screen.getByAltText("A thing"));
    expect(screen.getByTestId("placeholder")).toBeTruthy();

    rerender(<FallbackImage src="https://cdn.example.com/b.jpg" alt="A thing" width={10} height={10} fallback={placeholder} />);

    expect(screen.getByAltText("A thing").getAttribute("src")).toBe("https://cdn.example.com/b.jpg");
    expect(screen.queryByTestId("placeholder")).toBeNull();
  });
});

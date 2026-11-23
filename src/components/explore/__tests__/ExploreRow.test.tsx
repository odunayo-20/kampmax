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

import { EXPLORE_TONES, ExploreRow, ExploreThumb } from "../ExploreRow";

afterEach(cleanup);

const tone = EXPLORE_TONES.product;
const icon = <span data-testid="icon">icon</span>;

describe("ExploreThumb", () => {
  it("shows the picture when it loads", () => {
    render(<ExploreThumb src="https://cdn.example.com/a.jpg" alt="Lamp" tone={tone} fallback={icon} />);
    expect(screen.getByAltText("Lamp")).toBeTruthy();
    expect(screen.queryByTestId("icon")).toBeNull();
  });

  it("shows the icon, not alt text, when the picture is broken", () => {
    render(<ExploreThumb src="https://cdn.example.com/gone.jpg" alt="Lamp" tone={tone} fallback={icon} />);
    fireEvent.error(screen.getByAltText("Lamp"));
    expect(screen.queryByAltText("Lamp")).toBeNull();
    expect(screen.getByTestId("icon")).toBeTruthy();
  });

  it("shows the icon when there is no picture at all", () => {
    render(<ExploreThumb src={undefined} alt="Lamp" tone={tone} fallback={icon} />);
    expect(screen.getByTestId("icon")).toBeTruthy();
  });
});

describe("ExploreRow", () => {
  it("links to the result with its title, tag and details", () => {
    render(
      <ExploreRow href="/marketplace/1" tone={tone} title="Desk lamp" tag="Product" thumb={null}>
        <p>₦5,000</p>
      </ExploreRow>
    );
    expect(screen.getByRole("link").getAttribute("href")).toBe("/marketplace/1");
    expect(screen.getByText("Desk lamp")).toBeTruthy();
    expect(screen.getByText("Product")).toBeTruthy();
    expect(screen.getByText("₦5,000")).toBeTruthy();
  });
});

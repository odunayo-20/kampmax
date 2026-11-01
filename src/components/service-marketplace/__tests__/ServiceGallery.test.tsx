// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ServiceGallery } from "../ServiceGallery";

afterEach(cleanup);

describe("ServiceGallery", () => {
  it("shows a placeholder when there are no pictures", () => {
    render(<ServiceGallery images={[]} name="Photo" />);

    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows a single picture with no thumbnails", () => {
    render(<ServiceGallery images={["https://x/1.jpg"]} name="Photo" />);

    expect(screen.getByAltText("Photo").getAttribute("src")).toBe("https://x/1.jpg");
    expect(screen.queryByLabelText("More photos of this service")).toBeNull();
  });

  it("starts on the main picture and switches to the one chosen", () => {
    render(<ServiceGallery images={["https://x/1.jpg", "https://x/2.jpg", "https://x/3.jpg"]} name="Photo" />);
    expect(screen.getByAltText("Photo").getAttribute("src")).toBe("https://x/1.jpg");

    fireEvent.click(screen.getByRole("button", { name: "Show photo 3 of 3" }));

    expect(screen.getByAltText("Photo").getAttribute("src")).toBe("https://x/3.jpg");
    expect(screen.getByRole("button", { name: "Show photo 3 of 3" }).getAttribute("aria-current")).toBe("true");
  });
});

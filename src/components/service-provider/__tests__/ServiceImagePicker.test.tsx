// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const uploadProviderImage = vi.hoisted(() => vi.fn());
vi.mock("@/services/service-provider-media", () => ({
  uploadProviderImage: (...a: unknown[]) => uploadProviderImage(...a),
}));

import { ServiceImagePicker } from "../ServiceImagePicker";

const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
const choose = () => fireEvent.change(screen.getByLabelText("Choose a service photo"), { target: { files: [file] } });

afterEach(cleanup);

describe("ServiceImagePicker", () => {
  it("offers to add a photo when there is none, with no remove button", () => {
    render(<ServiceImagePicker imageUrl={null} onChange={() => {}} />);

    expect(screen.getByRole("button", { name: /add a photo/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
  });

  it("uploads the chosen file as a cover image and reports its id and address", async () => {
    uploadProviderImage.mockResolvedValue({ mediaId: "m1", url: "https://cdn.example.com/p.jpg" });
    const onChange = vi.fn();
    render(<ServiceImagePicker imageUrl={null} onChange={onChange} />);

    choose();

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ mediaId: "m1", url: "https://cdn.example.com/p.jpg" })
    );
    expect(uploadProviderImage).toHaveBeenCalledWith(file, "coverImage");
  });

  it("shows the current photo and lets it be replaced or removed", () => {
    const onChange = vi.fn();
    render(<ServiceImagePicker imageUrl="https://cdn.example.com/p.jpg" onChange={onChange} />);

    expect(screen.getByAltText("Service photo preview").getAttribute("src")).toBe("https://cdn.example.com/p.jpg");
    expect(screen.getByRole("button", { name: /replace photo/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("says why an upload failed and keeps the current photo", async () => {
    uploadProviderImage.mockImplementation(async () => {
      throw new Error("That image is too large. The limit is 5MB.");
    });
    const onChange = vi.fn();
    render(<ServiceImagePicker imageUrl="https://cdn.example.com/p.jpg" onChange={onChange} />);

    choose();

    expect((await screen.findByRole("alert")).textContent).toMatch(/too large/);
    expect(onChange).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const uploadProviderImage = vi.hoisted(() => vi.fn());
vi.mock("@/services/service-provider-media", () => ({
  MAX_SERVICE_GALLERY: 4,
  uploadProviderImage: (...a: unknown[]) => uploadProviderImage(...a),
}));

import { ServiceGalleryPicker } from "../ServiceGalleryPicker";

const img = (n: number) => ({ mediaId: `m${n}`, url: `https://cdn.example.com/${n}.jpg` });
const files = (n: number) => Array.from({ length: n }, (_, i) => new File(["x"], `p${i}.jpg`, { type: "image/jpeg" }));
const choose = (list: File[]) =>
  fireEvent.change(screen.getByLabelText("Choose more service photos"), { target: { files: list } });

afterEach(cleanup);

describe("ServiceGalleryPicker", () => {
  it("shows how many of the 4 are used and offers to add more", () => {
    render(<ServiceGalleryPicker images={[img(1)]} onChange={() => {}} />);

    expect(screen.getByText("(1/4)")).toBeTruthy();
    expect(screen.getByRole("button", { name: /add photos/i })).toBeTruthy();
  });

  it("uploads each chosen photo and adds them after the current ones, in order", async () => {
    uploadProviderImage.mockImplementation(async (f: File) => ({ mediaId: `up-${f.name}`, url: `https://cdn.example.com/${f.name}` }));
    const onChange = vi.fn();
    render(<ServiceGalleryPicker images={[img(1)]} onChange={onChange} />);

    choose(files(2));

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange.mock.calls[0][0].map((i: { mediaId: string }) => i.mediaId)).toEqual(["m1", "up-p0.jpg", "up-p1.jpg"]);
    expect(uploadProviderImage).toHaveBeenCalledWith(expect.any(File), "coverImage");
  });

  it("takes only as many photos as there is room for", async () => {
    uploadProviderImage.mockImplementation(async (f: File) => ({ mediaId: `up-${f.name}`, url: `https://cdn.example.com/${f.name}` }));
    uploadProviderImage.mockClear();
    const onChange = vi.fn();
    render(<ServiceGalleryPicker images={[img(1), img(2), img(3)]} onChange={onChange} />);

    choose(files(3));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(uploadProviderImage).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(4);
  });

  it("offers no more uploads once full", () => {
    render(<ServiceGalleryPicker images={[img(1), img(2), img(3), img(4)]} onChange={() => {}} />);

    expect(screen.queryByRole("button", { name: /add photos/i })).toBeNull();
  });

  it("removes one photo and keeps the rest in order", () => {
    const onChange = vi.fn();
    render(<ServiceGalleryPicker images={[img(1), img(2), img(3)]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove photo 3" }));

    expect(onChange).toHaveBeenCalledWith([img(1), img(3)]);
  });

  it("keeps the photos that went through and says why the next one failed", async () => {
    uploadProviderImage
      .mockImplementationOnce(async () => ({ mediaId: "ok", url: "https://cdn.example.com/ok.jpg" }))
      .mockImplementationOnce(async () => {
        throw new Error("That image is too large. The limit is 5MB.");
      });
    const onChange = vi.fn();
    render(<ServiceGalleryPicker images={[]} onChange={onChange} />);

    choose(files(3));

    expect((await screen.findByRole("alert")).textContent).toMatch(/too large/);
    expect(onChange).toHaveBeenCalledWith([{ mediaId: "ok", url: "https://cdn.example.com/ok.jpg" }]);
  });
});

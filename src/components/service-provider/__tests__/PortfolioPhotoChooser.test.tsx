// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const fetchMyPortfolio = vi.hoisted(() => vi.fn());
vi.mock("@/services/service-provider-media", () => ({
  fetchMyPortfolio: (...a: unknown[]) => fetchMyPortfolio(...a),
}));

import { PortfolioPhotoChooser } from "../PortfolioPhotoChooser";

const item = (n: number) => ({
  id: `p${n}`,
  mediaId: `m${n}`,
  image: `https://cdn.example.com/${n}.jpg`,
  title: `Work ${n}`,
  description: "",
  categoryId: "",
});

afterEach(cleanup);

describe("PortfolioPhotoChooser", () => {
  it("loads the portfolio only when opened, and offers each photo", async () => {
    fetchMyPortfolio.mockResolvedValue([item(1), item(2)]);
    render(<PortfolioPhotoChooser onPick={() => {}} />);
    expect(fetchMyPortfolio).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /from my portfolio/i }));

    expect(await screen.findByRole("button", { name: 'Use "Work 1"' })).toBeTruthy();
    expect(screen.getByRole("button", { name: 'Use "Work 2"' })).toBeTruthy();
  });

  it("reports the chosen photo's upload id and address, then closes", async () => {
    fetchMyPortfolio.mockResolvedValue([item(1), item(2)]);
    const onPick = vi.fn();
    render(<PortfolioPhotoChooser onPick={onPick} />);

    fireEvent.click(screen.getByRole("button", { name: /from my portfolio/i }));
    fireEvent.click(await screen.findByRole("button", { name: 'Use "Work 2"' }));

    expect(onPick).toHaveBeenCalledWith({ mediaId: "m2", url: "https://cdn.example.com/2.jpg" });
    expect(screen.queryByRole("button", { name: 'Use "Work 1"' })).toBeNull();
  });

  it("hides photos that are already chosen", async () => {
    fetchMyPortfolio.mockResolvedValue([item(1), item(2)]);
    render(<PortfolioPhotoChooser onPick={() => {}} exclude={["m1"]} />);

    fireEvent.click(screen.getByRole("button", { name: /from my portfolio/i }));

    expect(await screen.findByRole("button", { name: 'Use "Work 2"' })).toBeTruthy();
    expect(screen.queryByRole("button", { name: 'Use "Work 1"' })).toBeNull();
  });

  it("points to the Portfolio page when there is nothing to choose from", async () => {
    fetchMyPortfolio.mockResolvedValue([]);
    render(<PortfolioPhotoChooser onPick={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /from my portfolio/i }));

    expect((await screen.findByText(/no portfolio photos yet/i)).textContent).toMatch(/Portfolio page/);
  });

  it("says so when the portfolio can't be loaded", async () => {
    fetchMyPortfolio.mockImplementation(async () => {
      throw new Error("down");
    });
    render(<PortfolioPhotoChooser onPick={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /from my portfolio/i }));

    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});

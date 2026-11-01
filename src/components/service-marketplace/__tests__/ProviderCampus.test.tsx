// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const fetchCampuses = vi.hoisted(() => vi.fn());
vi.mock("@/services/campus", () => ({
  fetchCampuses: (...a: unknown[]) => fetchCampuses(...a),
  getCampuses: () => [],
}));

import { resetCampusOptionsCache } from "@/hooks/use-campus-options";
import { ProviderCampus } from "../ProviderCampus";

const RUGIPO = "6a332447-af9a-46df-b18e-943cd3e56b9c";
const campuses = [{ id: RUGIPO, name: "Rufus Giwa Polytechnic, Owo", abbreviation: "RUGIPO" }];

beforeEach(() => {
  resetCampusOptionsCache();
  fetchCampuses.mockClear();
  fetchCampuses.mockResolvedValue({ data: campuses, error: null });
});
afterEach(cleanup);

describe("ProviderCampus", () => {
  it("shows the campus's short name once it is known", async () => {
    render(<ProviderCampus campusId={RUGIPO} />);

    expect(await screen.findByText("RUGIPO")).toBeTruthy();
  });

  it("shows nothing when the provider hasn't chosen a campus, rather than a blank badge", async () => {
    const { container } = render(<ProviderCampus campusId="" />);

    await waitFor(() => expect(fetchCampuses).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("shows nothing for a campus that isn't in the list", async () => {
    const { container } = render(<ProviderCampus campusId="00000000-0000-0000-0000-000000000000" />);

    await waitFor(() => expect(fetchCampuses).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("asks for the campuses once however many cards are on the page", async () => {
    render(
      <>
        <ProviderCampus campusId={RUGIPO} />
        <ProviderCampus campusId={RUGIPO} />
        <ProviderCampus campusId={RUGIPO} />
      </>
    );

    await waitFor(() => expect(screen.getAllByText("RUGIPO")).toHaveLength(3));
    expect(fetchCampuses).toHaveBeenCalledTimes(1);
  });
});

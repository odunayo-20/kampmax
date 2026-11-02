// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { SearchResultItem } from "@/types";

vi.mock("@/services/campus", () => ({ getCampuses: () => [] }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { SearchFilterPanel } from "../SearchFilterPanel";
import { SearchResults } from "../SearchResults";

afterEach(cleanup);

describe("SearchFilterPanel price boxes", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const panel = (props: Partial<Parameters<typeof SearchFilterPanel>[0]> = {}) => {
    const onPriceMinChange = vi.fn();
    const onPriceMaxChange = vi.fn();
    const view = render(
      <SearchFilterPanel
        campusId=""
        onCampusChange={() => {}}
        onPriceMinChange={onPriceMinChange}
        onPriceMaxChange={onPriceMaxChange}
        onClear={() => {}}
        {...props}
      />
    );
    return { ...view, onPriceMinChange, onPriceMaxChange };
  };

  it("searches once, after a pause, not on every digit", () => {
    const { onPriceMinChange } = panel();
    const min = screen.getByLabelText("Minimum price");

    for (const typed of ["5", "50", "500", "5000"]) {
      fireEvent.change(min, { target: { value: typed } });
      act(() => void vi.advanceTimersByTime(100));
    }
    expect(onPriceMinChange).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(500));
    expect(onPriceMinChange).toHaveBeenCalledTimes(1);
    expect(onPriceMinChange).toHaveBeenCalledWith(5000);
  });

  it("clears the filter when the box is emptied", () => {
    const { onPriceMaxChange } = panel({ priceMax: 9000 });

    fireEvent.change(screen.getByLabelText("Maximum price"), { target: { value: "" } });
    act(() => void vi.advanceTimersByTime(500));

    expect(onPriceMaxChange).toHaveBeenCalledWith(undefined);
  });

  it("follows a price changed elsewhere, but not while a change is still being typed", () => {
    const { rerender, onPriceMinChange, onPriceMaxChange } = panel({ priceMin: 100 });
    const min = screen.getByLabelText("Minimum price") as HTMLInputElement;
    expect(min.value).toBe("100");

    // Someone clears the filters elsewhere.
    const props = { campusId: "", onCampusChange: () => {}, onPriceMinChange, onPriceMaxChange, onClear: () => {} };
    rerender(<SearchFilterPanel {...props} priceMin={undefined} />);
    expect(min.value).toBe("");

    // Typing in progress: an older value arriving must not overwrite it.
    fireEvent.change(min, { target: { value: "50" } });
    rerender(<SearchFilterPanel {...props} priceMin={5} />);
    expect(min.value).toBe("50");
  });
});

const item = (over: Partial<SearchResultItem>): SearchResultItem => ({
  id: "1",
  type: "product",
  title: "Scientific calculator",
  subtitle: "New · Ibadan",
  url: "/marketplace/1",
  ...over,
});

describe("SearchResults", () => {
  it("picks out the words of the search in titles and subtitles", () => {
    const { container } = render(
      <SearchResults items={[item({ title: "Scientific calculator", subtitle: "New · Ibadan" })]} query="calc ibadan" />
    );

    expect([...container.querySelectorAll("mark")].map((m) => m.textContent)).toEqual(["calc", "Ibadan"]);
  });

  it("shows the new freelancer sections with their own headings", () => {
    render(
      <SearchResults
        items={[
          item({ id: "a", type: "freelance", title: "Logo design pack", url: "/freelancers/services/x" }),
          item({ id: "b", type: "freelancer", title: "Ada Obi", url: "/freelancers/f1" }),
        ]}
        query="logo"
      />
    );

    expect(screen.getByRole("region", { name: "Freelance services results" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Freelancers results" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Logo design pack/ }).getAttribute("href")).toBe("/freelancers/services/x");
  });

  it("offers 'See all' on each section when asked, and reports which one", () => {
    const onSeeAll = vi.fn();
    render(
      <SearchResults
        items={[item({ id: "a" }), item({ id: "b", type: "job", title: "Campus job", url: "/jobs/b" })]}
        query="x"
        onSeeAll={onSeeAll}
      />
    );

    const jobs = screen.getByRole("region", { name: "Jobs results" });
    fireEvent.click(within(jobs).getByRole("button", { name: "See all jobs" }));

    expect(onSeeAll).toHaveBeenCalledWith("job");
  });

  it("has no 'See all' when nothing handles it (already narrowed to one type)", () => {
    render(<SearchResults items={[item({})]} query="x" />);

    expect(screen.queryByRole("button", { name: /see all/i })).toBeNull();
  });
});

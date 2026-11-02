// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const replace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { SearchBox } from "../SearchBox";

const box = (props: Partial<Parameters<typeof SearchBox>[0]> = {}) => (
  <SearchBox action="/freelancers" value="" placeholder="Search" label="Search freelancers" {...props} />
);
const input = () => screen.getByLabelText("Search freelancers") as HTMLInputElement;
const type = (value: string) => fireEvent.change(input(), { target: { value } });
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  replace.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("SearchBox", () => {
  it("waits for a pause in typing, then searches once", () => {
    render(box());

    type("lo");
    wait(200);
    type("logo");
    wait(200);
    expect(replace).not.toHaveBeenCalled();

    wait(150);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/freelancers?q=logo", { scroll: false });
  });

  it("keeps the other filters, leaves out empty ones, and drops the page", () => {
    render(box({ params: { availability: "AVAILABLE", category: "", page: "" } }));

    type("logo");
    wait(300);

    expect(replace).toHaveBeenCalledWith("/freelancers?q=logo&availability=AVAILABLE", { scroll: false });
  });

  it("searches straight away on Enter", () => {
    render(box());

    type("website");
    fireEvent.submit(input().closest("form")!);

    expect(replace).toHaveBeenCalledWith("/freelancers?q=website", { scroll: false });
  });

  it("clears the box and the search together", () => {
    render(box({ value: "logo" }));

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(input().value).toBe("");
    expect(replace).toHaveBeenCalledWith("/freelancers", { scroll: false });
  });

  it("does nothing on first show, and follows a search changed elsewhere", () => {
    const { rerender } = render(box({ value: "logo" }));
    wait(500);
    expect(replace).not.toHaveBeenCalled();

    rerender(box({ value: "" }));
    expect(input().value).toBe("");
  });

  it("carries the other filters as hidden fields for when JavaScript is off", () => {
    const { container } = render(box({ params: { availability: "BUSY", category: "" } }));

    const hidden = [...container.querySelectorAll('input[type="hidden"]')] as HTMLInputElement[];
    expect(hidden.map((h) => [h.name, h.value])).toEqual([["availability", "BUSY"]]);
  });
});

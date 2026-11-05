// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ContactMessagesPage } from "@/services/admin/contact-messages.service";
import type { AdminContactMessage } from "@/types/contact-messages";

const state = {
  loading: false,
  error: false,
  data: undefined as ContactMessagesPage | undefined,
};
const listArgs = vi.fn();
const refetch = vi.fn();

vi.mock("@/hooks/admin/use-admin-contact-messages", () => ({
  useAdminContactMessages: (...args: unknown[]) => {
    listArgs(...args);
    return {
      data: state.loading || state.error ? undefined : state.data,
      isPending: state.loading,
      isError: state.error,
      refetch,
    };
  },
}));
vi.mock("@/hooks/use-debounce", () => ({ useDebounce: (v: string) => v }));
vi.mock("@/components/admin/contact/ContactMessageDialog", () => ({
  ContactMessageDialog: ({ message }: { message: AdminContactMessage | null }) =>
    message ? <div data-testid="dialog">{message.id}</div> : null,
}));

import AdminContactMessagesPage from "../page";

const item = (over: Partial<AdminContactMessage> = {}): AdminContactMessage => ({
  id: "m1",
  name: "Ada Obi",
  email: "ada@x.test",
  inquiryType: "vendor",
  inquiryLabel: "Vendor inquiry",
  organization: null,
  phone: null,
  message: "I would like to sell on Kampmax.",
  status: "NEW",
  handledAt: null,
  handledByName: null,
  emailed: true,
  createdAt: new Date().toISOString(),
  ...over,
});

const page = (items: AdminContactMessage[], total = items.length): ContactMessagesPage => ({
  items,
  page: 1,
  pageSize: 15,
  total,
  totalPages: Math.max(1, Math.ceil(total / 15)),
  counts: { new: 4, handled: 9 },
});

const lastQuery = () => listArgs.mock.calls.at(-1)?.[0] as Record<string, unknown>;

beforeEach(() => {
  state.loading = false;
  state.error = false;
  state.data = page([item()]);
  listArgs.mockReset();
  refetch.mockReset();
});
afterEach(cleanup);

describe("AdminContactMessagesPage", () => {
  it("asks for waiting messages first and shows both counts on the tabs", () => {
    render(<AdminContactMessagesPage />);

    expect(lastQuery()).toMatchObject({ status: "new", page: 1 });
    expect(lastQuery().inquiryType).toBeUndefined();
    expect(screen.getByRole("tab", { name: /waiting/i }).textContent).toContain("4");
    expect(screen.getByRole("tab", { name: /handled/i }).textContent).toContain("9");
  });

  it("lists who sent it, the type and the message", () => {
    render(<AdminContactMessagesPage />);

    const table = within(screen.getByRole("table"));
    expect(table.getByText("Ada Obi")).toBeTruthy();
    expect(table.getByText("Vendor inquiry")).toBeTruthy();
    expect(table.getByText("I would like to sell on Kampmax.")).toBeTruthy();
  });

  it("switches to handled messages from the tab", () => {
    render(<AdminContactMessagesPage />);

    fireEvent.click(screen.getByRole("tab", { name: /handled/i }));

    expect(lastQuery()).toMatchObject({ status: "handled", page: 1 });
  });

  it("filters by type and searches", () => {
    render(<AdminContactMessagesPage />);

    fireEvent.change(screen.getByLabelText("Filter by type"), { target: { value: "support" } });
    fireEvent.change(screen.getByLabelText("Search messages"), { target: { value: " ada " } });

    expect(lastQuery()).toMatchObject({ inquiryType: "support", search: "ada" });
  });

  it("opens a message in the dialog", () => {
    render(<AdminContactMessagesPage />);

    expect(screen.queryByTestId("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /open the message from ada obi/i }));

    expect(screen.getByTestId("dialog").textContent).toBe("m1");
  });

  it("flags a message that never reached the team inbox", () => {
    state.data = page([item({ emailed: false })]);
    render(<AdminContactMessagesPage />);

    expect(screen.getByText(/team inbox not emailed/i)).toBeTruthy();
  });

  it("says nothing is waiting when the queue is empty", () => {
    state.data = page([]);
    render(<AdminContactMessagesPage />);

    expect(screen.getByText("Nothing waiting")).toBeTruthy();
  });

  it("says nothing matched when filters are on", () => {
    state.data = page([]);
    render(<AdminContactMessagesPage />);

    fireEvent.change(screen.getByLabelText("Search messages"), { target: { value: "zzz" } });

    expect(screen.getByText("No matching messages")).toBeTruthy();
  });

  it("offers a retry when loading fails", () => {
    state.error = true;
    render(<AdminContactMessagesPage />);

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(refetch).toHaveBeenCalled();
  });
});

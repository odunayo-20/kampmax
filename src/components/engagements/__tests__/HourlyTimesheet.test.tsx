// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({
  fetchTimesheet: vi.fn(),
  logTimeApi: vi.fn(),
  deleteTimeEntryApi: vi.fn(),
}));
vi.mock("@/services/timesheet-api", () => api);

import { HourlyTimesheet } from "../HourlyTimesheet";
import { todayISO } from "@/lib/milestone-plan";
import type { Timesheet } from "@/services/timesheet-api";
import type { EngagementStatus } from "@/services/jobs";

afterEach(cleanup);
beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
});

/** A day relative to today, as YYYY-MM-DD in the device's own calendar. */
const day = (offset: number) => {
  const now = new Date();
  return todayISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
};

type SheetOverrides = Partial<Omit<Timesheet, "week">> & { week?: Partial<Timesheet["week"]> };
const sheet = ({ week, ...rest }: SheetOverrides = {}): Timesheet => ({
  engagementId: "e1",
  hourlyRate: 3000,
  weeklyHourLimit: 20,
  week: {
    position: 1,
    title: "Week 1",
    status: "ACTIVE",
    periodStart: day(-2),
    periodEnd: day(4),
    loggedMinutes: 90,
    limitMinutes: 1200,
    worth: 4500,
    capAmount: 60000,
    paidAmount: null,
    ...week,
  },
  entries: [{ id: "t1", workDate: day(-1), minutes: 90, note: "Built the checkout page", createdAt: new Date().toISOString() }],
  canEdit: true,
  ...rest,
});

function renderSheet(
  props: Partial<React.ComponentProps<typeof HourlyTimesheet>> = {},
  status: EngagementStatus = "IN_PROGRESS"
) {
  const onChanged = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <HourlyTimesheet engagementId="e1" role="freelancer" status={status} onChanged={onChanged} {...props} />
    </QueryClientProvider>
  );
  return { onChanged, ...view };
}

const hours = () => screen.getByLabelText("Hours") as HTMLInputElement;
const minutes = () => screen.getByLabelText("Minutes") as HTMLInputElement;
const logButton = () => screen.getByRole("button", { name: "Log time" });

describe("when there is nothing to show", () => {
  it("tells the freelancer a funded week is waiting for the client to start it, without loading anything", () => {
    renderSheet({}, "FUNDED");
    expect(screen.getByText(/once the client starts the work/)).toBeTruthy();
    expect(api.fetchTimesheet).not.toHaveBeenCalled();
  });

  it("tells the employer to start the work, so the freelancer can log time", () => {
    renderSheet({ role: "employer" }, "FUNDED");
    expect(screen.getByText(/Start the work so the freelancer can log time/)).toBeTruthy();
  });

  it.each(["PENDING_PAYMENT", "COMPLETED", "CANCELLED"] as const)("shows nothing while the contract is %s", (status) => {
    const { container } = renderSheet({}, status);
    expect(container.textContent).toBe("");
    expect(api.fetchTimesheet).not.toHaveBeenCalled();
  });
});

describe("reading the week", () => {
  beforeEach(() => {
    api.fetchTimesheet.mockResolvedValue(sheet());
  });

  it("shows the hours so far against the weekly limit, what they are worth, and what is held", async () => {
    renderSheet();

    expect(await screen.findByText("1h 30m of 20h")).toBeTruthy();
    expect(screen.getByText(/Worth ₦4,500 so far, of up to ₦60,000 held for the week/)).toBeTruthy();
    const bar = screen.getByRole("progressbar", { name: "Hours logged this week" });
    expect(bar.getAttribute("aria-valuenow")).toBe("90");
    expect(bar.getAttribute("aria-valuemax")).toBe("1200");
  });

  it("lists each entry with its day, length and note", async () => {
    renderSheet();
    expect(await screen.findByText("Built the checkout page")).toBeTruthy();
    expect(screen.getByText(/· 1h 30m$/)).toBeTruthy();
  });

  it("shows a note as plain text, never as markup", async () => {
    api.fetchTimesheet.mockResolvedValue(
      sheet({ entries: [{ id: "t1", workDate: day(0), minutes: 60, note: "<b>bold</b><img src=x onerror=alert(1)>", createdAt: "" }] })
    );
    const { container } = renderSheet();

    expect(await screen.findByText("<b>bold</b><img src=x onerror=alert(1)>")).toBeTruthy();
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("explains an empty week differently to each side", async () => {
    api.fetchTimesheet.mockResolvedValue(sheet({ entries: [], week: { loggedMinutes: 0, worth: 0 } }));
    renderSheet();
    expect(await screen.findByText(/No time logged yet. Add the time you work/)).toBeTruthy();
    cleanup();

    renderSheet({ role: "employer" });
    expect(await screen.findByText("The freelancer hasn't logged any time this week.")).toBeTruthy();
  });

  it("shows a failure to load, and does not leak raw server text", async () => {
    api.fetchTimesheet.mockImplementation(async () => {
      throw Object.assign(new Error("ECONNREFUSED 10.0.0.5:5432"), { status: 500 });
    });
    renderSheet();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Something went wrong on our end");
    expect(alert.textContent).not.toContain("ECONNREFUSED");
  });
});

describe("who can change it", () => {
  it("lets the freelancer log time while the week is open", async () => {
    api.fetchTimesheet.mockResolvedValue(sheet());
    renderSheet();
    await screen.findByText("Built the checkout page");

    expect(logButton()).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Remove 1h 30m on/ })).toBeTruthy();
  });

  it("gives the employer a read-only view", async () => {
    api.fetchTimesheet.mockResolvedValue(sheet({ canEdit: false }));
    renderSheet({ role: "employer" });
    await screen.findByText("Built the checkout page");

    expect(screen.queryByRole("button", { name: "Log time" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Remove/ })).toBeNull();
  });

  it("is read-only once the week has been submitted, for whoever is looking", async () => {
    api.fetchTimesheet.mockResolvedValue(sheet({ canEdit: false }));
    renderSheet({}, "SUBMITTED");
    await screen.findByText("Built the checkout page");

    expect(screen.queryByRole("button", { name: "Log time" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Remove/ })).toBeNull();
  });
});

describe("logging time", () => {
  beforeEach(() => {
    api.fetchTimesheet.mockResolvedValue(sheet());
  });

  it("offers only the days of the week that have happened, newest selected", async () => {
    renderSheet();
    await screen.findByText("Built the checkout page");

    const select = screen.getByLabelText("Day") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual([day(-2), day(-1), day(0)]);
    expect(select.value).toBe(day(0));
  });

  it("sends the day, the minutes and the note, then shows the new total and clears the form", async () => {
    api.logTimeApi.mockResolvedValue(
      sheet({
        week: { loggedMinutes: 180, worth: 9000 },
        entries: [
          { id: "t1", workDate: day(-1), minutes: 90, note: "Built the checkout page", createdAt: "" },
          { id: "t2", workDate: day(0), minutes: 90, note: "Fixed the footer", createdAt: "" },
        ],
      })
    );
    const { onChanged } = renderSheet();
    await screen.findByText("Built the checkout page");

    fireEvent.change(hours(), { target: { value: "1" } });
    fireEvent.change(minutes(), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText(/What did you work on/), { target: { value: "  Fixed the footer  " } });
    fireEvent.click(logButton());

    await screen.findByText("Fixed the footer");
    expect(api.logTimeApi).toHaveBeenCalledWith("e1", { workDate: day(0), minutes: 90, note: "Fixed the footer" });
    expect(screen.getByText("3h of 20h")).toBeTruthy();
    expect(onChanged).toHaveBeenCalled();
    expect(hours().value).toBe("");
    expect(minutes().value).toBe("");
  });

  it("logs time for an earlier day of the week", async () => {
    api.logTimeApi.mockResolvedValue(sheet());
    renderSheet();
    await screen.findByText("Built the checkout page");

    fireEvent.change(screen.getByLabelText("Day"), { target: { value: day(-2) } });
    fireEvent.change(hours(), { target: { value: "2" } });
    fireEvent.click(logButton());

    await waitFor(() => expect(api.logTimeApi).toHaveBeenCalled());
    expect(api.logTimeApi).toHaveBeenCalledWith("e1", { workDate: day(-2), minutes: 120, note: "" });
  });

  describe("mistakes are caught before anything is sent", () => {
    const attempt = async (h: string, m: string) => {
      renderSheet();
      await screen.findByText("Built the checkout page");
      fireEvent.change(hours(), { target: { value: h } });
      fireEvent.change(minutes(), { target: { value: m } });
      fireEvent.click(logButton());
      return screen.findByRole("alert");
    };

    it("asks for something when both boxes are empty", async () => {
      expect((await attempt("", "")).textContent).toMatch(/at least 15 minutes/);
      expect(api.logTimeApi).not.toHaveBeenCalled();
    });

    it("asks for at least 15 minutes", async () => {
      expect((await attempt("", "10")).textContent).toMatch(/at least 15 minutes/);
    });

    it("refuses fractions", async () => {
      expect((await attempt("1.5", "")).textContent).toMatch(/whole numbers/);
      expect(api.logTimeApi).not.toHaveBeenCalled();
    });

    it("refuses more than a plausible day's work", async () => {
      expect((await attempt("17", "")).textContent).toMatch(/more than 16 hours in a day/);
      expect(api.logTimeApi).not.toHaveBeenCalled();
    });

    it("refuses time that would go over the week's limit, and says how much is left", async () => {
      api.fetchTimesheet.mockResolvedValue(sheet({ week: { loggedMinutes: 1100 } }));
      expect((await attempt("2", "")).textContent).toMatch(/over this week's limit.*You have 1h 40m left/);
      expect(api.logTimeApi).not.toHaveBeenCalled();
    });
  });

  it("shows the backend's own reason when it refuses, in its own words", async () => {
    api.logTimeApi.mockRejectedValue(
      Object.assign(new Error("That would go over this week's 20-hour limit. You have 1h left"), { status: 400 })
    );
    renderSheet();
    await screen.findByText("Built the checkout page");

    fireEvent.change(hours(), { target: { value: "1" } });
    fireEvent.click(logButton());

    expect((await screen.findByRole("alert")).textContent).toBe("That would go over this week's 20-hour limit. You have 1h left");
  });

  it("does not show raw server text when the request fails outright", async () => {
    api.logTimeApi.mockRejectedValue(Object.assign(new Error("relation does not exist"), { status: 500 }));
    renderSheet();
    await screen.findByText("Built the checkout page");

    fireEvent.change(hours(), { target: { value: "1" } });
    fireEvent.click(logButton());

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).not.toContain("relation");
    expect(alert.textContent).toContain("Something went wrong on our end");
  });

  it("does not offer a form when no day of the week has happened yet", async () => {
    api.fetchTimesheet.mockResolvedValue(sheet({ week: { periodStart: day(1), periodEnd: day(7) } }));
    renderSheet();
    await screen.findByText("Built the checkout page");
    expect(screen.queryByRole("button", { name: "Log time" })).toBeNull();
  });
});

describe("removing an entry", () => {
  it("removes it and shows the lower total", async () => {
    api.fetchTimesheet.mockResolvedValue(sheet());
    api.deleteTimeEntryApi.mockResolvedValue(sheet({ entries: [], week: { loggedMinutes: 0, worth: 0 } }));
    const { onChanged } = renderSheet();
    await screen.findByText("Built the checkout page");

    fireEvent.click(screen.getByRole("button", { name: /^Remove 1h 30m on/ }));

    await screen.findByText(/No time logged yet/);
    expect(api.deleteTimeEntryApi).toHaveBeenCalledWith("e1", "t1");
    expect(onChanged).toHaveBeenCalled();
  });

  it("says why when the backend refuses", async () => {
    api.fetchTimesheet.mockResolvedValue(sheet());
    api.deleteTimeEntryApi.mockRejectedValue(
      Object.assign(new Error("Time can only be logged while the week is open for work"), { status: 400 })
    );
    renderSheet();
    await screen.findByText("Built the checkout page");

    fireEvent.click(screen.getByRole("button", { name: /^Remove 1h 30m on/ }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/open for work/);
  });
});

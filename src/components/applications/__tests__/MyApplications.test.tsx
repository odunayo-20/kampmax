// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { MyApplication } from "@/services/job-applications";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const state = {
  loading: false,
  error: false,
  data: { applications: [] as MyApplication[], total: 0, page: 1, totalPages: 1 },
};
const withdraw = vi.fn();

vi.mock("@/hooks/use-job-applications", () => ({
  useMyApplications: () => ({
    data: state.loading || state.error ? undefined : state.data,
    isPending: state.loading,
    isError: state.error,
    error: new Error("down"),
    refetch: vi.fn(),
  }),
  useWithdrawApplication: () => ({ mutate: withdraw, isPending: false }),
}));

import { MyApplications } from "../MyApplications";

afterEach(cleanup);
beforeEach(() => {
  state.loading = false;
  state.error = false;
  state.data = { applications: [], total: 0, page: 1, totalPages: 1 };
  withdraw.mockReset();
});

const application = (overrides: Partial<MyApplication> = {}): MyApplication => ({
  id: "app-1",
  status: "SUBMITTED",
  cvLabel: "Design CV",
  coverNote: null,
  employerNote: null,
  createdAt: "2026-11-02T00:00:00.000Z",
  updatedAt: "2026-11-02T00:00:00.000Z",
  decidedAt: null,
  job: {
    id: "job-1",
    title: "Marketing intern",
    slug: "marketing-intern",
    opportunityType: "INTERNSHIP",
    status: "PUBLISHED",
    expiresAt: null,
    employerName: "Acme Ltd",
    city: "Yaba",
    state: "Lagos",
  },
  ...overrides,
});

const list = (...apps: MyApplication[]) => {
  state.data = { applications: apps, total: apps.length, page: 1, totalPages: 1 };
};

describe("MyApplications", () => {
  it("shows a loading state", () => {
    state.loading = true;
    render(<MyApplications />);
    expect(screen.getByRole("status", { name: "Loading your applications" })).toBeTruthy();
  });

  it("offers a retry when it cannot load", () => {
    state.error = true;
    render(<MyApplications />);
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("points a person with no applications to internships and their CVs", () => {
    render(<MyApplications />);
    expect(screen.getByText(/haven't applied to anything yet/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Find internships" }).getAttribute("href")).toBe(
      "/jobs?type=internship"
    );
    expect(screen.getByRole("link", { name: "My CVs" }).getAttribute("href")).toBe("/profile/cvs");
  });

  it("shows each application with the posting, employer, CV used and where it stands", () => {
    list(application());
    render(<MyApplications />);

    expect(screen.getByRole("link", { name: "Marketing intern" }).getAttribute("href")).toBe("/jobs/job-1");
    expect(screen.getByText("Acme Ltd")).toBeTruthy();
    expect(screen.getByText("Internship")).toBeTruthy();
    expect(screen.getByText(/Applied with .Design CV./)).toBeTruthy();
    expect(screen.getByText("Yaba, Lagos")).toBeTruthy();
    // The status badge (a "Sent" label also exists for screen readers, on the date).
    expect(screen.getByText("Sent", { selector: "span" })).toBeTruthy();
  });

  it.each([
    ["VIEWED", "Seen"],
    ["SHORTLISTED", "Shortlisted"],
    ["REJECTED", "Not selected"],
    ["HIRED", "Hired"],
    ["WITHDRAWN", "Withdrawn"],
  ] as const)("reads %s as %s", (status, label) => {
    list(application({ status }));
    render(<MyApplications />);
    expect(screen.getByText(label)).toBeTruthy();
  });

  it("passes on a message from the employer", () => {
    list(application({ status: "REJECTED", employerNote: "We went with someone else" }));
    render(<MyApplications />);
    expect(screen.getByText(/We went with someone else/)).toBeTruthy();
  });

  it("lets an application that is still open be withdrawn, after asking", () => {
    list(application({ status: "SHORTLISTED" }));
    render(<MyApplications />);

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    expect(screen.getByText(/will no longer see your application to "Marketing intern"/)).toBeTruthy();
    expect(withdraw).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Withdraw" }).at(-1)!);
    expect(withdraw).toHaveBeenCalledWith("app-1", expect.any(Object));
  });

  it("shows the server's reason if the withdrawal is refused", () => {
    list(application());
    withdraw.mockImplementation((_id, opts) =>
      opts.onError(Object.assign(new Error("A hired application can no longer be withdrawn"), { status: 400 }))
    );
    render(<MyApplications />);

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Withdraw" }).at(-1)!);

    expect(screen.getByRole("alert").textContent).toBe("A hired application can no longer be withdrawn");
  });

  it.each(["REJECTED", "HIRED", "WITHDRAWN"] as const)(
    "does not offer to withdraw a %s application",
    (status) => {
      list(application({ status }));
      render(<MyApplications />);
      expect(screen.queryByRole("button", { name: "Withdraw" })).toBeNull();
    }
  );
});

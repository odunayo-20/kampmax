import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn();
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));

import EmployerApplicationsPage from "../page";

const open = (status?: string | string[]) =>
  EmployerApplicationsPage({ searchParams: Promise.resolve({ status }) });

describe("/employer/applications", () => {
  beforeEach(() => redirect.mockClear());

  it("sends an old status link to the stage it belongs to", async () => {
    await open("shortlisted");
    expect(redirect).toHaveBeenCalledWith("/employer/people?stage=SHORTLISTED");
  });

  it("sends everyone else to the People list", async () => {
    await open();
    expect(redirect).toHaveBeenCalledWith("/employer/people");
    await open("withdrawn");
    expect(redirect).toHaveBeenLastCalledWith("/employer/people");
  });

  it("reads the first status when a link repeats the parameter", async () => {
    await open(["rejected", "accepted"]);
    expect(redirect).toHaveBeenCalledWith("/employer/people?stage=DECLINED");
  });
});

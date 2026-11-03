import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiClient: mocks }));

import { deleteTimeEntryApi, fetchTimesheet, logTimeApi } from "../timesheet-api";

const sheet = { engagementId: "e1", entries: [], canEdit: true };

beforeEach(() => {
  mocks.get.mockReset();
  mocks.post.mockReset();
  mocks.delete.mockReset();
});

describe("timesheet API", () => {
  it("reads the current week, or an earlier one by its position", async () => {
    mocks.get.mockResolvedValue({ data: sheet, error: null });

    await fetchTimesheet("e1");
    await fetchTimesheet("e1", 3);

    expect(mocks.get).toHaveBeenNthCalledWith(1, "/engagements/e1/timesheet");
    expect(mocks.get).toHaveBeenNthCalledWith(2, "/engagements/e1/timesheet?week=3");
  });

  it("sends logged time as the day, the minutes and the note, and returns the new sheet", async () => {
    mocks.post.mockResolvedValue({ data: sheet, error: null });

    await expect(logTimeApi("e1", { workDate: "2026-11-04", minutes: 90, note: "Built it" })).resolves.toBe(sheet);
    expect(mocks.post).toHaveBeenCalledWith("/engagements/e1/time-entries", {
      workDate: "2026-11-04",
      minutes: 90,
      note: "Built it",
    });
  });

  it("removes an entry by its id", async () => {
    mocks.delete.mockResolvedValue({ data: sheet, error: null });
    await deleteTimeEntryApi("e1", "t1");
    expect(mocks.delete).toHaveBeenCalledWith("/engagements/e1/time-entries/t1");
  });

  it("throws the backend's error, so the caller can show its reason", async () => {
    const refusal = Object.assign(new Error("You have 1h left"), { status: 400 });
    mocks.post.mockResolvedValue({ data: null, error: refusal });
    await expect(logTimeApi("e1", { workDate: "2026-11-04", minutes: 600 })).rejects.toBe(refusal);
  });

  it("does not treat an empty response as success", async () => {
    mocks.get.mockResolvedValue({ data: null, error: null });
    await expect(fetchTimesheet("e1")).rejects.toThrow(/Empty response/);
  });
});

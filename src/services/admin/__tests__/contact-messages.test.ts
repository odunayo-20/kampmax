import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
const patchMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({
  apiClient: { get: getMock, patch: patchMock, delete: deleteMock },
}));

import { createApiContactMessagesService } from "../contact-messages.api";

const service = createApiContactMessagesService();

beforeEach(() => {
  getMock.mockReset();
  patchMock.mockReset();
  deleteMock.mockReset();
});

describe("contact messages service", () => {
  it("lists with no query string by default and reshapes the page, keeping the tab counts", async () => {
    getMock.mockResolvedValue({
      data: {
        items: [{ id: "m1" }],
        meta: { total: 31, page: 1, limit: 15, totalPages: 3 },
        counts: { new: 31, handled: 7 },
      },
      error: null,
    });

    const result = await service.list();

    expect(getMock).toHaveBeenCalledWith("/admin/contact-messages");
    expect(result).toEqual({
      items: [{ id: "m1" }],
      page: 1,
      pageSize: 15,
      total: 31,
      totalPages: 3,
      counts: { new: 31, handled: 7 },
    });
  });

  it("sends the filters, trimming the search and naming the page size 'limit'", async () => {
    getMock.mockResolvedValue({
      data: { items: [], meta: { total: 0, page: 2, limit: 10, totalPages: 0 }, counts: { new: 0, handled: 0 } },
      error: null,
    });

    const result = await service.list({
      status: "handled",
      inquiryType: "vendor",
      search: "  ada ",
      page: 2,
      pageSize: 10,
    });

    expect(getMock).toHaveBeenCalledWith(
      "/admin/contact-messages?status=handled&inquiryType=vendor&q=ada&page=2&limit=10"
    );
    expect(result.totalPages).toBe(1);
  });

  it("explains a refusal instead of showing a raw status", async () => {
    getMock.mockResolvedValue({ data: null, error: { status: 403, message: "Forbidden" } });

    await expect(service.list()).rejects.toThrow("You don't have permission to do that.");
  });

  it("marks a message handled and puts it back", async () => {
    patchMock.mockResolvedValue({ data: { id: "m1", status: "HANDLED" }, error: null });

    await expect(service.setHandled("m1", true)).resolves.toEqual({ id: "m1", status: "HANDLED" });
    await service.setHandled("m1", false);

    expect(patchMock).toHaveBeenNthCalledWith(1, "/admin/contact-messages/m1/handled", { handled: true });
    expect(patchMock).toHaveBeenNthCalledWith(2, "/admin/contact-messages/m1/handled", { handled: false });
  });

  it("says so when the message was deleted by someone else meanwhile", async () => {
    patchMock.mockResolvedValue({ data: null, error: { status: 404, message: "Not found" } });

    await expect(service.setHandled("m1", true)).rejects.toThrow(/no longer exists/);
  });

  it("deletes a message", async () => {
    deleteMock.mockResolvedValue({ data: { deleted: true }, error: null });

    await expect(service.remove("m1")).resolves.toBeUndefined();

    expect(deleteMock).toHaveBeenCalledWith("/admin/contact-messages/m1");
  });

  it("surfaces the server's message when a delete fails", async () => {
    deleteMock.mockResolvedValue({ data: null, error: { status: 500, message: "Boom" } });

    await expect(service.remove("m1")).rejects.toThrow("Boom");
  });
});

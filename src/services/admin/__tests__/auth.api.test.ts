import { beforeEach, describe, expect, it, vi } from "vitest";

const postMock = vi.hoisted(() => vi.fn());
const getMock = vi.hoisted(() => vi.fn());
const storage = vi.hoisted(() => ({
  clearAuthTokens: vi.fn(),
  persistAuthTokens: vi.fn(),
  getRefreshToken: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({ apiClient: { post: postMock, get: getMock } }));
vi.mock("@/lib/auth-storage", () => storage);

import { createApiAdminAuthService } from "../auth.api";

const operator = {
  id: "u1",
  name: "Ada Obi",
  email: "root@kampmax.test",
  role: "SUPER_ADMIN",
  title: "Super Admin",
  avatar: "AO",
  lastLoginAt: "2026-01-02T03:04:05.000Z",
  permissions: ["taxonomy.manage", "users.read"],
};

describe("live admin auth service", () => {
  const service = createApiAdminAuthService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs in, stores the tokens and maps the operator (incl. permissions)", async () => {
    postMock.mockResolvedValue({
      data: { admin: operator, tokens: { accessToken: "acc", refreshToken: "ref" } },
      error: null,
    });

    const result = await service.login({ email: "root@kampmax.test", password: "pw" });

    expect(postMock).toHaveBeenCalledWith("/admin/auth/login", {
      email: "root@kampmax.test",
      password: "pw",
    });
    expect(storage.persistAuthTokens).toHaveBeenCalledWith("acc", "ref");
    expect(result).toMatchObject({
      success: true,
      token: "acc",
      admin: {
        id: "u1",
        role: "SUPER_ADMIN",
        campusId: null,
        permissions: ["taxonomy.manage", "users.read"],
      },
    });
  });

  it("drops any previous session before signing in", async () => {
    postMock.mockResolvedValue({ data: null, error: Object.assign(new Error("x"), { status: 401 }) });
    await service.login({ email: "a@b.co", password: "pw" });
    expect(storage.clearAuthTokens).toHaveBeenCalled();
    expect(storage.persistAuthTokens).not.toHaveBeenCalled();
  });

  it("maps 401 to invalid credentials and 403 to no operator access", async () => {
    postMock.mockResolvedValue({ data: null, error: Object.assign(new Error("x"), { status: 401 }) });
    expect(await service.login({ email: "a@b.co", password: "bad" })).toMatchObject({
      success: false,
      code: "INVALID_CREDENTIALS",
    });

    postMock.mockResolvedValue({ data: null, error: Object.assign(new Error("x"), { status: 403 }) });
    expect(await service.login({ email: "a@b.co", password: "pw" })).toMatchObject({
      success: false,
      code: "FORBIDDEN",
      message: "This account doesn't have operator access.",
    });
  });

  it("restores a session from the API, or reports none", async () => {
    getMock.mockResolvedValue({ data: { admin: operator }, error: null });
    expect(await service.getCurrentSession("ignored")).toMatchObject({
      admin: { id: "u1", permissions: expect.arrayContaining(["taxonomy.manage"]) },
    });

    getMock.mockResolvedValue({ data: null, error: Object.assign(new Error("x"), { status: 403 }) });
    expect(await service.getCurrentSession("ignored")).toBeNull();
  });

  it("survives an unreachable API instead of throwing", async () => {
    postMock.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await service.login({ email: "a@b.co", password: "pw" })).toMatchObject({
      success: false,
      message: expect.stringContaining("Can't reach the server"),
    });

    getMock.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await service.getCurrentSession("t")).toBeNull();
  });

  it("logs out on the server and clears local tokens even if the call fails", async () => {
    storage.getRefreshToken.mockReturnValue("ref");
    postMock.mockRejectedValue(new Error("network"));
    await expect(service.logout("tok")).resolves.toEqual({ success: true });
    expect(postMock).toHaveBeenCalledWith("/auth/logout", { refreshToken: "ref" });
    expect(storage.clearAuthTokens).toHaveBeenCalled();
  });

  it("offers no impersonation and no demo accounts", async () => {
    expect(await service.switchAccount("t", "x")).toMatchObject({ success: false, code: "FORBIDDEN" });
    expect(await service.listActiveAdmins()).toEqual([]);
    expect(service.getDemoCredentials()).toEqual([]);
  });
});

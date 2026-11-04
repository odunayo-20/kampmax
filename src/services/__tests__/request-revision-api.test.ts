import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiClient: mocks }));

import { requestEngagementRevision } from "../jobs";

beforeEach(() => mocks.post.mockReset());

describe("requestEngagementRevision", () => {
  it("sends the note and the kind to the backend, which decides what counts", async () => {
    mocks.post.mockResolvedValue({ data: { id: "e1" }, error: null });

    await requestEngagementRevision("e1", "The form does not send", "FIX");

    expect(mocks.post).toHaveBeenCalledWith("/engagements/e1/request-revision", {
      note: "The form does not send",
      kind: "FIX",
    });
  });

  it("asks for an ordinary change when no kind is given", async () => {
    mocks.post.mockResolvedValue({ data: { id: "e1" }, error: null });
    await requestEngagementRevision("e1", "Make the logo bigger");
    expect(mocks.post).toHaveBeenCalledWith("/engagements/e1/request-revision", {
      note: "Make the logo bigger",
      kind: "CHANGES",
    });
  });

  it("sends nothing that says whether it counts: that is the server's call", async () => {
    mocks.post.mockResolvedValue({ data: { id: "e1" }, error: null });
    await requestEngagementRevision("e1", "Add a blog section", "NEW_SCOPE");
    const body = mocks.post.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["kind", "note"]);
  });

  it("hands back the backend's refusal", async () => {
    const refusal = { message: "All 3 revisions have been used.", status: 400 };
    mocks.post.mockResolvedValue({ data: null, error: refusal });

    await expect(requestEngagementRevision("e1", "One more thing")).resolves.toEqual({
      engagement: null,
      error: refusal,
    });
  });
});

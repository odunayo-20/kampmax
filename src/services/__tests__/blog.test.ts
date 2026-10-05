import { afterEach, describe, expect, it, vi } from "vitest";
import { BlogApiError, getArticle, getBlogTags, listArticles } from "@/services/blog";

function mockFetch(response: Partial<Response> | Error) {
  const fn = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response as Response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const ok = (data: unknown): Partial<Response> => ({ ok: true, status: 200, json: async () => ({ success: true, data }) });

afterEach(() => vi.unstubAllGlobals());

describe("blog service (server fetch)", () => {
  it("unwraps the API envelope and sends revalidation hints", async () => {
    const fetchMock = mockFetch(ok({ items: [], meta: { total: 0, page: 1, limit: 12, totalPages: 0 } }));
    const page = await listArticles({ q: "jobs", page: 2, category: "career" });
    expect(page.meta.total).toBe(0);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit & { next?: { revalidate: number } }];
    expect(url).toContain("/api/v1/blog/articles?q=jobs&page=2&category=career");
    expect(init.next?.revalidate).toBeGreaterThan(0);
  });

  it("skips empty params in the query string", async () => {
    const fetchMock = mockFetch(ok({ items: [], meta: {} }));
    await getBlogTags(20, undefined);
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toMatch(/\/blog\/tags\?limit=20$/);
  });

  it("returns null for an unknown article (404)", async () => {
    mockFetch({ ok: false, status: 404, json: async () => ({}) });
    await expect(getArticle("missing")).resolves.toBeNull();
  });

  it("returns the redirect target when a slug moved", async () => {
    mockFetch(ok({ article: null, redirectTo: "new-slug" }));
    await expect(getArticle("old-slug")).resolves.toEqual({ article: null, redirectTo: "new-slug" });
  });

  it("raises a friendly BlogApiError on server errors and network failures", async () => {
    mockFetch({ ok: false, status: 500, json: async () => ({}) });
    await expect(getArticle("x")).rejects.toMatchObject({ name: "BlogApiError", status: 500 });

    mockFetch(new TypeError("fetch failed"));
    const error = await listArticles().catch((e) => e);
    expect(error).toBeInstanceOf(BlogApiError);
    expect(error.status).toBe(503);
    expect(error.message).not.toMatch(/fetch failed/);
  });

  it("encodes slugs in the article URL", async () => {
    const fetchMock = mockFetch(ok({ article: null, redirectTo: null }));
    await getArticle("a/b c");
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toContain("/slug/a%2Fb%20c");
  });
});

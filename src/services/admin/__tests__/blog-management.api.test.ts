import { describe, expect, it } from "vitest";
import { BlogApiValidationError, describeBlogError } from "../blog-management.api";
import type { ApiError } from "@/lib/api-client";

const apiError = (status: number, message = "", data?: unknown) => ({ status, message, data }) as unknown as ApiError;

describe("describeBlogError", () => {
  it("explains auth failures in plain language", () => {
    expect(describeBlogError(apiError(401)).message).toMatch(/session has expired/i);
    expect(describeBlogError(apiError(403)).message).toMatch(/permission/i);
  });

  it("maps 404, 429 and 5xx without leaking backend details", () => {
    expect(describeBlogError(apiError(404)).message).toMatch(/no longer exists/i);
    expect(describeBlogError(apiError(429)).message).toMatch(/too many requests/i);
    const server = describeBlogError(apiError(500, "QueryFailedError: relation x does not exist"));
    expect(server.message).toMatch(/server had a problem/i);
    expect(server.message).not.toMatch(/relation/);
  });

  it("keeps every field message of a validation error", () => {
    const err = describeBlogError(apiError(400, "x", { message: ["title must be longer", "slug is invalid"] }));
    expect(err).toBeInstanceOf(BlogApiValidationError);
    expect((err as BlogApiValidationError).messages).toEqual(["title must be longer", "slug is invalid"]);
  });

  it("passes through a single business-rule message (e.g. slug conflict)", () => {
    expect(describeBlogError(apiError(409, "The slug \"a\" is already used by another article.")).message).toMatch(/already used/);
  });

  it("treats a missing status as a network failure", () => {
    expect(describeBlogError(undefined).message).toMatch(/can't reach the server/i);
    expect(describeBlogError(new TypeError("Failed to fetch")).message).toMatch(/can't reach the server/i);
  });
});

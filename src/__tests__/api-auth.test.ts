import { describe, expect, it } from "vitest";
import { ApiError, withErrorHandling } from "@/lib/api/auth";

describe("API authentication error handling", () => {
  it("maps ApiError(401) to a 401 JSON response", async () => {
    const response = await withErrorHandling(async () => {
      throw new ApiError(401, "Authentication required.");
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required.");
  });

  it("maps ApiError(403) to a 403 JSON response", async () => {
    const response = await withErrorHandling(async () => {
      throw new ApiError(403, "Admin access required.");
    });

    expect(response.status).toBe(403);
  });

  it("maps unknown errors to a generic 500 without leaking internals", async () => {
    const response = await withErrorHandling(async () => {
      throw new Error("secret database connection string exposed");
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).not.toContain("secret database connection string");
  });

  it("passes through a successful response unchanged", async () => {
    const response = await withErrorHandling(async () => Response.json({ ok: true }) as never);
    expect(response.status).toBe(200);
  });
});

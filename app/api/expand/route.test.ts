/**
 * Request-contract tests for POST `/api/expand`.
 * Live LLM expansion is smoke-tested against a running server with production
 * env (`OPENAI_API_KEY`, `EXPANSION_MODEL`); these cases stay offline.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

describe("POST /api/expand — request contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("returns 503 when OPENAI_API_KEY is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentNode: { id: "root", label: "Artificial Intelligence" },
        }),
      }),
    );

    expect(response.status).toBe(503);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toMatch(/OPENAI_API_KEY/i);
  });

  it("returns 400 when parentNode is missing or incomplete", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-placeholder");
    const { POST } = await import("./route");

    const missingParent = await POST(
      new Request("http://localhost/api/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(missingParent.status).toBe(400);

    const incomplete = await POST(
      new Request("http://localhost/api/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentNode: { id: "root" } }),
      }),
    );
    expect(incomplete.status).toBe(400);
  });

  it("returns 400 on invalid JSON body", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-placeholder");
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      }),
    );

    expect(response.status).toBe(400);
  });
});

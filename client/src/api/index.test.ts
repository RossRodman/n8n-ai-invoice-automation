import { describe, expect, it, vi } from "vitest";

import { api, ApiError, describeError } from "@/api";
import { INVOICES, REVIEW_ITEMS } from "@/test/fixtures/invoices";
import { mockApi } from "@/test/utils";

describe("describeError", () => {
  it("reads n8n's error message", () => {
    expect(describeError({ message: "Workflow could not be started!" })).toBe(
      "Workflow could not be started!",
    );
  });

  it("ignores anything else", () => {
    expect(describeError(null)).toBeNull();
    expect(describeError({ message: 42 })).toBeNull();
    expect(describeError("oops")).toBeNull();
  });
});

describe("api", () => {
  it("returns the parsed body", async () => {
    mockApi({ "GET /healthz": { status: "ok" } });
    await expect(api.health()).resolves.toEqual({ status: "ok" });
  });

  it("throws an ApiError with the server's message", async () => {
    mockApi({
      "GET /healthz": Response.json({ message: "n8n is starting" }, { status: 503 }),
    });
    const error = await api.health().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 503, message: "n8n is starting" });
  });

  it("falls back to the method, path and status", async () => {
    mockApi({ "GET /healthz": new Response("Bad gateway", { status: 502 }) });
    await expect(api.health()).rejects.toThrow("GET /healthz failed (502)");
  });
});

describe("invoice endpoints", () => {
  it("unwraps the invoices", async () => {
    mockApi({ "GET /api/invoices": { invoices: INVOICES } });
    await expect(api.invoices()).resolves.toEqual(INVOICES);
  });

  it("asks for review items by status", async () => {
    const calls = mockApi({ "GET /api/review": { items: REVIEW_ITEMS } });
    await expect(api.review("open")).resolves.toEqual(REVIEW_ITEMS);

    const fetched = vi.mocked(fetch).mock.calls[0]?.[0];
    expect(String(fetched)).toBe("/api/review?status=open");
    expect(calls).toHaveLength(1);
  });
});

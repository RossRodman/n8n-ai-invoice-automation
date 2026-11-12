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

describe("review actions", () => {
  it("approves with the corrections and returns the booked invoice", async () => {
    const calls = mockApi({ "POST /api/review/approve": { invoice: INVOICES[0] } });
    const request = { id: 2, fields: { total_amount: 10140 }, note: "Checked" };

    await expect(api.approve(request)).resolves.toEqual(INVOICES[0]);
    expect(calls).toEqual([{ key: "POST /api/review/approve", body: request }]);
    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.headers).toMatchObject({
      "Content-Type": "application/json",
    });
  });

  it("keeps the problems of a refused approval", async () => {
    mockApi({
      "POST /api/review/approve": Response.json(
        { message: "The invoice can't go into the books yet", problems: ["Missing: currency"] },
        { status: 422 },
      ),
    });
    const error = await api.approve({ id: 2 }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      status: 422,
      message: "The invoice can't go into the books yet",
      problems: ["Missing: currency"],
    });
  });

  it("rejects with a note", async () => {
    const result = { id: 3, status: "rejected", resolved_at: "2026-11-11T10:00:00.000Z" };
    const calls = mockApi({ "POST /api/review/reject": result });

    await expect(api.reject({ id: 3, note: "A quote" })).resolves.toEqual(result);
    expect(calls[0]?.body).toEqual({ id: 3, note: "A quote" });
  });

  it("uploads a PDF as the multipart field file", async () => {
    const calls = mockApi({
      "POST /api/upload": Response.json(
        { status: "processing", file_name: "a.pdf" },
        { status: 202 },
      ),
    });
    const file = new File(["%PDF"], "a.pdf", { type: "application/pdf" });

    await expect(api.upload(file)).resolves.toEqual({ status: "processing", file_name: "a.pdf" });
    const body = calls[0]?.body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("file")).toBe(file);
    // The browser sets the multipart boundary itself.
    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.headers).not.toHaveProperty("Content-Type");
  });
});

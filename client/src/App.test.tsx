import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { mockApi, renderRoute } from "@/test/utils";

const ONLINE = { status: "ok" };

describe("App", () => {
  it("explains the workflow on its own page", async () => {
    mockApi({ "GET /healthz": ONLINE });
    renderRoute("/how-it-works");

    expect(
      screen.getByRole("heading", { level: 1, name: "Invoices in, bookkeeping out." }),
    ).toBeInTheDocument();
    for (const step of ["Gmail", "AI extraction", "Checks", "Google Sheets", "Slack"]) {
      expect(screen.getByRole("heading", { level: 3, name: step })).toBeInTheDocument();
    }
  });

  it("shows n8n as online", async () => {
    mockApi({ "GET /healthz": ONLINE });
    renderRoute("/");

    expect(await screen.findByText("n8n online")).toBeInTheDocument();
  });

  it("shows n8n as offline when the request fails", async () => {
    mockApi({ "GET /healthz": new Response("Bad gateway", { status: 502 }) });
    renderRoute("/");

    expect(await screen.findByText("n8n offline")).toBeInTheDocument();
  });

  it("switches between light and dark mode", async () => {
    mockApi({ "GET /healthz": ONLINE });
    renderRoute("/");

    await userEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
    expect(document.documentElement).toHaveAttribute("data-color-scheme", "dark");

    await userEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
    expect(document.documentElement).toHaveAttribute("data-color-scheme", "light");
  });

  it("marks the current page in the sidebar", () => {
    mockApi({ "GET /healthz": ONLINE });
    renderRoute("/");

    const links = screen.getAllByRole("link", { name: "Dashboard" });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toHaveClass("active");
  });

  it("opens on the dashboard", async () => {
    mockApi({
      "GET /healthz": ONLINE,
      "GET /api/invoices": { invoices: [] },
      "GET /api/review": { items: [] },
    });
    renderRoute("/");

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
  });

  it("has a not-found page", () => {
    mockApi({ "GET /healthz": ONLINE });
    renderRoute("/nowhere");

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the dashboard" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

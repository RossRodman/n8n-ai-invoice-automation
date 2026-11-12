import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { INVOICES, REVIEW_ITEMS } from "@/test/fixtures/invoices";
import { mockApi, renderRoute } from "@/test/utils";

const API = {
  "GET /healthz": { status: "ok" },
  "GET /api/invoices": { invoices: INVOICES },
  "GET /api/review": { items: REVIEW_ITEMS },
};

const tile = (label: string) => screen.getByRole("article", { name: label });

describe("Dashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 11, 12));
  });

  it("sums this month in the most used currency", async () => {
    mockApi(API);
    renderRoute("/");

    expect(await within(tile("Booked this month")).findByText("UAH 35,400.00")).toBeInTheDocument();
    expect(within(tile("Booked this month")).getByText("2 invoices in Nov 26")).toBeInTheDocument();
    expect(within(tile("VAT this month")).getByText("UAH 2,000.00")).toBeInTheDocument();
    expect(within(tile("Invoices in the ledger")).getByText("4")).toBeInTheDocument();
    expect(
      within(tile("Invoices in the ledger")).getByText("95% average confidence"),
    ).toBeInTheDocument();
  });

  it("switches every money figure to another currency", async () => {
    mockApi(API);
    renderRoute("/");

    await userEvent.click(await screen.findByRole("button", { name: "EUR" }));

    expect(within(tile("Booked this month")).getByText("EUR 1,873.06")).toBeInTheDocument();
    const suppliers = screen.getByRole("region", { name: "Top suppliers" });
    expect(within(suppliers).getByText("Nordlicht Bürotechnik GmbH")).toBeInTheDocument();
    expect(within(suppliers).queryByText("ТОВ «Будмакс»")).not.toBeInTheDocument();
  });

  it("counts what waits for review and why", async () => {
    mockApi(API);
    renderRoute("/");

    expect(await within(tile("Waiting for review")).findByText("2")).toBeInTheDocument();
    const review = screen.getByRole("region", { name: "Needs a person" });
    expect(within(review).getByText("Scanned PDF")).toBeInTheDocument();
    expect(within(review).getByText("Amounts don't add up")).toBeInTheDocument();
  });

  it("links the latest invoices to their details", async () => {
    mockApi(API);
    renderRoute("/");

    const latest = screen.getByRole("region", { name: "Latest invoices" });
    const link = await within(latest).findByRole("link", { name: /Коваленко/ });
    expect(link).toHaveAttribute("href", "/invoices/4");
    expect(within(latest).getByRole("link", { name: "View all" })).toHaveAttribute(
      "href",
      "/invoices",
    );
  });

  it("explains an empty ledger", async () => {
    mockApi({ ...API, "GET /api/invoices": { invoices: [] }, "GET /api/review": { items: [] } });
    renderRoute("/");

    expect(await screen.findByText("No invoices yet")).toBeInTheDocument();
    const review = screen.getByRole("region", { name: "Needs a person" });
    expect(within(review).getByText("Nothing waiting")).toBeInTheDocument();
    expect(screen.getByText("No invoices in the last 6 months yet.")).toBeInTheDocument();
  });

  it("shows the error and retries", async () => {
    let calls = 0;
    mockApi({
      ...API,
      "GET /api/invoices": () => {
        calls += 1;
        return calls === 1
          ? Response.json({ message: "Google Sheets credential is missing" }, { status: 400 })
          : { invoices: INVOICES };
      },
    });
    renderRoute("/");

    expect(await screen.findByText(/Google Sheets credential is missing/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await within(tile("Booked this month")).findByText("UAH 35,400.00")).toBeInTheDocument();
  });
});

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { INVOICES, makeInvoice } from "@/test/fixtures/invoices";
import { mockApi, renderRoute } from "@/test/utils";

const API = {
  "GET /healthz": { status: "ok" },
  "GET /api/invoices": { invoices: INVOICES },
};

const bodyRows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);
const suppliers = () =>
  bodyRows().map((row) => within(row).getAllByRole("cell")[1]?.querySelector("a")?.textContent);

describe("Invoices page", () => {
  it("lists invoices, newest invoice date first, with totals per currency", async () => {
    mockApi(API);
    renderRoute("/invoices");

    expect(
      await screen.findByRole("link", { name: "ФОП Коваленко Олена Ігорівна" }),
    ).toBeInTheDocument();
    expect(suppliers()).toEqual([
      "ФОП Коваленко Олена Ігорівна",
      "Nordlicht Bürotechnik GmbH",
      "ТОВ «Будмакс»",
      "ТОВ «Будмакс»",
    ]);
    const totals = screen.getByRole("status", { name: "Totals" });
    expect(totals).toHaveTextContent("4 invoices");
    expect(totals).toHaveTextContent("UAH 41,400.00 incl. VAT UAH 3,000.00");
    expect(totals).toHaveTextContent("EUR 1,873.06 incl. VAT EUR 299.06");
  });

  it("searches and keeps the search in the URL", async () => {
    mockApi(API);
    const { router } = renderRoute("/invoices");

    await userEvent.type(
      await screen.findByRole("searchbox", { name: "Search invoices" }),
      "будмакс",
    );

    await waitFor(() =>
      expect(router.state.location.search).toBe(`?q=${encodeURIComponent("будмакс")}`),
    );
    await waitFor(() => expect(suppliers()).toEqual(["ТОВ «Будмакс»", "ТОВ «Будмакс»"]));
    expect(screen.getByRole("status", { name: "Totals" })).toHaveTextContent("2 invoices");
  });

  it("reads filters from the URL and can clear them", async () => {
    mockApi(API);
    renderRoute("/invoices?q=nothing");

    expect(await screen.findByText("No invoices match")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(await screen.findAllByRole("row")).toHaveLength(5);
    expect(screen.getByRole("searchbox", { name: "Search invoices" })).toHaveValue("");
  });

  it("filters by currency", async () => {
    mockApi(API);
    renderRoute("/invoices?currency=EUR");

    expect(await screen.findByText("1 invoice")).toBeInTheDocument();
    expect(suppliers()).toEqual(["Nordlicht Bürotechnik GmbH"]);
    // The pagination stays even when everything fits on one page.
    expect(screen.getByText("1–1 of 1")).toBeInTheDocument();
  });

  it("sorts by total", async () => {
    mockApi(API);
    const { router } = renderRoute("/invoices");

    await userEvent.click(await screen.findByRole("button", { name: "Total" }));

    expect(router.state.location.search).toBe("?sort=total_amount");
    expect(bodyRows()[0]).toHaveTextContent("UAH 23,400.00");
    expect(screen.getByRole("columnheader", { name: /Total/ })).toHaveAttribute(
      "aria-sort",
      "descending",
    );

    await userEvent.click(screen.getByRole("button", { name: /Total/ }));
    expect(bodyRows()[0]).toHaveTextContent("EUR 1,873.06");
  });

  it("opens an invoice in a drawer and closes back to the same list", async () => {
    mockApi(API);
    const { router } = renderRoute("/invoices?currency=UAH");

    await userEvent.click(
      await screen.findByRole("link", { name: "ФОП Коваленко Олена Ігорівна" }),
    );
    expect(router.state.location.pathname).toBe("/invoices/4");

    const drawer = await screen.findByRole("dialog", { name: "ФОП Коваленко Олена Ігорівна" });
    expect(within(drawer).getByText("No. 27 · Nov 5, 2026")).toBeInTheDocument();
    expect(within(drawer).getAllByText("UAH 23,400.00").length).toBeGreaterThan(0);
    expect(within(drawer).getByText("Net + VAT matches the total")).toBeInTheDocument();
    expect(within(drawer).getByText("3104512876")).toBeInTheDocument();
    expect(within(drawer).getByRole("link", { name: "Open the email in Gmail" })).toHaveAttribute(
      "href",
      "https://mail.google.com/mail/u/0/#all/m3",
    );

    await userEvent.click(within(drawer).getByRole("button", { name: "Close" }));
    expect(router.state.location.pathname).toBe("/invoices");
    expect(router.state.location.search).toBe("?currency=UAH");
  });

  it("opens straight from a link and leaves out the Gmail button for uploads", async () => {
    mockApi(API);
    renderRoute("/invoices/3");

    const drawer = await screen.findByRole("dialog", { name: "Nordlicht Bürotechnik GmbH" });
    expect(within(drawer).getByText("VAT 19%")).toBeInTheDocument();
    expect(within(drawer).queryByRole("link", { name: /Gmail/ })).not.toBeInTheDocument();
  });

  it("says when the invoice in the link doesn't exist", async () => {
    mockApi(API);
    renderRoute("/invoices/99");

    expect(await screen.findByText("Invoice not found")).toBeInTheDocument();
  });

  it("warns when an invoice's amounts don't add up", async () => {
    mockApi({
      ...API,
      "GET /api/invoices": {
        invoices: [
          makeInvoice({
            id: 7,
            supplier_name: "Odd Ltd",
            net_amount: 100,
            vat_amount: 20,
            total_amount: 130,
          }),
        ],
      },
    });
    renderRoute("/invoices/7");

    expect(await screen.findByText("Net + VAT doesn't match the total")).toBeInTheDocument();
  });

  it("explains an empty ledger and disables the download", async () => {
    mockApi({ ...API, "GET /api/invoices": { invoices: [] } });
    renderRoute("/invoices");

    expect(await screen.findByText("No invoices yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download CSV" })).toBeDisabled();
  });

  it("pages through long lists", async () => {
    const many = Array.from({ length: 30 }, (_, index) =>
      makeInvoice({
        id: index + 1,
        supplier_name: `Supplier ${index + 1}`,
        invoice_date: "2026-11-01",
      }),
    );
    mockApi({ ...API, "GET /api/invoices": { invoices: many } });
    const { router } = renderRoute("/invoices");

    expect(await screen.findByText("1–25 of 30")).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(25);

    await userEvent.click(screen.getByRole("button", { name: "Go to next page" }));
    expect(router.state.location.search).toBe("?page=1");
    expect(bodyRows()).toHaveLength(5);
  });
});

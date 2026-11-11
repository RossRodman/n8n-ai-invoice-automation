import { describe, expect, it } from "vitest";

import { INVOICES, makeInvoice } from "@/test/fixtures/invoices";
import {
  amountsAddUp,
  averageConfidence,
  currenciesByUse,
  filterInvoices,
  invoiceMonth,
  invoicesToCsv,
  monthlyTotals,
  sumInvoices,
  topSuppliers,
  type InvoiceFilters,
} from "@/utils/invoices";

const NOW = new Date(2026, 10, 11);
const NO_FILTERS: InvoiceFilters = {
  search: "",
  currency: null,
  sort: "invoice_date",
  direction: "desc",
};

describe("invoiceMonth", () => {
  it("uses the invoice date, then the time it arrived", () => {
    expect(invoiceMonth(makeInvoice({ id: 1, invoice_date: "2026-10-31" }))).toBe("2026-10");
    expect(invoiceMonth(makeInvoice({ id: 1, received_at: "2026-09-01T00:00:00Z" }))).toBe(
      "2026-09",
    );
    expect(invoiceMonth(makeInvoice({ id: 1 }))).toBeNull();
  });
});

describe("currenciesByUse", () => {
  it("lists the most used currency first", () => {
    expect(currenciesByUse(INVOICES)).toEqual(["UAH", "EUR"]);
    expect(currenciesByUse([])).toEqual([]);
  });
});

describe("sumInvoices", () => {
  it("adds in cents, so totals don't drift", () => {
    const invoices = [0.1, 0.2].map((total, id) => makeInvoice({ id, total_amount: total }));
    expect(sumInvoices(invoices).total).toBe(0.3);
  });

  it("adds up one currency", () => {
    const uah = INVOICES.filter((invoice) => invoice.currency === "UAH");
    expect(sumInvoices(uah)).toEqual({ count: 3, net: 38400, vat: 3000, total: 41400 });
  });
});

describe("monthlyTotals", () => {
  it("covers the last six months, empty ones included", () => {
    const months = monthlyTotals(INVOICES, "UAH", { now: NOW });

    expect(months.map((m) => m.month)).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    expect(months.at(-2)).toEqual({ month: "2026-10", count: 1, total: 6000 });
    expect(months.at(-1)).toEqual({ month: "2026-11", count: 2, total: 35400 });
  });

  it("crosses the year boundary", () => {
    const months = monthlyTotals([], "UAH", { now: new Date(2026, 1, 1), months: 3 });
    expect(months.map((m) => m.month)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});

describe("topSuppliers", () => {
  it("ranks suppliers by amount in one currency", () => {
    expect(topSuppliers(INVOICES, "UAH")).toEqual([
      { name: "ФОП Коваленко Олена Ігорівна", count: 1, total: 23400 },
      { name: "ТОВ «Будмакс»", count: 2, total: 18000 },
    ]);
    expect(topSuppliers(INVOICES, "EUR")).toHaveLength(1);
  });
});

describe("amountsAddUp", () => {
  it("allows two cents of rounding", () => {
    expect(
      amountsAddUp(
        makeInvoice({ id: 1, net_amount: 1574, vat_amount: 299.06, total_amount: 1873.06 }),
      ),
    ).toBe(true);
    expect(
      amountsAddUp(makeInvoice({ id: 1, net_amount: 100, vat_amount: 20, total_amount: 120.02 })),
    ).toBe(true);
    expect(
      amountsAddUp(makeInvoice({ id: 1, net_amount: 8450, vat_amount: 1690, total_amount: 10240 })),
    ).toBe(false);
    expect(amountsAddUp(makeInvoice({ id: 1, net_amount: 100 }))).toBeNull();
  });
});

describe("averageConfidence", () => {
  it("skips blanks", () => {
    expect(
      averageConfidence([makeInvoice({ id: 1, confidence: 0.9 }), makeInvoice({ id: 2 })]),
    ).toBe(0.9);
    expect(averageConfidence([])).toBeNull();
  });
});

describe("filterInvoices", () => {
  const ids = (filters: Partial<InvoiceFilters>) =>
    filterInvoices(INVOICES, { ...NO_FILTERS, ...filters }).map((invoice) => invoice.id);

  it("sorts by invoice date, newest first, by default", () => {
    expect(ids({})).toEqual([4, 3, 2, 1]);
    expect(ids({ direction: "asc" })).toEqual([1, 2, 3, 4]);
  });

  it("sorts by total and by supplier", () => {
    expect(ids({ sort: "total_amount" })).toEqual([4, 2, 1, 3]);
    expect(ids({ sort: "supplier_name", direction: "asc" })).toEqual([3, 1, 2, 4]);
  });

  it("puts blanks last both ways", () => {
    const invoices = [...INVOICES, makeInvoice({ id: 9 })];
    for (const direction of ["asc", "desc"] as const) {
      const sorted = filterInvoices(invoices, { ...NO_FILTERS, direction });
      expect(sorted.at(-1)?.id).toBe(9);
    }
  });

  it("searches supplier, tax ID, number, file and sender, ignoring case", () => {
    expect(ids({ search: "будмакс" })).toEqual([2, 1]);
    expect(ids({ search: "DE2987" })).toEqual([3]);
    expect(ids({ search: "inv-2026-0118" })).toEqual([1]);
    expect(ids({ search: "  kovalenko " })).toEqual([4]);
    expect(ids({ search: "nothing like this" })).toEqual([]);
  });

  it("filters by currency", () => {
    expect(ids({ currency: "EUR" })).toEqual([3]);
  });
});

describe("invoicesToCsv", () => {
  it("writes a header, quotes what needs it and starts with a BOM", () => {
    const csv = invoicesToCsv([
      makeInvoice({ id: 1, supplier_name: 'ТОВ "Кома, Лапки"', total_amount: 12.5 }),
    ]);
    const [header, row] = csv.replace("﻿", "").split("\r\n");

    expect(csv.startsWith("﻿")).toBe(true);
    expect(header?.split(",")).toContain("supplier_name");
    expect(row).toContain('"ТОВ ""Кома, Лапки"""');
    expect(row).toContain(",12.5,");
  });
});

import { describe, expect, it } from "vitest";

import { INVOICES, makeReviewItem, REVIEW_ITEMS } from "@/test/fixtures/invoices";

import {
  corrections,
  countByStatus,
  isIsoDate,
  itemTitle,
  parseAmount,
  readForm,
  reviewChecks,
  toForm,
  type ReviewForm,
} from "./review";

const MISMATCH = REVIEW_ITEMS[1]!;

function formFor(fields: Partial<ReviewForm>): ReviewForm {
  return { ...toForm(INVOICES[0]!), invoice_number: "NEW-1", ...fields };
}

const state = (form: ReviewForm, id: string, ledger = INVOICES) =>
  reviewChecks(form, ledger).find((check) => check.id === id);

describe("parseAmount", () => {
  it("reads dots, commas and spaces", () => {
    expect(parseAmount("10240.5")).toBe(10240.5);
    expect(parseAmount("10 240,50")).toBe(10240.5);
    expect(parseAmount(" ")).toBeNull();
    expect(parseAmount("ten")).toBeNaN();
  });
});

describe("isIsoDate", () => {
  it("accepts real dates only", () => {
    expect(isIsoDate("2026-11-03")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("03.11.2026")).toBe(false);
  });
});

describe("readForm", () => {
  it("normalizes the values like n8n stores them", () => {
    const values = readForm({
      ...toForm(MISMATCH),
      supplier_tax_id: " 38 765 412 ",
      currency: "uah",
      due_date: "",
      total_amount: "10 140,00",
    });

    expect(values).toMatchObject({
      supplier_tax_id: "38765412",
      currency: "UAH",
      due_date: null,
      total_amount: 10140,
    });
  });
});

describe("corrections", () => {
  it("is empty when nothing changed", () => {
    expect(corrections(MISMATCH, toForm(MISMATCH))).toEqual({});
  });

  it("holds only the changed fields, parsed", () => {
    const form = { ...toForm(MISMATCH), total_amount: "10140.00", supplier_tax_id: "38765412" };

    expect(corrections(MISMATCH, form)).toEqual({
      total_amount: 10140,
      supplier_tax_id: "38765412",
    });
  });

  it("sends a cleared field as null", () => {
    expect(corrections(MISMATCH, { ...toForm(MISMATCH), vat_rate: "" })).toEqual({
      vat_rate: null,
    });
  });
});

describe("reviewChecks", () => {
  it("passes a complete, consistent invoice", () => {
    const failed = reviewChecks(formFor({}), INVOICES).filter((check) => check.state !== "pass");

    expect(failed).toEqual([]);
  });

  it("lists the missing required fields", () => {
    expect(state(formFor({ supplier_name: "", invoice_date: "" }), "required")).toMatchObject({
      state: "fail",
      detail: "Missing: supplier, invoice date",
    });
  });

  it("offers the total that matches net + VAT", () => {
    const form = { ...toForm(MISMATCH), supplier_tax_id: "1", invoice_date: "2026-11-06" };

    expect(state(form, "total")).toMatchObject({
      state: "fail",
      detail: "Net + VAT is UAH 10,140.00, the total is UAH 10,240.00",
      fix: { field: "total_amount", value: "10140.00" },
    });
  });

  it("allows two cents of rounding", () => {
    expect(state(formFor({ total_amount: "23400.02" }), "total")?.state).toBe("pass");
    expect(state(formFor({ total_amount: "23400.03" }), "total")?.state).toBe("fail");
  });

  it("offers the VAT that matches the rate", () => {
    const form = formFor({
      net_amount: "1000",
      vat_rate: "20",
      vat_amount: "100",
      total_amount: "1100",
    });

    expect(state(form, "vat")).toMatchObject({
      state: "fail",
      detail: "20% of UAH 1,000.00 is UAH 200.00, not UAH 100.00",
      fix: { field: "vat_amount", value: "200.00" },
    });
  });

  it("skips the amount checks until the amounts are there", () => {
    expect(state(formFor({ vat_amount: "" }), "total")?.state).toBe("skip");
    expect(state(formFor({ vat_rate: "" }), "vat")?.state).toBe("skip");
  });

  it("flags text in an amount", () => {
    expect(state(formFor({ net_amount: "abc" }), "numbers")).toMatchObject({
      state: "fail",
      detail: "Not a number: net amount",
    });
  });

  it("checks dates and the currency code", () => {
    expect(state(formFor({ due_date: "15.11.2026" }), "dates")?.state).toBe("fail");
    expect(state(formFor({ currency: "hryvnia" }), "currency")?.state).toBe("fail");
    expect(state(formFor({ currency: "eur" }), "currency")?.state).toBe("pass");
  });

  it("finds the same invoice in the books by tax ID and number", () => {
    const form = formFor({ invoice_number: " 27 " });

    expect(state(form, "duplicate")).toMatchObject({ state: "fail" });
    expect(state(form, "duplicate", [])?.state).toBe("pass");
    expect(reviewChecks(form, undefined).find((c) => c.id === "duplicate")?.state).toBe("skip");
  });
});

describe("review items", () => {
  it("counts them by status", () => {
    const items = [...REVIEW_ITEMS, makeReviewItem({ id: 9, status: "rejected" })];

    expect(countByStatus(items)).toEqual({ open: 2, approved: 0, rejected: 1 });
  });

  it("names an item by its supplier, else its file", () => {
    expect(itemTitle(REVIEW_ITEMS[1]!)).toBe("ТОВ «Офіс Плюс»");
    expect(itemTitle(REVIEW_ITEMS[0]!)).toBe("05-tekhnoservis-scanned.pdf");
    expect(itemTitle(makeReviewItem({ id: 1 }))).toBe("Unknown supplier");
  });
});

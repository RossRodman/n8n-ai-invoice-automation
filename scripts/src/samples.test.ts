/**
 * The test invoices and samples/invoices/expected.json must agree.
 *
 * For every invoice: the PDF is there and has one page; it has a text layer
 * exactly when expected.json says so; the expected number, tax id and amounts
 * are really printed on it; and its route matches its numbers (an invoice bound
 * for the ledger must add up, one flagged for bad amounts must not).
 */
import { readdirSync, readFileSync } from "node:fs";

import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";

import { INVOICES } from "./data.ts";
import { type ExpectedFile, type ExpectedInvoice, toExpected } from "./expected.ts";
import { moneyDe, moneyUa } from "./format.ts";
import { EXPECTED_FILE, SAMPLES_DIR } from "./paths.ts";

const expected = JSON.parse(readFileSync(EXPECTED_FILE, "utf8")) as ExpectedFile;

/** Tolerance of the workflow's checks, in cents. */
const TOLERANCE = 2;
const cents = (value: number) => Math.round(value * 100);

function amountsAddUp({
  net_amount,
  vat_rate,
  vat_amount,
  total_amount,
}: ExpectedInvoice["fields"]) {
  return (
    Math.abs(cents(net_amount) + cents(vat_amount) - cents(total_amount)) <= TOLERANCE &&
    Math.abs(Math.round((cents(net_amount) * vat_rate) / 100) - cents(vat_amount)) <= TOLERANCE
  );
}

/** Text extraction splits lines and spaces in odd places, so compare without whitespace. */
const compact = (text: string) => text.replace(/\s+/g, "");

async function readPdf(file: string) {
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(`${SAMPLES_DIR}${file}`)));
  const { text } = await extractText(pdf, { mergePages: true });
  return { pages: pdf.numPages, text: compact(text) };
}

describe("expected.json", () => {
  it("is what make.ts generates from the invoice data", () => {
    expect(expected.invoices).toEqual(INVOICES.map(toExpected));
  });

  it("lists every PDF in samples/invoices", () => {
    const pdfs = readdirSync(SAMPLES_DIR).filter((name) => name.endsWith(".pdf"));
    expect(pdfs.sort()).toEqual(expected.invoices.map((entry) => entry.file).sort());
  });
});

describe.each(expected.invoices)("$file", (entry) => {
  const { fields } = entry;

  it("is a one-page PDF with a text layer only if expected", async () => {
    const { pages, text } = await readPdf(entry.file);
    expect(pages).toBe(1);
    expect(text.length > 0).toBe(entry.has_text_layer);
  });

  it.runIf(entry.has_text_layer)("has the expected values printed on it", async () => {
    const { text } = await readPdf(entry.file);
    const money = entry.fields.currency === "EUR" ? moneyDe : moneyUa;

    expect(text).toContain(compact(fields.invoice_number));
    expect(text).toContain(fields.supplier_tax_id);
    // A VAT-exempt invoice prints no VAT amount at all.
    const amounts = [fields.net_amount, fields.total_amount, fields.vat_amount].filter(
      (v) => v > 0,
    );
    for (const amount of amounts) expect(text).toContain(compact(money(amount)));
  });

  it("has valid dates", () => {
    expect(fields.invoice_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fields.due_date === null || fields.due_date >= fields.invoice_date).toBe(true);
  });

  it("is routed the way its content says", () => {
    const addsUp = amountsAddUp(fields);

    expect(entry.review_reasons.includes("amounts_mismatch")).toBe(!addsUp);
    expect(entry.review_reasons.includes("no_text_layer")).toBe(!entry.has_text_layer);
    expect(entry.route).toBe(entry.review_reasons.length > 0 ? "review" : "invoices");
  });
});

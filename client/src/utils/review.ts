import { EDITABLE_FIELDS } from "@/api";
import type { EditableField, Invoice, InvoiceCorrections, ReviewItem, ReviewStatus } from "@/types";
import { formatMoney } from "@/utils/format";

export function countReasons(items: ReviewItem[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const reason of items.flatMap((item) => item.review_reasons)) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }

  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function itemTitle(item: Invoice): string {
  return item.supplier_name ?? item.file_name ?? "Unknown supplier";
}

export function countByStatus(items: ReviewItem[]): Record<ReviewStatus, number> {
  const counts: Record<ReviewStatus, number> = { open: 0, approved: 0, rejected: 0 };
  for (const item of items) counts[item.status] += 1;

  return counts;
}

export type ReviewForm = Record<EditableField, string>;
type InvoiceValues = Pick<Invoice, EditableField>;

const NUMBER_FIELDS = new Set<EditableField>([
  "net_amount",
  "vat_rate",
  "vat_amount",
  "total_amount",
]);

export const FIELD_LABELS: Record<EditableField, string> = {
  supplier_name: "Supplier",
  supplier_tax_id: "Supplier tax ID",
  invoice_number: "Invoice number",
  invoice_date: "Invoice date",
  due_date: "Due date",
  currency: "Currency",
  net_amount: "Net amount",
  vat_rate: "VAT rate",
  vat_amount: "VAT amount",
  total_amount: "Total",
};

const REQUIRED: EditableField[] = [
  "supplier_name",
  "invoice_number",
  "invoice_date",
  "currency",
  "net_amount",
  "vat_amount",
  "total_amount",
];

export function isNumberField(field: EditableField): boolean {
  return NUMBER_FIELDS.has(field);
}

export function toForm(invoice: Invoice): ReviewForm {
  return Object.fromEntries(
    EDITABLE_FIELDS.map((field) => [field, invoice[field] === null ? "" : String(invoice[field])]),
  ) as ReviewForm;
}

export function parseAmount(text: string): number | null {
  const compact = text.replace(/[\s ]/g, "");
  if (compact === "") return null;
  const value = Number(compact.replace(",", "."));

  return Number.isFinite(value) ? value : Number.NaN;
}

export function readForm(form: ReviewForm): InvoiceValues {
  const text = (field: EditableField) => form[field].trim() || null;
  const amount = (field: EditableField) => parseAmount(form[field]);

  return {
    supplier_name: text("supplier_name"),
    supplier_tax_id: text("supplier_tax_id")?.replace(/\s+/g, "") ?? null,
    invoice_number: text("invoice_number"),
    invoice_date: text("invoice_date"),
    due_date: text("due_date"),
    currency: text("currency")?.toUpperCase() ?? null,
    net_amount: amount("net_amount"),
    vat_rate: amount("vat_rate"),
    vat_amount: amount("vat_amount"),
    total_amount: amount("total_amount"),
  };
}

export function corrections(original: Invoice, form: ReviewForm): InvoiceCorrections {
  const before = readForm(toForm(original));
  const after = readForm(form);

  return Object.fromEntries(
    EDITABLE_FIELDS.filter((field) => !Object.is(before[field], after[field])).map((field) => [
      field,
      after[field],
    ]),
  );
}

export type CheckState = "pass" | "fail" | "skip";

export interface ReviewCheck {
  id: "required" | "numbers" | "dates" | "currency" | "total" | "vat" | "duplicate";
  label: string;
  state: CheckState;
  detail?: string;
  fix?: { field: EditableField; value: string; label: string };
}

const TOLERANCE_CENTS = 2;
const cents = (value: number) => Math.round(value * 100);
const differs = (a: number, b: number) => Math.abs(cents(a) - cents(b)) > TOLERANCE_CENTS;
const asText = (value: number) => (cents(value) / 100).toFixed(2);

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function duplicateKey(
  invoice: Pick<Invoice, "supplier_tax_id" | "supplier_name" | "invoice_number">,
) {
  const supplier = String(invoice.supplier_tax_id || invoice.supplier_name || "")
    .replace(/\s+/g, "")
    .toLowerCase();
  const number = String(invoice.invoice_number ?? "")
    .replace(/\s+/g, "")
    .toLowerCase();

  return supplier && number ? `${supplier}|${number}` : null;
}

const list = (fields: EditableField[]) =>
  fields.map((field) => FIELD_LABELS[field].toLowerCase()).join(", ");

export function reviewChecks(form: ReviewForm, ledger: Invoice[] | undefined): ReviewCheck[] {
  const values = readForm(form);
  const notNumbers = [...NUMBER_FIELDS].filter((field) => Number.isNaN(values[field]));
  const amount = (field: EditableField): number | null => {
    const value = values[field];

    return typeof value === "number" && !Number.isNaN(value) ? value : null;
  };

  const missing = REQUIRED.filter((field) => values[field] === null);
  const badDates = (["invoice_date", "due_date"] as const).filter(
    (field) => values[field] !== null && !isIsoDate(values[field]),
  );

  const currency = values.currency;
  const validCurrency = currency !== null && /^[A-Z]{3}$/.test(currency);
  const money = (value: number) => formatMoney(value, validCurrency ? currency : null);

  const checks: ReviewCheck[] = [
    missing.length
      ? {
          id: "required",
          label: "Required fields",
          state: "fail",
          detail: `Missing: ${list(missing)}`,
        }
      : { id: "required", label: "Required fields", state: "pass" },
    notNumbers.length
      ? {
          id: "numbers",
          label: "Amounts are numbers",
          state: "fail",
          detail: `Not a number: ${list(notNumbers)}`,
        }
      : { id: "numbers", label: "Amounts are numbers", state: "pass" },
    badDates.length
      ? {
          id: "dates",
          label: "Dates",
          state: "fail",
          detail: `Not a date like 2026-11-03: ${list(badDates)}`,
        }
      : { id: "dates", label: "Dates", state: "pass" },
    currency === null
      ? { id: "currency", label: "Currency code", state: "skip" }
      : validCurrency
        ? { id: "currency", label: "Currency code", state: "pass" }
        : {
            id: "currency",
            label: "Currency code",
            state: "fail",
            detail: "Three letters, like UAH or EUR",
          },
  ];

  const net = amount("net_amount");
  const rate = amount("vat_rate");
  const vat = amount("vat_amount");
  const total = amount("total_amount");

  if (net !== null && vat !== null && total !== null) {
    const sum = net + vat;
    checks.push(
      differs(sum, total)
        ? {
            id: "total",
            label: "Net + VAT = total",
            state: "fail",
            detail: `Net + VAT is ${money(sum)}, the total is ${money(total)}`,
            fix: {
              field: "total_amount",
              value: asText(sum),
              label: `Set the total to ${money(sum)}`,
            },
          }
        : { id: "total", label: "Net + VAT = total", state: "pass" },
    );
  } else {
    checks.push({
      id: "total",
      label: "Net + VAT = total",
      state: "skip",
      detail: "Needs net, VAT and total",
    });
  }

  if (net !== null && rate !== null && vat !== null) {
    const expected = (net * rate) / 100;
    checks.push(
      differs(expected, vat)
        ? {
            id: "vat",
            label: "VAT matches the rate",
            state: "fail",
            detail: `${rate}% of ${money(net)} is ${money(expected)}, not ${money(vat)}`,
            fix: {
              field: "vat_amount",
              value: asText(expected),
              label: `Set VAT to ${money(expected)}`,
            },
          }
        : { id: "vat", label: "VAT matches the rate", state: "pass" },
    );
  } else {
    checks.push({
      id: "vat",
      label: "VAT matches the rate",
      state: "skip",
      detail: "Needs net, VAT rate and VAT",
    });
  }

  const key = duplicateKey(values);
  const twin = key && ledger ? ledger.find((invoice) => duplicateKey(invoice) === key) : undefined;
  checks.push(
    !key || !ledger
      ? { id: "duplicate", label: "Not in the books yet", state: "skip" }
      : twin
        ? {
            id: "duplicate",
            label: "Not in the books yet",
            state: "fail",
            detail: `Invoice ${values.invoice_number} from ${values.supplier_name ?? values.supplier_tax_id} is already booked`,
          }
        : { id: "duplicate", label: "Not in the books yet", state: "pass" },
  );

  return checks;
}
